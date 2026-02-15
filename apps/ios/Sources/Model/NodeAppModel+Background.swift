import Foundation
import OpenClawKit
import UIKit
import UserNotifications

extension NodeAppModel {
    // MARK: Push

    func setPushEnabled(_ enabled: Bool) async {
        UserDefaults.standard.set(enabled, forKey: "push.enabled")
        guard enabled else { return }

        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [
                .alert,
                .badge,
                .sound,
            ])
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        } catch {
            // Best-effort only.
        }
    }

    func onAPNSTokenUpdated() async {
        await self.syncAPNSTokenToGatewayIfNeeded()
    }

    func handleRemoteNotificationUserInfo(_ userInfo: [AnyHashable: Any]) async {
        if let v = userInfo["openclaw_startTalk"] as? Bool, v {
            UserDefaults.standard.set(true, forKey: "external.pending.startTalk")
        }
        if let agentId = userInfo["openclaw_agentId"] as? String {
            let trimmed = agentId.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                UserDefaults.standard.set(trimmed, forKey: "external.pending.agentId")
            }
        }
        if let message = userInfo["openclaw_message"] as? String {
            let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                UserDefaults.standard.set(trimmed, forKey: "external.pending.agentMessage")
            }
        }

        await self.consumePendingExternalActions()
    }

    // Called from the node websocket connect path.
    func onNodeGatewayConnected() async {
        await self.syncAPNSTokenToGatewayIfNeeded()
        await self.consumePendingExternalActions()
    }

    private func syncAPNSTokenToGatewayIfNeeded() async {
        guard UserDefaults.standard.bool(forKey: "push.enabled") else { return }
        let token = (UserDefaults.standard.string(forKey: "push.apnsTokenHex") ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !token.isEmpty else { return }
        let updatedAtMs = UserDefaults.standard.integer(forKey: "push.apnsTokenUpdatedAtMs")

        struct Payload: Codable {
            var token: String
            var updatedAtMs: Int?
        }
        let payload = Payload(token: token, updatedAtMs: updatedAtMs > 0 ? updatedAtMs : nil)
        guard let data = try? JSONEncoder().encode(payload),
              let json = String(data: data, encoding: .utf8)
        else { return }
        await self.gatewaySession.sendEvent(event: "push.apnsToken", payloadJSON: json)
    }

    func shouldDisconnectOnBackground() -> Bool {
        if UserDefaults.standard.object(forKey: "gateway.disconnectOnBackground") == nil {
            return true
        }
        return UserDefaults.standard.bool(forKey: "gateway.disconnectOnBackground")
    }

    func consumePendingExternalActions() async {
        if UserDefaults.standard.bool(forKey: "external.pending.startTalk") {
            UserDefaults.standard.set(false, forKey: "external.pending.startTalk")
            await MainActor.run { self.setTalkEnabled(true) }
        }

        let agentId = (UserDefaults.standard.string(forKey: "external.pending.agentId") ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !agentId.isEmpty {
            UserDefaults.standard.removeObject(forKey: "external.pending.agentId")
            await MainActor.run { self.setSelectedAgentId(agentId) }
        }

        let message = (UserDefaults.standard.string(forKey: "external.pending.agentMessage") ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !message.isEmpty {
            UserDefaults.standard.removeObject(forKey: "external.pending.agentMessage")
            let link = AgentDeepLink(
                message: message,
                sessionKey: self.mainSessionKey,
                thinking: "low",
                deliver: false,
                to: nil,
                channel: nil,
                timeoutSeconds: nil,
                key: nil)
            if let data = try? JSONEncoder().encode(link),
               let json = String(data: data, encoding: .utf8)
            {
                await self.gatewaySession.sendEvent(event: "agent.request", payloadJSON: json)
            }
        }
    }
}
