import SwiftUI

struct TalkOverlayCompactCardView: View {
    let snapshot: TalkOverlayWorkflowSnapshot
    let isExpanded: Bool
    let onToggleExpanded: () -> Void

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(self.snapshot.compactState.tint)
                        .frame(width: 7, height: 7)
                    Text(self.snapshot.compactState.label)
                        .font(.system(size: 12, weight: .semibold))
                        .lineLimit(1)
                        .foregroundStyle(Color.white)
                    Spacer(minLength: 4)
                    Text(Self.timeFormatter.string(from: self.snapshot.latestAt))
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.white.opacity(0.72))
                }

                Text(self.snapshot.latestSnippet)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Color.white.opacity(0.9))
                    .lineLimit(1)
            }

            Button(action: self.onToggleExpanded) {
                Image(systemName: self.isExpanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.9))
                    .frame(width: 24, height: 24)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(width: TalkOverlayController.compactCardWidth)
        .background {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.black.opacity(0.44))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.white.opacity(0.16), lineWidth: 1))
        }
        .shadow(color: Color.black.opacity(0.25), radius: 8, x: 0, y: 4)
    }

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter
    }()
}

struct TalkOverlayDrawerView: View {
    let snapshot: TalkOverlayWorkflowSnapshot

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                if self.snapshot.compactState == .fallback {
                    HStack(spacing: 6) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Color.orange)
                        Text("Demo fallback mode is active")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .padding(8)
                    .background(Color.orange.opacity(0.13))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }

                TalkOverlaySection(title: "Timeline") {
                    ForEach(self.snapshot.timeline.prefix(6)) { step in
                        TalkOverlayStepRow(step: step)
                    }
                }

                TalkOverlaySection(title: "Shubham Thread") {
                    if self.snapshot.transcripts.isEmpty {
                        Text("No transcript yet")
                            .font(.system(size: 11, weight: .regular))
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(self.snapshot.transcripts) { line in
                            TalkOverlayTranscriptRow(line: line)
                        }
                    }
                }

                TalkOverlaySection(title: "Tool Activity") {
                    if self.snapshot.tools.isEmpty {
                        Text("No tool activity yet")
                            .font(.system(size: 11, weight: .regular))
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(self.snapshot.tools) { line in
                            TalkOverlayToolRow(line: line)
                        }
                    }
                }

                TalkOverlaySection(title: "Internal State") {
                    if self.snapshot.internalState.isEmpty {
                        Text("No internal state yet")
                            .font(.system(size: 11, weight: .regular))
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(self.snapshot.internalState) { entry in
                            HStack(alignment: .firstTextBaseline, spacing: 8) {
                                Text(entry.key)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(Color.white.opacity(0.85))
                                    .frame(width: 140, alignment: .leading)
                                Text(entry.value)
                                    .font(.system(size: 11, weight: .regular))
                                    .foregroundStyle(Color.white.opacity(0.75))
                                    .lineLimit(2)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
        }
        .frame(width: TalkOverlayController.drawerWidth, height: TalkOverlayController.drawerHeight)
        .background {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.black.opacity(0.48))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.white.opacity(0.16), lineWidth: 1))
        }
        .shadow(color: Color.black.opacity(0.3), radius: 12, x: 0, y: 6)
    }
}

private struct TalkOverlaySection<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(self.title)
                .font(.system(size: 10, weight: .semibold))
                .textCase(.uppercase)
                .tracking(0.8)
                .foregroundStyle(Color.white.opacity(0.62))
            VStack(alignment: .leading, spacing: 6) {
                self.content
            }
            .padding(8)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
        }
    }
}

private struct TalkOverlayStepRow: View {
    let step: TalkOverlayTimelineStep

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Circle()
                .fill(self.step.status.tint)
                .frame(width: 8, height: 8)
                .padding(.top, 3)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(self.step.title)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.92))
                        .lineLimit(1)
                    TalkOverlayStatusChip(status: self.step.status)
                }
                if let detail = self.step.detail {
                    Text(detail)
                        .font(.system(size: 10, weight: .regular))
                        .foregroundStyle(Color.white.opacity(0.7))
                        .lineLimit(2)
                }
            }
        }
    }
}

private struct TalkOverlayTranscriptRow: View {
    let line: TalkOverlayTranscriptLine

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(line.speaker)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Color.white.opacity(0.78))
            Text(line.text)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(Color.white.opacity(0.9))
                .lineLimit(2)
        }
    }
}

private struct TalkOverlayToolRow: View {
    let line: TalkOverlayToolLine

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(line.label)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(Color.white.opacity(0.9))
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
            TalkOverlayStatusChip(status: line.status)
        }
    }
}

private struct TalkOverlayStatusChip: View {
    let status: TalkOverlayStepStatus

    var body: some View {
        Text(self.status.label)
            .font(.system(size: 9, weight: .semibold))
            .textCase(.uppercase)
            .tracking(0.5)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(self.status.tint.opacity(0.22))
            .foregroundStyle(self.status.tint)
            .clipShape(Capsule())
    }
}

private extension TalkOverlayCompactState {
    var tint: Color {
        switch self {
        case .listening: Color.blue.opacity(0.95)
        case .thinking: Color.indigo.opacity(0.92)
        case .coordinating: Color.cyan.opacity(0.92)
        case .awaitingConfirmation: Color.yellow.opacity(0.92)
        case .booking: Color.green.opacity(0.9)
        case .done: Color.green
        case .fallback: Color.orange
        }
    }
}

private extension TalkOverlayStepStatus {
    var label: String {
        switch self {
        case .pending: "Pending"
        case .running: "Running"
        case .completed: "Completed"
        case .blocked: "Blocked"
        case .fallback: "Fallback"
        }
    }

    var tint: Color {
        switch self {
        case .pending: Color.gray.opacity(0.9)
        case .running: Color.blue
        case .completed: Color.green
        case .blocked: Color.red
        case .fallback: Color.orange
        }
    }
}
