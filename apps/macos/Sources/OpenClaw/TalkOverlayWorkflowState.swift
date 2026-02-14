import OpenClawProtocol
import Foundation

enum TalkOverlayCompactState: Equatable {
    case listening
    case thinking
    case coordinating
    case awaitingConfirmation
    case booking
    case done
    case fallback

    var label: String {
        switch self {
        case .listening: "Listening"
        case .thinking: "Thinking"
        case .coordinating: "Coordinating with Shubham"
        case .awaitingConfirmation: "Awaiting your confirmation"
        case .booking: "Booking"
        case .done: "Done"
        case .fallback: "Fallback used"
        }
    }
}

enum TalkOverlayStepStatus: String, Equatable {
    case pending
    case running
    case completed
    case blocked
    case fallback
}

struct TalkOverlayTimelineStep: Identifiable, Equatable {
    let id: String
    let title: String
    let status: TalkOverlayStepStatus
    let detail: String?
    let updatedAt: Date
}

struct TalkOverlayTranscriptLine: Identifiable, Equatable {
    let id: String
    let speaker: String
    let text: String
    let at: Date
}

struct TalkOverlayToolLine: Identifiable, Equatable {
    let id: String
    let label: String
    let status: TalkOverlayStepStatus
    let at: Date
}

struct TalkOverlayInternalStateEntry: Identifiable, Equatable {
    var id: String { self.key }
    let key: String
    let value: String
}

struct TalkOverlayWorkflowSnapshot: Equatable {
    let compactState: TalkOverlayCompactState
    let latestSnippet: String
    let latestAt: Date
    let timeline: [TalkOverlayTimelineStep]
    let transcripts: [TalkOverlayTranscriptLine]
    let tools: [TalkOverlayToolLine]
    let internalState: [TalkOverlayInternalStateEntry]
}

enum TalkOverlayWorkflowSnapshotBuilder {
    private static let fallbackSnippet = "Waiting for demo workflow events"

    static func build(phase: TalkModePhase, events: [ControlAgentEvent]) -> TalkOverlayWorkflowSnapshot {
        var compact = Self.stateFromPhase(phase)
        var latestSnippet: String?
        var latestAt = Date()
        var sawFallback = false

        var timelineByID: [String: TalkOverlayTimelineStep] = [:]
        var timelineOrder: [String] = []
        var transcripts: [TalkOverlayTranscriptLine] = []
        var tools: [TalkOverlayToolLine] = []
        var internalState: [String: String] = [:]

        for event in events {
            let at = Date(timeIntervalSince1970: event.ts / 1000)
            let stream = Self.normalizedStream(for: event)
            switch stream {
            case "demo.workflow.step":
                if let step = Self.parseStep(data: event.data, fallbackID: event.id, at: at) {
                    Self.upsert(step: step, timelineByID: &timelineByID, timelineOrder: &timelineOrder)
                    if let state = Self.stateFrom(step: step) {
                        compact = state
                    }
                    if step.status == .fallback {
                        sawFallback = true
                    }
                    if let detail = step.detail, !detail.isEmpty {
                        latestSnippet = detail
                        latestAt = at
                    }
                }
            case "demo.workflow.transcript":
                if let transcript = Self.parseTranscript(data: event.data, fallbackID: event.id, at: at) {
                    transcripts.append(transcript)
                    latestSnippet = transcript.text
                    latestAt = at
                    if transcript.speaker.lowercased().contains("shubham") {
                        compact = .coordinating
                    }
                }
            case "demo.workflow.summary":
                if let state = Self.parseState(data: event.data) {
                    compact = state
                }
                if event.data.firstBool(keys: ["fallbackUsed", "usedFallback", "fallback"]) == true {
                    sawFallback = true
                }
                if let message = event.data.firstString(keys: ["message", "summary", "snippet", "text"])?
                    .trimmedNonEmpty
                {
                    latestSnippet = message
                    latestAt = at
                }
                Self.parseInternalState(data: event.data, into: &internalState)
                let steps = Self.parseSummarySteps(data: event.data, at: at)
                for step in steps {
                    Self.upsert(step: step, timelineByID: &timelineByID, timelineOrder: &timelineOrder)
                }
            case "tool":
                if let tool = Self.parseTool(event: event, at: at) {
                    tools.append(tool)
                    latestSnippet = tool.label
                    latestAt = at
                    let lowered = tool.label.lowercased()
                    if lowered.contains("swiggy"), tool.status == .running {
                        compact = .booking
                    } else if lowered.contains("telegram"), tool.status == .running {
                        compact = .coordinating
                    }
                    if lowered.contains("swiggy"), tool.status == .fallback {
                        sawFallback = true
                    }
                }
            case "assistant":
                if let text = (event.summary ?? event.data.firstString(keys: ["summary", "text", "message"]))?
                    .trimmedNonEmpty
                {
                    latestSnippet = text
                    latestAt = at
                    if compact == .thinking, text.lowercased().contains("confirm") {
                        compact = .awaitingConfirmation
                    }
                }
            default:
                break
            }
        }

        if sawFallback {
            compact = .fallback
        } else if Self.canMarkDone(current: compact, timelineByID: timelineByID, tools: tools) {
            compact = .done
        }

        let timeline: [TalkOverlayTimelineStep]
        if timelineOrder.isEmpty {
            timeline = Self.defaultTimeline(for: compact)
        } else {
            timeline = timelineOrder.compactMap { timelineByID[$0] }
        }

        let transcriptRows = Array(transcripts.suffix(8))
        let toolRows = Array(tools.suffix(8))
        let stateRows = internalState
            .map { TalkOverlayInternalStateEntry(key: Self.prettyKey($0.key), value: $0.value) }
            .sorted { $0.key < $1.key }

        let snippet = latestSnippet?.trimmedNonEmpty ?? Self.fallbackSnippet
        return TalkOverlayWorkflowSnapshot(
            compactState: compact,
            latestSnippet: Self.clamp(snippet, limit: 120),
            latestAt: latestAt,
            timeline: timeline,
            transcripts: transcriptRows,
            tools: toolRows,
            internalState: stateRows)
    }

    private static func upsert(
        step: TalkOverlayTimelineStep,
        timelineByID: inout [String: TalkOverlayTimelineStep],
        timelineOrder: inout [String])
    {
        if timelineByID[step.id] == nil {
            timelineOrder.append(step.id)
        }
        timelineByID[step.id] = step
    }

    private static func parseStep(
        data: [String: OpenClawProtocol.AnyCodable],
        fallbackID: String,
        at: Date) -> TalkOverlayTimelineStep?
    {
        let id = data.firstString(keys: ["stepId", "id", "step", "key"])?.trimmedNonEmpty
            ?? fallbackID
        let title = data.firstString(keys: ["title", "label", "name", "step"])?.trimmedNonEmpty
            ?? prettyKey(id)
        let status = parseStepStatus(data.firstString(keys: ["status", "state", "phase"]) ?? "running")
        let detail = data.firstString(keys: ["detail", "message", "summary"])?.trimmedNonEmpty
        return TalkOverlayTimelineStep(id: id, title: title, status: status, detail: detail, updatedAt: at)
    }

    private static func parseSummarySteps(
        data: [String: OpenClawProtocol.AnyCodable],
        at: Date) -> [TalkOverlayTimelineStep]
    {
        guard let stepsRaw = data.firstArray(keys: ["steps", "timeline"]) else { return [] }
        var steps: [TalkOverlayTimelineStep] = []
        for (index, raw) in stepsRaw.enumerated() {
            guard let dict = raw.dictionaryValue else { continue }
            let fallbackID = "summary-step-\(index)"
            if let step = parseStep(data: dict, fallbackID: fallbackID, at: at) {
                steps.append(step)
            }
        }
        return steps
    }

    private static func parseTranscript(
        data: [String: OpenClawProtocol.AnyCodable],
        fallbackID: String,
        at: Date) -> TalkOverlayTranscriptLine?
    {
        guard let text = data.firstString(keys: ["text", "message", "snippet", "summary"])?.trimmedNonEmpty else {
            return nil
        }
        let speaker = data.firstString(keys: ["speaker", "role", "from", "name"])?.trimmedNonEmpty ?? "Agent"
        return TalkOverlayTranscriptLine(id: fallbackID, speaker: speaker, text: Self.clamp(text, limit: 180), at: at)
    }

    private static func parseTool(event: ControlAgentEvent, at: Date) -> TalkOverlayToolLine? {
        let phase = event.data.firstString(keys: ["phase", "state", "status"])?.lowercased() ?? ""
        let status = parseStepStatus(phase)
        guard status != .pending else { return nil }

        let name = event.data.firstString(keys: ["name", "tool", "toolName"])?.trimmedNonEmpty ?? "tool"
        let meta = event.data.firstString(keys: ["meta", "detail", "summary"])?.trimmedNonEmpty
        let label = meta.map { "\(name): \($0)" } ?? name
        return TalkOverlayToolLine(id: event.id, label: Self.clamp(label, limit: 120), status: status, at: at)
    }

    private static func parseInternalState(
        data: [String: OpenClawProtocol.AnyCodable],
        into state: inout [String: String])
    {
        if let dict = data.firstDictionary(keys: ["internalState", "state", "values"]) {
            for (key, value) in dict {
                if let rendered = renderedValue(value), !rendered.isEmpty {
                    state[key] = rendered
                }
            }
        }

        for key in [
            "foodPreference",
            "FoodPreference",
            "shubhamAvailability",
            "ShubhamAvailability",
            "eta",
            "ETA",
            "venue",
            "Venue",
        ] {
            if let value = data[key], let rendered = renderedValue(value), !rendered.isEmpty {
                state[key] = rendered
            }
        }
    }

    private static func renderedValue(_ value: OpenClawProtocol.AnyCodable) -> String? {
        if let string = value.stringValue?.trimmedNonEmpty {
            return string
        }
        if let bool = value.boolValue {
            return bool ? "yes" : "no"
        }
        if let int = value.intValue {
            return "\(int)"
        }
        if let double = value.doubleValue {
            return String(format: "%.2f", double)
        }
        if let array = value.arrayValue {
            let rendered = array.compactMap { renderedValue($0) }.filter { !$0.isEmpty }
            guard !rendered.isEmpty else { return nil }
            return clamp(rendered.joined(separator: ", "), limit: 140)
        }
        if let dict = value.dictionaryValue {
            let pairs = dict.compactMap { (key, raw) -> String? in
                guard let rendered = renderedValue(raw)?.trimmedNonEmpty else { return nil }
                return "\(prettyKey(key)): \(rendered)"
            }
            guard !pairs.isEmpty else { return nil }
            return clamp(pairs.joined(separator: " · "), limit: 180)
        }
        let raw = String(describing: value.foundationValue).trimmedNonEmpty
        return raw.map { clamp($0, limit: 120) }
    }

    private static func parseState(data: [String: OpenClawProtocol.AnyCodable]) -> TalkOverlayCompactState? {
        guard let raw = data.firstString(keys: ["compactState", "status", "state", "phase"])?.trimmedNonEmpty else {
            return nil
        }
        return mapState(raw)
    }

    private static func stateFrom(step: TalkOverlayTimelineStep) -> TalkOverlayCompactState? {
        if step.status == .fallback {
            return .fallback
        }
        let lowered = "\(step.id) \(step.title)".lowercased()
        if lowered.contains("shubham") || lowered.contains("telegram") {
            return step.status == .completed ? nil : .coordinating
        }
        if lowered.contains("confirm") {
            return step.status == .completed ? nil : .awaitingConfirmation
        }
        if lowered.contains("book") || lowered.contains("swiggy") {
            if step.status == .completed {
                return .done
            }
            return .booking
        }
        return nil
    }

    private static func mapState(_ raw: String) -> TalkOverlayCompactState? {
        let normalized = raw.lowercased()
        if normalized.contains("fallback") { return .fallback }
        if normalized.contains("coord") || normalized.contains("shubham") { return .coordinating }
        if normalized.contains("confirm") { return .awaitingConfirmation }
        if normalized.contains("book") || normalized.contains("swiggy") { return .booking }
        if normalized.contains("done") || normalized.contains("complete") { return .done }
        if normalized.contains("listen") { return .listening }
        if normalized.contains("think") { return .thinking }
        return nil
    }

    private static func parseStepStatus(_ raw: String) -> TalkOverlayStepStatus {
        let normalized = raw.lowercased()
        if normalized.contains("fallback") {
            return .fallback
        }
        if normalized.contains("run") || normalized == "start" || normalized == "streaming" {
            return .running
        }
        if normalized.contains("done")
            || normalized.contains("complete")
            || normalized.contains("success")
            || normalized == "result"
        {
            return .completed
        }
        if normalized.contains("block")
            || normalized.contains("error")
            || normalized.contains("fail")
            || normalized.contains("abort")
        {
            return .blocked
        }
        return .pending
    }

    private static func canMarkDone(
        current: TalkOverlayCompactState,
        timelineByID: [String: TalkOverlayTimelineStep],
        tools: [TalkOverlayToolLine]) -> Bool
    {
        if current == .done || current == .fallback {
            return false
        }
        if timelineByID.values.contains(where: {
            $0.status == .completed
                && ($0.id.lowercased().contains("done") || $0.title.lowercased().contains("done"))
        }) {
            return true
        }
        if timelineByID.values.contains(where: {
            $0.status == .completed
                && ($0.id.lowercased().contains("book") || $0.title.lowercased().contains("book"))
        }) {
            return true
        }
        return tools.contains(where: {
            $0.status == .completed && $0.label.lowercased().contains("swiggy")
        })
    }

    private static func defaultTimeline(for state: TalkOverlayCompactState) -> [TalkOverlayTimelineStep] {
        let now = Date()
        let base: [(String, String)] = [
            ("collect-preferences", "Collect preferences"),
            ("suggest-options", "Suggest venue options"),
            ("coordinate-shubham", "Coordinate with Shubham"),
            ("await-confirmation", "Await final confirmation"),
            ("book-table", "Book table"),
            ("finalize", "Finalize response"),
        ]
        return base.enumerated().map { index, entry in
            TalkOverlayTimelineStep(
                id: entry.0,
                title: entry.1,
                status: defaultStatus(forStep: index, state: state),
                detail: nil,
                updatedAt: now)
        }
    }

    private static func defaultStatus(forStep index: Int, state: TalkOverlayCompactState) -> TalkOverlayStepStatus {
        switch state {
        case .listening, .thinking:
            return index == 0 ? .running : .pending
        case .coordinating:
            if index < 2 { return .completed }
            return index == 2 ? .running : .pending
        case .awaitingConfirmation:
            if index < 3 { return .completed }
            return index == 3 ? .running : .pending
        case .booking:
            if index < 4 { return .completed }
            return index == 4 ? .running : .pending
        case .done:
            return .completed
        case .fallback:
            if index == 2 || index == 4 || index == 5 { return .fallback }
            return index < 2 ? .completed : .pending
        }
    }

    private static func normalizedStream(for event: ControlAgentEvent) -> String {
        let stream = event.stream.lowercased()
        if stream.hasPrefix("demo.workflow.") {
            return stream
        }
        if let eventName = event.data.firstString(keys: ["event", "type", "eventType"])?.lowercased(),
           eventName.hasPrefix("demo.workflow.")
        {
            return eventName
        }
        return stream
    }

    private static func stateFromPhase(_ phase: TalkModePhase) -> TalkOverlayCompactState {
        switch phase {
        case .listening: .listening
        case .thinking, .speaking: .thinking
        case .idle: .thinking
        }
    }

    private static func prettyKey(_ raw: String) -> String {
        let normalized = raw.replacingOccurrences(of: "_", with: " ").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else { return raw }
        var out = ""
        var previousWasLower = false
        for scalar in normalized.unicodeScalars {
            let char = Character(scalar)
            if scalar.properties.isUppercase && previousWasLower {
                out.append(" ")
            }
            out.append(char)
            previousWasLower = scalar.properties.isLowercase
        }
        return out
            .split(separator: " ")
            .map { token in
                let lower = token.lowercased()
                if lower == "eta" {
                    return "ETA"
                }
                return lower.prefix(1).uppercased() + lower.dropFirst()
            }
            .joined(separator: " ")
    }

    private static func clamp(_ text: String, limit: Int) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count > limit else { return trimmed }
        let end = trimmed.index(trimmed.startIndex, offsetBy: limit)
        return String(trimmed[..<end]) + "…"
    }
}

private extension Dictionary where Key == String, Value == OpenClawProtocol.AnyCodable {
    func firstString(keys: [String]) -> String? {
        for key in keys {
            if let value = self[key]?.stringValue {
                return value
            }
        }
        return nil
    }

    func firstBool(keys: [String]) -> Bool? {
        for key in keys {
            if let value = self[key]?.boolValue {
                return value
            }
        }
        return nil
    }

    func firstDictionary(keys: [String]) -> [String: OpenClawProtocol.AnyCodable]? {
        for key in keys {
            if let value = self[key]?.dictionaryValue {
                return value
            }
        }
        return nil
    }

    func firstArray(keys: [String]) -> [OpenClawProtocol.AnyCodable]? {
        for key in keys {
            if let value = self[key]?.arrayValue {
                return value
            }
        }
        return nil
    }
}

private extension String {
    var trimmedNonEmpty: String? {
        let trimmed = self.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
