import Foundation

/// Result of streaming audio playback
public struct StreamingPlaybackResult: Sendable {
    public let finished: Bool
    public let interruptedAt: Double?
    
    public init(finished: Bool, interruptedAt: Double?) {
        self.finished = finished
        self.interruptedAt = interruptedAt
    }
}

/// Placeholder for PCM streaming (Kokoro doesn't use PCM)
public struct PCMStreamingAudioPlayer {
    public init() {}
}

/// Placeholder for MP3 streaming (handled by TalkAudioPlayer)
public struct StreamingAudioPlayer {
    public init() {}
}
