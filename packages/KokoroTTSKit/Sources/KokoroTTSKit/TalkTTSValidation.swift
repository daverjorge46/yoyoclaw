import Foundation

/// TTS validation helpers (ElevenLabsKit compatibility)
public enum TalkTTSValidation {
    /// Validate latency tier
    public static func validatedLatencyTier(_ tier: Int?) -> Int {
        // Kokoro is always fast (local)
        return 0
    }
    
    /// Extract PCM sample rate from output format
    public static func pcmSampleRate(from format: String?) -> Int? {
        // Kokoro always returns MP3, not PCM
        return nil
    }
}
