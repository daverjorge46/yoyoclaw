import Foundation
import Testing
@testable import OpenClaw

@Suite(.serialized)
struct OpenClawConfigFileTests {
    @Test
    func configPathRespectsEnvOverride() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("openclaw-config-\(UUID().uuidString)")
            .appendingPathComponent("openclaw.json")
            .path

        await TestIsolation.withEnvValues(["OPENCLAW_CONFIG_PATH": override]) {
            #expect(OpenClawConfigFile.url().path == override)
        }
    }

    @MainActor
    @Test
    func remoteGatewayPortParsesAndMatchesHost() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("openclaw-config-\(UUID().uuidString)")
            .appendingPathComponent("openclaw.json")
            .path

        await TestIsolation.withEnvValues(["OPENCLAW_CONFIG_PATH": override]) {
            OpenClawConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "ws://gateway.ts.net:19999",
                    ],
                ],
            ])
            #expect(OpenClawConfigFile.remoteGatewayPort() == 19999)
            #expect(OpenClawConfigFile.remoteGatewayPort(matchingHost: "gateway.ts.net") == 19999)
            #expect(OpenClawConfigFile.remoteGatewayPort(matchingHost: "gateway") == 19999)
            #expect(OpenClawConfigFile.remoteGatewayPort(matchingHost: "other.ts.net") == nil)
        }
    }

    @MainActor
    @Test
    func setRemoteGatewayUrlPreservesScheme() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("openclaw-config-\(UUID().uuidString)")
            .appendingPathComponent("openclaw.json")
            .path

        await TestIsolation.withEnvValues(["OPENCLAW_CONFIG_PATH": override]) {
            OpenClawConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "wss://old-host:111",
                    ],
                ],
            ])
            OpenClawConfigFile.setRemoteGatewayUrl(host: "new-host", port: 2222)
            let root = OpenClawConfigFile.loadDict()
            let url = ((root["gateway"] as? [String: Any])?["remote"] as? [String: Any])?["url"] as? String
            #expect(url == "wss://new-host:2222")
        }
    }

    @Test
    func stateDirOverrideSetsConfigPath() async {
        let dir = FileManager().temporaryDirectory
            .appendingPathComponent("openclaw-state-\(UUID().uuidString)", isDirectory: true)
            .path

        await TestIsolation.withEnvValues([
            "OPENCLAW_CONFIG_PATH": nil,
            "OPENCLAW_STATE_DIR": dir,
        ]) {
            #expect(OpenClawConfigFile.stateDirURL().path == dir)
            #expect(OpenClawConfigFile.url().path == "\(dir)/openclaw.json")
        }
    }

    @MainActor
    @Test
    func persistLocalGatewayTokenAuthWritesNestedGatewayAuthShape() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("openclaw-config-\(UUID().uuidString)")
            .appendingPathComponent("openclaw.json")
            .path

        await TestIsolation.withEnvValues(["OPENCLAW_CONFIG_PATH": override]) {
            OpenClawConfigFile.saveDict([
                "gateway": [
                    "port": 18789,
                ],
            ])

            let persisted = OpenClawConfigFile.persistLocalGatewayTokenAuth("token-abc")
            #expect(persisted)

            let root = OpenClawConfigFile.loadDict()
            let gateway = root["gateway"] as? [String: Any]
            let auth = gateway?["auth"] as? [String: Any]
            #expect(auth?["mode"] as? String == "token")
            #expect(auth?["token"] as? String == "token-abc")
            #expect((gateway?["port"] as? Int) == 18789)
            #expect(root["gateway.auth.token"] == nil)
            #expect(root["gateway.auth.mode"] == nil)
        }
    }

    @MainActor
    @Test
    func persistLocalGatewayTokenAuthRemovesMalformedDottedAuthKeys() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("openclaw-config-\(UUID().uuidString)")
            .appendingPathComponent("openclaw.json")
            .path

        await TestIsolation.withEnvValues(["OPENCLAW_CONFIG_PATH": override]) {
            OpenClawConfigFile.saveDict([
                "gateway.auth.mode": "token",
                "gateway.auth.token": "bad-shape-token",
                "gateway.auth.password": "bad-shape-password",
                "gateway": [
                    "bind": "loopback",
                ],
            ])

            let persisted = OpenClawConfigFile.persistLocalGatewayTokenAuth("fixed-token")
            #expect(persisted)

            let root = OpenClawConfigFile.loadDict()
            let auth = ((root["gateway"] as? [String: Any])?["auth"] as? [String: Any])
            #expect(auth?["mode"] as? String == "token")
            #expect(auth?["token"] as? String == "fixed-token")
            #expect(root["gateway.auth.mode"] == nil)
            #expect(root["gateway.auth.token"] == nil)
            #expect(root["gateway.auth.password"] == nil)
        }
    }
}
