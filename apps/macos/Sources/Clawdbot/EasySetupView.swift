import AppKit
import ClawdbotIPC
import Combine
import Observation
import SwiftUI

/// A simplified onboarding flow for first-time users.
/// Four simple steps: Welcome → Sign In → Permissions → Done
/// All technical details (gateway, CLI, workspace) are handled automatically.

@MainActor
final class EasySetupController {
    static let shared = EasySetupController()
    private var window: NSWindow?

    func show() {
        if ProcessInfo.processInfo.isNixMode {
            UserDefaults.standard.set(true, forKey: "clawdbot.onboardingSeen")
            UserDefaults.standard.set(currentOnboardingVersion, forKey: onboardingVersionKey)
            AppStateStore.shared.onboardingSeen = true
            return
        }
        if let window {
            DockIconManager.shared.temporarilyShowDock()
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }
        let hosting = NSHostingController(rootView: EasySetupView())
        let window = NSWindow(contentViewController: hosting)
        window.title = "Welcome to Clawdbot"
        window.setContentSize(NSSize(width: EasySetupView.windowWidth, height: EasySetupView.windowHeight))
        window.styleMask = [.titled, .closable, .fullSizeContentView]
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.isMovableByWindowBackground = true
        window.center()
        DockIconManager.shared.temporarilyShowDock()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        self.window = window
    }

    func close() {
        self.window?.close()
        self.window = nil
    }

    func switchToAdvanced() {
        self.close()
        OnboardingController.shared.show()
    }
}

struct EasySetupView: View {
    @State private var currentPage = 0
    @State private var isSettingUp = false
    @State private var setupStatus: String = ""
    @State private var setupComplete = false
    @State private var setupError: String?

    // OAuth state
    @State private var oauthPKCE: AnthropicOAuth.PKCE?
    @State private var oauthCode: String = ""
    @State private var oauthBusy = false
    @State private var oauthConnected = false
    @State private var oauthVerified = false
    @State private var lastPasteboardCount = NSPasteboard.general.changeCount

    @Bindable var state: AppState
    var permissionMonitor: PermissionMonitor

    static let windowWidth: CGFloat = 540
    static let windowHeight: CGFloat = 620
    static let clipboardPoll: AnyPublisher<Date, Never> = {
        if ProcessInfo.processInfo.isRunningTests {
            return Empty(completeImmediately: false).eraseToAnyPublisher()
        }
        return Timer.publish(every: 0.5, on: .main, in: .common)
            .autoconnect()
            .eraseToAnyPublisher()
    }()

    // Core permissions to show (subset of all capabilities for simplified view)
    private static let corePermissions: [Capability] = [
        .accessibility,
        .screenRecording,
        .microphone,
        .notifications,
    ]

    init(
        state: AppState = AppStateStore.shared,
        permissionMonitor: PermissionMonitor = .shared
    ) {
        self.state = state
        self.permissionMonitor = permissionMonitor
    }

    private let pageCount = 4

    var body: some View {
        VStack(spacing: 0) {
            GlowingClawdbotIcon(size: 100, glowIntensity: 0.25)
                .frame(height: 130)

            GeometryReader { _ in
                HStack(spacing: 0) {
                    self.welcomePage.frame(width: Self.windowWidth)
                    self.signInPage.frame(width: Self.windowWidth)
                    self.permissionsPage.frame(width: Self.windowWidth)
                    self.donePage.frame(width: Self.windowWidth)
                }
                .offset(x: CGFloat(-self.currentPage) * Self.windowWidth)
                .animation(.spring(response: 0.45, dampingFraction: 0.85), value: self.currentPage)
            }

            Spacer(minLength: 0)
            self.navigationBar
        }
        .frame(width: Self.windowWidth, height: Self.windowHeight)
        .background(Color(NSColor.windowBackgroundColor))
        .task {
            await self.checkExistingAuth()
            await self.permissionMonitor.refreshNow()
        }
    }

    // MARK: - Pages

    private var welcomePage: some View {
        self.pageContainer {
            VStack(spacing: 20) {
                Text("Welcome to Clawdbot")
                    .font(.largeTitle.weight(.semibold))

                Text("Your personal AI assistant for Mac")
                    .font(.title3)
                    .foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: 16) {
                    self.featureItem(
                        icon: "message.fill",
                        title: "Chat anywhere",
                        description: "Message your AI via WhatsApp, Telegram, or right from the menu bar"
                    )
                    self.featureItem(
                        icon: "waveform",
                        title: "Voice commands",
                        description: "Talk to your AI hands-free with Voice Wake"
                    )
                    self.featureItem(
                        icon: "sparkles",
                        title: "Mac automation",
                        description: "Let AI help with tasks, files, and apps on your Mac"
                    )
                }
                .padding(.top, 8)

                Text("Setup takes about 2 minutes")
                    .font(.callout)
                    .foregroundStyle(.tertiary)
                    .padding(.top, 12)

                Button("Advanced Setup") {
                    EasySetupController.shared.switchToAdvanced()
                }
                .buttonStyle(.link)
                .font(.caption)
                .foregroundStyle(.tertiary)
            }
        }
    }

    private var signInPage: some View {
        self.pageContainer {
            VStack(spacing: 20) {
                Text("Sign in with Claude")
                    .font(.largeTitle.weight(.semibold))

                Text("Connect your Anthropic account to power your AI assistant")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 400)

                VStack(spacing: 16) {
                    // Status indicator
                    HStack(spacing: 10) {
                        Circle()
                            .fill(self.oauthVerified ? Color.green : (self.oauthConnected ? Color.orange : Color.gray))
                            .frame(width: 12, height: 12)
                        Text(self.oauthStatusText)
                            .font(.headline)
                        Spacer()
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color(NSColor.controlBackgroundColor))
                    )

                    if !self.oauthConnected {
                        Button {
                            self.startOAuth()
                        } label: {
                            HStack {
                                if self.oauthBusy {
                                    ProgressView()
                                        .controlSize(.small)
                                        .padding(.trailing, 4)
                                }
                                Text(self.oauthBusy ? "Opening browser..." : "Sign in with Anthropic")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 4)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(self.oauthBusy)

                        if self.oauthPKCE != nil {
                            VStack(spacing: 12) {
                                Text("Paste the code from your browser:")
                                    .font(.callout)
                                    .foregroundStyle(.secondary)

                                HStack {
                                    TextField("code#state", text: self.$oauthCode)
                                        .textFieldStyle(.roundedBorder)

                                    Button("Connect") {
                                        Task { await self.finishOAuth() }
                                    }
                                    .disabled(self.oauthCode.isEmpty || self.oauthBusy)
                                }
                            }
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(Color(NSColor.controlBackgroundColor).opacity(0.5))
                            )
                            .onReceive(Self.clipboardPoll) { _ in
                                self.checkClipboard()
                            }
                        }
                    } else if !self.oauthVerified {
                        Button("Verify Connection") {
                            Task { await self.verifyOAuth() }
                        }
                        .buttonStyle(.bordered)
                        .disabled(self.oauthBusy)
                    }
                }
                .padding(.top, 8)

                Spacer(minLength: 0)

                Text("Your credentials are stored securely on your Mac")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private var permissionsPage: some View {
        self.pageContainer {
            VStack(spacing: 20) {
                Text("Mac Permissions")
                    .font(.largeTitle.weight(.semibold))

                Text("Grant access so Clawdbot can help you with tasks on your Mac")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 400)

                VStack(spacing: 12) {
                    ForEach(Self.corePermissions, id: \.self) { cap in
                        self.permissionRow(cap)
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color(NSColor.controlBackgroundColor))
                )

                Button("Refresh Permissions") {
                    Task { await self.permissionMonitor.refreshNow() }
                }
                .buttonStyle(.link)

                Text("You can change these anytime in System Settings")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private var donePage: some View {
        self.pageContainer {
            VStack(spacing: 20) {
                if self.setupComplete {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.green)

                    Text("You're all set!")
                        .font(.largeTitle.weight(.semibold))

                    Text("Clawdbot is ready to help. Look for the icon in your menu bar.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 400)

                    VStack(alignment: .leading, spacing: 16) {
                        self.nextStepItem(
                            icon: "bubble.left.and.bubble.right",
                            title: "Open the menu bar",
                            description: "Click the Clawdbot icon to start chatting"
                        )
                        self.nextStepItem(
                            icon: "link",
                            title: "Connect messaging apps",
                            description: "Link WhatsApp or Telegram in Settings → Channels"
                        )
                        self.nextStepItem(
                            icon: "waveform.circle",
                            title: "Try Voice Wake",
                            description: "Enable hands-free commands in Settings"
                        )
                    }
                    .padding(.top, 8)

                    Toggle("Launch Clawdbot at login", isOn: self.$state.launchAtLogin)
                        .onChange(of: self.state.launchAtLogin) { _, newValue in
                            AppStateStore.updateLaunchAtLogin(enabled: newValue)
                        }
                        .padding(.top, 8)
                } else if self.isSettingUp {
                    ProgressView()
                        .controlSize(.large)
                        .padding(.bottom, 16)

                    Text("Setting up Clawdbot...")
                        .font(.title2.weight(.semibold))

                    Text(self.setupStatus)
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                } else if let error = self.setupError {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 50))
                        .foregroundStyle(.orange)

                    Text("Setup encountered an issue")
                        .font(.title2.weight(.semibold))

                    Text(error)
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 400)

                    Button("Try Again") {
                        Task { await self.performSetup() }
                    }
                    .buttonStyle(.borderedProminent)
                } else {
                    Text("Almost there!")
                        .font(.largeTitle.weight(.semibold))

                    Text("Click Finish to complete the setup")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Navigation

    private var navigationBar: some View {
        HStack(spacing: 20) {
            // Back button
            if self.currentPage > 0 && !self.isSettingUp {
                Button {
                    withAnimation { self.currentPage -= 1 }
                } label: {
                    Label("Back", systemImage: "chevron.left")
                        .labelStyle(.iconOnly)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
            } else {
                Spacer().frame(width: 40)
            }

            Spacer()

            // Page dots
            HStack(spacing: 8) {
                ForEach(0..<self.pageCount, id: \.self) { index in
                    Circle()
                        .fill(index == self.currentPage ? Color.accentColor : Color.gray.opacity(0.3))
                        .frame(width: 8, height: 8)
                }
            }

            Spacer()

            // Next/Finish button
            if self.currentPage < self.pageCount - 1 {
                Button(self.currentPage == 0 ? "Get Started" : "Next") {
                    withAnimation { self.currentPage += 1 }
                }
                .buttonStyle(.borderedProminent)
                .disabled(!self.canAdvance)
            } else if !self.setupComplete {
                Button("Finish") {
                    Task { await self.performSetup() }
                }
                .buttonStyle(.borderedProminent)
                .disabled(self.isSettingUp)
            } else {
                Button("Done") {
                    self.finishSetup()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 16)
        .frame(minHeight: 50)
    }

    private var canAdvance: Bool {
        switch self.currentPage {
        case 0: return true
        case 1: return self.oauthVerified
        case 2: return true
        default: return true
        }
    }

    // MARK: - Helper Views

    private func pageContainer(@ViewBuilder _ content: () -> some View) -> some View {
        ScrollView {
            VStack(spacing: 16) {
                content()
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 32)
            .padding(.top, 8)
        }
    }

    private func featureItem(icon: String, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(Color.accentColor)
                .frame(width: 32)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
    }

    private func nextStepItem(icon: String, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Color.accentColor)
                .frame(width: 26)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.callout.weight(.semibold))
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
    }

    private func permissionRow(_ cap: Capability) -> some View {
        let granted = self.permissionMonitor.status[cap] ?? false
        return HStack(spacing: 12) {
            Image(systemName: granted ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundStyle(granted ? .green : .secondary)

            VStack(alignment: .leading, spacing: 2) {
                Text(self.permissionTitle(for: cap))
                    .font(.callout.weight(.medium))
                Text(self.permissionDescription(for: cap))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if !granted {
                Button("Enable") {
                    Task { await self.requestPermission(cap) }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .padding(.vertical, 4)
    }

    private func permissionTitle(for cap: Capability) -> String {
        switch cap {
        case .appleScript: "Automation"
        case .notifications: "Notifications"
        case .accessibility: "Accessibility"
        case .screenRecording: "Screen Recording"
        case .microphone: "Microphone"
        case .speechRecognition: "Speech Recognition"
        case .camera: "Camera"
        case .location: "Location"
        }
    }

    private func permissionDescription(for cap: Capability) -> String {
        switch cap {
        case .appleScript: "Control other apps for automation"
        case .notifications: "Show alerts for AI activity"
        case .accessibility: "Control apps and type text"
        case .screenRecording: "See what's on your screen"
        case .microphone: "Listen for voice commands"
        case .speechRecognition: "Transcribe voice on-device"
        case .camera: "Take photos and video"
        case .location: "Know your location"
        }
    }

    private var oauthStatusText: String {
        if self.oauthVerified { return "Connected to Claude" }
        if self.oauthConnected { return "Verifying connection..." }
        return "Not connected"
    }

    // MARK: - OAuth

    private func checkExistingAuth() async {
        let status = ClawdbotOAuthStore.anthropicOAuthStatus()
        if status == .valid {
            self.oauthConnected = true
            self.oauthVerified = true
        }
    }

    private func startOAuth() {
        self.oauthBusy = true
        Task {
            defer { self.oauthBusy = false }
            do {
                let pkce = try await AnthropicOAuth.startOAuth()
                self.oauthPKCE = pkce
            } catch {
                self.oauthPKCE = nil
            }
        }
    }

    private func finishOAuth() async {
        guard let pkce = self.oauthPKCE else { return }
        self.oauthBusy = true
        defer { self.oauthBusy = false }

        do {
            try await AnthropicOAuth.finishOAuth(code: self.oauthCode, pkce: pkce)
            self.oauthConnected = true
            self.oauthPKCE = nil
            self.oauthCode = ""
            await self.verifyOAuth()
        } catch {
            // Keep PKCE for retry
        }
    }

    private func verifyOAuth() async {
        self.oauthBusy = true
        defer { self.oauthBusy = false }

        let status = ClawdbotOAuthStore.anthropicOAuthStatus()
        self.oauthVerified = status == .valid
    }

    private func checkClipboard() {
        let count = NSPasteboard.general.changeCount
        guard count != self.lastPasteboardCount else { return }
        self.lastPasteboardCount = count

        guard let content = NSPasteboard.general.string(forType: .string) else { return }
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)

        // Check if it looks like an OAuth code#state
        if trimmed.contains("#"), trimmed.count > 20, trimmed.count < 500 {
            self.oauthCode = trimmed
            // Auto-connect if code detected
            Task { await self.finishOAuth() }
        }
    }

    // MARK: - Permissions

    private func requestPermission(_ cap: Capability) async {
        _ = await PermissionManager.ensure([cap], interactive: true)
        try? await Task.sleep(for: .milliseconds(500))
        await self.permissionMonitor.refreshNow()
    }

    // MARK: - Setup

    private func performSetup() async {
        self.isSettingUp = true
        self.setupError = nil

        // Step 1: Configure local mode
        self.setupStatus = "Configuring local gateway..."
        self.state.connectionMode = .local
        GatewayProcessManager.shared.setActive(true)

        // Step 2: Install CLI (in background, non-blocking)
        self.setupStatus = "Installing command-line tools..."
        await self.installCLIQuietly()

        // Step 3: Wait for gateway
        self.setupStatus = "Starting AI gateway..."
        let gatewayReady = await GatewayProcessManager.shared.waitForGatewayReady(timeout: 30)
        if !gatewayReady {
            self.setupError = "Could not start the AI gateway. Try restarting the app."
            self.isSettingUp = false
            return
        }

        // Step 4: Create workspace
        self.setupStatus = "Creating workspace..."
        await self.createDefaultWorkspace()

        // Step 5: Mark onboarding complete
        self.setupStatus = "Finishing up..."
        UserDefaults.standard.set(true, forKey: "clawdbot.onboardingSeen")
        UserDefaults.standard.set(currentOnboardingVersion, forKey: onboardingVersionKey)
        AppStateStore.shared.onboardingSeen = true

        self.isSettingUp = false
        self.setupComplete = true
    }

    private func installCLIQuietly() async {
        // Run CLI install silently - don't block setup on it
        await CLIInstaller.install { _ in }
    }

    private func createDefaultWorkspace() async {
        let workspaceURL = ClawdbotConfigFile.defaultWorkspaceURL()
        _ = AgentWorkspace.bootstrapWorkspace(at: workspaceURL, options: .createIfMissing)
    }

    private func finishSetup() {
        EasySetupController.shared.close()
    }
}
