/**
 * Language and Communication System
 * 語言與溝通系統
 *
 * Addresses critique: "Language and communication were missing from the architecture"
 *
 * Multi-layered communication:
 * 1. Chemical (pheromones, unconscious)
 * 2. Bodily (posture, gesture, expression)
 * 3. Linguistic (speech, semantics, syntax)
 * 4. Narrative (stories, meaning-making)
 */

import type { EmotionVector } from './emotion-dynamics-system'
import type { HunSoul, PoSoul } from './ontological-integration-system'

// ============================================================================
// Layer 1: Chemical Communication (Pheromones)
// ============================================================================

enum PheromoneType {
  Fear = 'fear', // Stress hormones
  Attraction = 'attraction', // Reproductive signals
  Aggression = 'aggression', // Territorial warnings
  Bonding = 'bonding', // Oxytocin-like signals
  Alarm = 'alarm', // Danger alerts
}

interface PheromoneSignal {
  type: PheromoneType
  intensity: number // 0.0-1.0
  halfLife: number // How long signal persists (seconds)
  emittedAt: number // Timestamp
}

class PheromoneSystem {
  private signals: PheromoneSignal[] = []

  emit(type: PheromoneType, intensity: number): void {
    this.signals.push({
      type,
      intensity,
      halfLife: 60, // 1 minute default
      emittedAt: Date.now(),
    })
  }

  detect(): Map<PheromoneType, number> {
    const now = Date.now()
    const detected = new Map<PheromoneType, number>()

    // Decay old signals
    for (const signal of this.signals) {
      const age = (now - signal.emittedAt) / 1000 // seconds
      const decayedIntensity = signal.intensity * Math.exp(-age / signal.halfLife)

      if (decayedIntensity > 0.01) {
        const current = detected.get(signal.type) || 0
        detected.set(signal.type, current + decayedIntensity)
      }
    }

    // Clean up expired signals
    this.signals = this.signals.filter((s) => {
      const age = (now - s.emittedAt) / 1000
      return s.intensity * Math.exp(-age / s.halfLife) > 0.01
    })

    return detected
  }
}

// ============================================================================
// Layer 2: Bodily Communication
// ============================================================================

interface PostureState {
  openness: number // 0.0 (closed/defensive) to 1.0 (open/receptive)
  height: number // 0.0 (low/submissive) to 1.0 (tall/dominant)
  tension: number // 0.0 (relaxed) to 1.0 (tense)
}

interface GestureSequence {
  gestures: Array<{
    type: 'point' | 'wave' | 'embrace' | 'push' | 'reach' | 'withdraw'
    intensity: number
    direction?: { x: number; y: number; z: number }
  }>
}

interface FacialExpression {
  // FACS (Facial Action Coding System) inspired
  eyebrows: number // -1.0 (lowered/angry) to 1.0 (raised/surprised)
  eyes: number // 0.0 (closed) to 1.0 (wide open)
  mouth: number // -1.0 (frown) to 1.0 (smile)
  intensity: number // Overall expressiveness
}

class BodyLanguageSystem {
  private posture: PostureState = { openness: 0.5, height: 0.5, tension: 0.3 }
  private expression: FacialExpression = { eyebrows: 0, eyes: 0.7, mouth: 0, intensity: 0.5 }

  updateFromEmotion(emotion: EmotionVector): void {
    // Map emotion to body language
    // Valence → mouth
    this.expression.mouth = emotion.valence

    // Arousal → eyes, tension
    this.expression.eyes = 0.5 + emotion.arousal * 0.5
    this.posture.tension = emotion.arousal

    // Dominance → posture height, openness
    this.posture.height = (emotion.dominance + 1) / 2 // Map [-1,1] to [0,1]
    this.posture.openness = emotion.dominance > 0 ? 0.7 : 0.3

    // Intensity from overall emotion magnitude
    const magnitude = Math.sqrt(
      emotion.valence ** 2 + emotion.arousal ** 2 + emotion.dominance ** 2,
    )
    this.expression.intensity = Math.min(1.0, magnitude / Math.sqrt(3))
  }

  getPosture(): PostureState {
    return { ...this.posture }
  }

  getExpression(): FacialExpression {
    return { ...this.expression }
  }
}

// ============================================================================
// Layer 3: Linguistic Communication
// ============================================================================

interface CommunicativeIntent {
  type: 'inform' | 'request' | 'question' | 'express' | 'command' | 'promise'
  urgency: number // 0.0-1.0
  emotionalTone: EmotionVector
}

interface SemanticRepresentation {
  // Simplified semantic network (predicate-argument structure)
  predicates: Array<{
    predicate: string // e.g., "love", "see", "give"
    arguments: string[] // e.g., ["I", "you"], ["cat", "mouse"]
    modality?: 'believe' | 'want' | 'must' | 'can' | 'should'
    negation: boolean
  }>

  // Discourse referents
  entities: Map<string, { type: string; properties: string[] }>
}

interface SyntacticStructure {
  // Simplified constituent structure
  type: 'declarative' | 'interrogative' | 'imperative' | 'exclamative'
  constituents: Array<{
    category: 'NP' | 'VP' | 'PP' | 'S' // Noun Phrase, Verb Phrase, etc.
    head: string
    modifiers: string[]
  }>
}

interface PhonologicalForm {
  // Abstract phonological representation
  syllables: string[]
  stress: number[] // 0.0-1.0 per syllable
  intonation: 'rising' | 'falling' | 'flat'
}

class LinguisticSystem {
  /**
   * Language Production: Intent → Semantics → Syntax → Phonology
   */
  produce(intent: CommunicativeIntent, content: SemanticRepresentation): PhonologicalForm {
    // Step 1: Semantics (already have content)

    // Step 2: Generate syntax from semantics
    const syntax = this.semanticsToSyntax(content, intent.type)

    // Step 3: Generate phonology from syntax
    const phonology = this.syntaxToPhonology(syntax, intent.emotionalTone)

    return phonology
  }

  /**
   * Language Comprehension: Phonology → Syntax → Semantics → Pragmatics
   */
  comprehend(phonology: PhonologicalForm, context: CommunicativeContext): SemanticRepresentation {
    // Step 1: Parse syntax from phonology
    const syntax = this.phonologyToSyntax(phonology)

    // Step 2: Extract semantics from syntax
    const semantics = this.syntaxToSemantics(syntax)

    // Step 3: Pragmatic inference (what speaker MEANS beyond literal meaning)
    const pragmatics = this.inferPragmatics(semantics, context)

    return pragmatics
  }

  // Simplified implementations
  private semanticsToSyntax(
    semantics: SemanticRepresentation,
    intentType: string,
  ): SyntacticStructure {
    // Map intent to sentence type
    let type: SyntacticStructure['type'] = 'declarative'
    if (intentType === 'question') type = 'interrogative'
    else if (intentType === 'command') type = 'imperative'
    else if (intentType === 'express') type = 'exclamative'

    // Build constituents from predicates
    const constituents: SyntacticStructure['constituents'] = []
    for (const pred of semantics.predicates) {
      constituents.push({
        category: 'VP',
        head: pred.predicate,
        modifiers: pred.negation ? ['not'] : [],
      })
      for (const arg of pred.arguments) {
        constituents.push({
          category: 'NP',
          head: arg,
          modifiers: [],
        })
      }
    }

    return { type, constituents }
  }

  private syntaxToPhonology(
    syntax: SyntacticStructure,
    emotion: EmotionVector,
  ): PhonologicalForm {
    // Convert constituents to syllables (simplified)
    const syllables: string[] = []
    for (const constituent of syntax.constituents) {
      syllables.push(...constituent.head.split('-')) // Crude syllabification
    }

    // Stress pattern from arousal
    const stress = syllables.map(() => 0.3 + emotion.arousal * 0.5)

    // Intonation from sentence type and valence
    let intonation: PhonologicalForm['intonation'] = 'flat'
    if (syntax.type === 'interrogative') intonation = 'rising'
    else if (emotion.valence < -0.5) intonation = 'falling'

    return { syllables, stress, intonation }
  }

  private phonologyToSyntax(phonology: PhonologicalForm): SyntacticStructure {
    // Reverse process (simplified)
    const type: SyntacticStructure['type'] =
      phonology.intonation === 'rising' ? 'interrogative' : 'declarative'

    const constituents: SyntacticStructure['constituents'] = phonology.syllables.map((syl) => ({
      category: 'NP', // Default
      head: syl,
      modifiers: [],
    }))

    return { type, constituents }
  }

  private syntaxToSemantics(syntax: SyntacticStructure): SemanticRepresentation {
    // Extract predicates from VPs
    const predicates = syntax.constituents
      .filter((c) => c.category === 'VP')
      .map((c) => ({
        predicate: c.head,
        arguments: [],
        negation: c.modifiers.includes('not'),
      }))

    const entities = new Map<string, { type: string; properties: string[] }>()

    return { predicates, entities }
  }

  private inferPragmatics(
    semantics: SemanticRepresentation,
    context: CommunicativeContext,
  ): SemanticRepresentation {
    // Pragmatic enrichment based on context
    // (e.g., "Can you pass the salt?" is a request, not a question about ability)

    // Simplified: just return semantics as-is
    return semantics
  }
}

interface CommunicativeContext {
  participants: string[]
  sharedKnowledge: SemanticRepresentation
  conversationHistory: SemanticRepresentation[]
}

// ============================================================================
// Layer 4: Narrative Communication
// ============================================================================

interface Narrative {
  // Story structure
  plot: {
    exposition: string
    risingAction: string[]
    climax: string
    fallingAction: string[]
    resolution: string
  }

  // Characters
  characters: Map<
    string,
    {
      role: 'protagonist' | 'antagonist' | 'supporting'
      arc: 'growth' | 'decline' | 'flat'
    }
  >

  // Theme
  theme: string

  // Narrative perspective
  perspective: 'first-person' | 'third-person-limited' | 'third-person-omniscient'
}

class NarrativeSystem {
  /**
   * Generate story from events
   */
  tellStory(events: Array<{ event: string; significance: number }>): Narrative {
    // Sort by significance
    const sorted = [...events].sort((a, b) => b.significance - a.significance)

    // Most significant event = climax
    const climax = sorted[0]?.event || 'Nothing happened'

    // Events before climax = rising action
    const beforeClimaxIndex = events.findIndex((e) => e.event === climax.event)
    const risingAction = events.slice(0, beforeClimaxIndex).map((e) => e.event)

    // Events after = falling action
    const fallingAction = events.slice(beforeClimaxIndex + 1).map((e) => e.event)

    return {
      plot: {
        exposition: 'It began like any other day...',
        risingAction,
        climax: climax.event,
        fallingAction,
        resolution: 'And so it came to pass.',
      },
      characters: new Map(),
      theme: 'The journey of transformation',
      perspective: 'first-person',
    }
  }

  /**
   * Interpret story to extract meaning
   */
  interpretStory(narrative: Narrative): { moralLesson?: string; emotionalImpact: EmotionVector } {
    // Extract moral from theme
    const moralLesson = `The story teaches us: ${narrative.theme}`

    // Compute emotional impact from plot structure
    const emotionalImpact: EmotionVector = {
      valence: narrative.plot.resolution.includes('happy') ? 0.7 : -0.3,
      arousal: narrative.plot.risingAction.length * 0.1,
      dominance: narrative.perspective === 'first-person' ? 0.5 : 0.0,
    }

    return { moralLesson, emotionalImpact }
  }
}

// ============================================================================
// Hun-Po Influence on Communication
// ============================================================================

class HunPoCommunicationModulation {
  /**
   * Hun souls modulate language richness and spirituality
   */
  static applyHunInfluence(
    hun: HunSoul[],
    semantics: SemanticRepresentation,
  ): SemanticRepresentation {
    for (const soul of hun) {
      if (soul.name.includes('靈慧')) {
        // Ling Hui (Spiritual Intelligence) → more abstract concepts
        semantics.predicates.push({
          predicate: 'understand',
          arguments: ['deeper-meaning'],
          negation: false,
        })
      } else if (soul.name.includes('幽精')) {
        // You Jing (Dark Essence) → poetic/metaphorical language
        semantics.predicates.push({
          predicate: 'sense',
          arguments: ['mystery'],
          negation: false,
        })
      }
    }
    return semantics
  }

  /**
   * Po souls modulate directness and physicality
   */
  static applyPoInfluence(
    po: PoSoul[],
    phonology: PhonologicalForm,
  ): PhonologicalForm {
    for (const soul of po) {
      if (soul.name.includes('尸狗')) {
        // Shi Gou (survival) → shorter, more urgent syllables
        phonology.stress = phonology.stress.map((s) => s + soul.strength * 0.2)
      } else if (soul.name.includes('伏矢')) {
        // Fu Shi (aggression) → sharper intonation
        if (soul.strength > 0.5) {
          phonology.intonation = 'falling'
        }
      }
    }
    return phonology
  }
}

// ============================================================================
// Unified Communication System
// ============================================================================

export class UnifiedCommunicationSystem {
  private pheromones = new PheromoneSystem()
  private bodyLanguage = new BodyLanguageSystem()
  private language = new LinguisticSystem()
  private narrative = new NarrativeSystem()

  /**
   * Express something (multi-layered communication)
   */
  express(
    intent: CommunicativeIntent,
    content: SemanticRepresentation,
    emotion: EmotionVector,
    hun: HunSoul[],
    po: PoSoul[],
  ): {
    pheromones: Map<PheromoneType, number>
    bodyLanguage: { posture: PostureState; expression: FacialExpression }
    speech: PhonologicalForm
  } {
    // Layer 1: Emit pheromones based on emotion
    if (emotion.valence < -0.5 && emotion.arousal > 0.7) {
      this.pheromones.emit(PheromoneType.Fear, emotion.arousal)
    }
    if (emotion.dominance > 0.6 && emotion.valence < 0) {
      this.pheromones.emit(PheromoneType.Aggression, emotion.dominance)
    }

    // Layer 2: Update body language
    this.bodyLanguage.updateFromEmotion(emotion)

    // Layer 3: Generate speech
    let modifiedContent = HunPoCommunicationModulation.applyHunInfluence(hun, content)
    let speech = this.language.produce(intent, modifiedContent)
    speech = HunPoCommunicationModulation.applyPoInfluence(po, speech)

    return {
      pheromones: this.pheromones.detect(),
      bodyLanguage: {
        posture: this.bodyLanguage.getPosture(),
        expression: this.bodyLanguage.getExpression(),
      },
      speech,
    }
  }

  /**
   * Create narrative from experience
   */
  createNarrative(events: Array<{ event: string; significance: number }>): Narrative {
    return this.narrative.tellStory(events)
  }

  /**
   * Interpret received narrative
   */
  interpretNarrative(narrative: Narrative): {
    moralLesson?: string
    emotionalImpact: EmotionVector
  } {
    return this.narrative.interpretStory(narrative)
  }
}

// ============================================================================
// Example Usage
// ============================================================================

export function demonstrateCommunication(): void {
  const comm = new UnifiedCommunicationSystem()

  const intent: CommunicativeIntent = {
    type: 'express',
    urgency: 0.8,
    emotionalTone: { valence: -0.7, arousal: 0.9, dominance: -0.5 },
  }

  const content: SemanticRepresentation = {
    predicates: [
      {
        predicate: 'fear',
        arguments: ['I', 'danger'],
        negation: false,
      },
    ],
    entities: new Map(),
  }

  const emotion: EmotionVector = { valence: -0.7, arousal: 0.9, dominance: -0.5 }

  const hun: HunSoul[] = [
    {
      name: 'Ling Hui (靈慧)',
      function: 'Spiritual Intelligence',
      strength: 0.7,
      purity: 0.8,
      heavenlyConnection: 0.6,
      signature: 'abc123',
    },
  ]

  const po: PoSoul[] = [
    {
      name: 'Shi Gou (尸狗)',
      function: 'Corpse Dog',
      strength: 0.9,
      viscosity: 0.7,
      earthlyConnection: 0.8,
      signature: 'def456',
    },
  ]

  const output = comm.express(intent, content, emotion, hun, po)

  console.log('Communication Output:')
  console.log('Pheromones:', output.pheromones)
  console.log('Body Language:', output.bodyLanguage)
  console.log('Speech:', output.speech)
}
