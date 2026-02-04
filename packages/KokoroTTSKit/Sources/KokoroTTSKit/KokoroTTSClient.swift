import Foundation

#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Kokoro TTS client for local, high-quality speech synthesis
public struct KokoroTTSClient: Sendable {
    private let baseURL: URL
    private let apiKey: String
    
    public init(
        apiKey: String,
        baseURL: String = "http://localhost:3000/api/v1"
    ) {
        self.apiKey = apiKey
        self.baseURL = URL(string: baseURL)!
    }
    
    /// Generate speech from text with streaming support
    public func streamSynthesize(
        voiceId: String,
        request: KokoroTTSRequest
    ) -> AsyncThrowingStream<Data, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    let data = try await self.synthesize(voiceId: voiceId, request: request)
                    continuation.yield(data)
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
    
    /// Generate speech from text (non-streaming)
    private func synthesize(
        voiceId: String,
        request: KokoroTTSRequest
    ) async throws -> Data {
        let url = baseURL.appendingPathComponent("audio/speech")
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload: [String: Any] = [
            "model": request.modelId ?? "model_q8f16",
            "voice": voiceId,
            "input": request.text
        ]
        
        urlRequest.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw KokoroTTSError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw KokoroTTSError.httpError(statusCode: httpResponse.statusCode)
        }
        
        return data
    }
    
    /// List available voices
    public func listVoices() async throws -> [KokoroVoice] {
        // Kokoro has a fixed set of voices
        return [
            KokoroVoice(voiceId: "af_heart", name: "Heart (American Female)", language: "en-US"),
            KokoroVoice(voiceId: "af_sky", name: "Sky (American Female)", language: "en-US"),
            KokoroVoice(voiceId: "af", name: "American Female", language: "en-US"),
            KokoroVoice(voiceId: "am_adam", name: "Adam (American Male)", language: "en-US"),
            KokoroVoice(voiceId: "am_michael", name: "Michael (American Male)", language: "en-US"),
            KokoroVoice(voiceId: "am", name: "American Male", language: "en-US"),
            KokoroVoice(voiceId: "bf_emma", name: "Emma (British Female)", language: "en-GB"),
            KokoroVoice(voiceId: "bf_isabella", name: "Isabella (British Female)", language: "en-GB"),
            KokoroVoice(voiceId: "bf", name: "British Female", language: "en-GB"),
            KokoroVoice(voiceId: "bm_george", name: "George (British Male)", language: "en-GB"),
            KokoroVoice(voiceId: "bm_lewis", name: "Lewis (British Male)", language: "en-GB"),
            KokoroVoice(voiceId: "bm", name: "British Male", language: "en-GB"),
        ]
    }
    
    // MARK: - Validation Methods (ElevenLabsKit compatibility)
    
    public static func validatedLanguage(_ language: String?) -> String? {
        guard let language else { return nil }
        // Kokoro only supports English
        if language.hasPrefix("en") { return language }
        return nil
    }
    
    public static func validatedOutputFormat(_ format: String?) -> String? {
        // Kokoro always returns MP3
        return "mp3_44100"
    }
    
    public static func validatedNormalize(_ normalize: Bool?) -> Bool {
        return normalize ?? false
    }
}

/// Kokoro TTS request
public struct KokoroTTSRequest: Sendable {
    public let text: String
    public let modelId: String?
    public let normalize: Bool
    public let language: String?
    public let latencyTier: Int?
    
    public init(
        text: String,
        modelId: String? = nil,
        normalize: Bool = false,
        language: String? = nil,
        latencyTier: Int? = nil
    ) {
        self.text = text
        self.modelId = modelId
        self.normalize = normalize
        self.language = language
        self.latencyTier = latencyTier
    }
}

/// Kokoro voice information
public struct KokoroVoice: Sendable {
    public let voiceId: String
    public let name: String
    public let language: String
    
    public init(voiceId: String, name: String, language: String) {
        self.voiceId = voiceId
        self.name = name
        self.language = language
    }
}

/// Kokoro TTS errors
public enum KokoroTTSError: Error, Sendable {
    case invalidResponse
    case httpError(statusCode: Int)
    case encodingError
}
