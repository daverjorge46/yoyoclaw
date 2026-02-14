import OpenClawProtocol
import Testing
@testable import OpenClaw

@Suite
@MainActor
struct TalkOverlayWorkflowStateTests {
    @Test
    func mapsWorkflowEventsIntoOverlaySnapshot() {
        let events: [ControlAgentEvent] = [
            self.makeEvent(
                seq: 1,
                stream: "demo.workflow.step",
                data: [
                    "stepId": OpenClawProtocol.AnyCodable("coordinate-shubham"),
                    "title": OpenClawProtocol.AnyCodable("Coordinate with Shubham"),
                    "status": OpenClawProtocol.AnyCodable("running"),
                    "detail": OpenClawProtocol.AnyCodable("Waiting for ETA"),
                ]),
            self.makeEvent(
                seq: 2,
                stream: "demo.workflow.transcript",
                data: [
                    "speaker": OpenClawProtocol.AnyCodable("Shubham"),
                    "text": OpenClawProtocol.AnyCodable("Haan bhai, 20 min mein aata hoon"),
                ]),
            self.makeEvent(
                seq: 3,
                stream: "demo.workflow.summary",
                data: [
                    "status": OpenClawProtocol.AnyCodable("awaiting_confirmation"),
                    "internalState": OpenClawProtocol.AnyCodable([
                        "FoodPreference": OpenClawProtocol.AnyCodable("North Indian"),
                        "ETA": OpenClawProtocol.AnyCodable("20 min"),
                    ]),
                ]),
        ]

        let snapshot = TalkOverlayWorkflowSnapshotBuilder.build(phase: .thinking, events: events)

        #expect(snapshot.compactState == .awaitingConfirmation)
        #expect(snapshot.timeline.contains(where: { $0.id == "coordinate-shubham" && $0.status == .running }))
        #expect(snapshot.transcripts.contains(where: { $0.speaker == "Shubham" }))
        #expect(snapshot.internalState.contains(where: { $0.key == "Food Preference" && $0.value == "North Indian" }))
    }

    @Test
    func marksFallbackWhenSummaryFlagSet() {
        let events: [ControlAgentEvent] = [
            self.makeEvent(
                seq: 1,
                stream: "demo.workflow.summary",
                data: [
                    "fallbackUsed": OpenClawProtocol.AnyCodable(true),
                    "message": OpenClawProtocol.AnyCodable("Swiggy unavailable, fixture mode active"),
                ]),
        ]

        let snapshot = TalkOverlayWorkflowSnapshotBuilder.build(phase: .thinking, events: events)

        #expect(snapshot.compactState == .fallback)
        #expect(snapshot.latestSnippet.contains("fixture mode"))
    }

    @Test
    func marksDoneAfterSuccessfulSwiggyToolCompletion() {
        let events: [ControlAgentEvent] = [
            self.makeEvent(
                seq: 1,
                stream: "tool",
                data: [
                    "phase": OpenClawProtocol.AnyCodable("start"),
                    "name": OpenClawProtocol.AnyCodable("swiggy"),
                    "meta": OpenClawProtocol.AnyCodable("dineout search"),
                ]),
            self.makeEvent(
                seq: 2,
                stream: "tool",
                data: [
                    "phase": OpenClawProtocol.AnyCodable("result"),
                    "name": OpenClawProtocol.AnyCodable("swiggy"),
                    "meta": OpenClawProtocol.AnyCodable("booking complete"),
                ]),
        ]

        let snapshot = TalkOverlayWorkflowSnapshotBuilder.build(phase: .thinking, events: events)

        #expect(snapshot.compactState == .done)
        #expect(snapshot.tools.count == 2)
        #expect(snapshot.tools.contains(where: { $0.label.contains("swiggy") }))
    }

    private func makeEvent(
        seq: Int,
        stream: String,
        data: [String: OpenClawProtocol.AnyCodable],
        summary: String? = nil) -> ControlAgentEvent
    {
        ControlAgentEvent(
            runId: "demo",
            seq: seq,
            stream: stream,
            ts: Double(1_000 + (seq * 100)),
            data: data,
            summary: summary)
    }
}
