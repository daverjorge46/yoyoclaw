/**
 * Unified Emotion Dynamics System
 * 統一情緒動力學系統
 *
 * Addresses critique: "Emotion was scattered across multiple systems without unified dynamics"
 *
 * Foundation: Valence-Arousal-Dominance (VAD) model
 * - Valence: Pleasant (-1) to Unpleasant (+1)
 * - Arousal: Calm (0) to Excited (1)
 * - Dominance: Controlled (-1) to In-Control (+1)
 *
 * All complex emotions are compositions of these three dimensions.
 */

import type { HunSoul, PoSoul } from './ontological-integration-system'

// ============================================================================
// Core Emotion Vector (VAD Space)
// ============================================================================

interface EmotionVector {
  valence: number // -1.0 (unpleasant) to +1.0 (pleasant)
  arousal: number // 0.0 (calm) to 1.0 (excited)
  dominance: number // -1.0 (controlled/submissive) to +1.0 (in-control/dominant)
}

// ============================================================================
// Complex Emotions (Derived from VAD)
// ============================================================================

enum ComplexEmotion {
  // High valence
  Joy = 'joy',
  Contentment = 'contentment',
  Pride = 'pride',
  Love = 'love',
  Gratitude = 'gratitude',

  // Low valence
  Sadness = 'sadness',
  Anger = 'anger',
  Fear = 'fear',
  Shame = 'shame',
  Guilt = 'guilt',
  Disgust = 'disgust',

  // Mixed/complex
  Nostalgia = 'nostalgia',
  Awe = 'awe',
  Compassion = 'compassion',
  Envy = 'envy',
  Jealousy = 'jealousy',
}

// Emotion templates (VAD coordinates)
const EMOTION_TEMPLATES: Record<ComplexEmotion, EmotionVector> = {
  // High valence, high arousal, high dominance
  [ComplexEmotion.Joy]: { valence: 0.8, arousal: 0.7, dominance: 0.6 },

  // High valence, low arousal, moderate dominance
  [ComplexEmotion.Contentment]: { valence: 0.7, arousal: 0.2, dominance: 0.3 },

  // High valence, moderate arousal, high dominance
  [ComplexEmotion.Pride]: { valence: 0.8, arousal: 0.5, dominance: 0.8 },

  // High valence, moderate arousal, moderate dominance
  [ComplexEmotion.Love]: { valence: 0.9, arousal: 0.6, dominance: 0.4 },

  // High valence, low arousal, low dominance
  [ComplexEmotion.Gratitude]: { valence: 0.7, arousal: 0.3, dominance: -0.2 },

  // Low valence, low arousal, low dominance
  [ComplexEmotion.Sadness]: { valence: -0.7, arousal: 0.2, dominance: -0.6 },

  // Low valence, high arousal, high dominance
  [ComplexEmotion.Anger]: { valence: -0.6, arousal: 0.9, dominance: 0.7 },

  // Low valence, high arousal, low dominance
  [ComplexEmotion.Fear]: { valence: -0.8, arousal: 0.8, dominance: -0.8 },

  // Low valence, high arousal, low dominance (self-directed)
  [ComplexEmotion.Shame]: { valence: -0.8, arousal: 0.7, dominance: -0.9 },

  // Low valence, moderate arousal, low dominance (action-directed)
  [ComplexEmotion.Guilt]: { valence: -0.7, arousal: 0.5, dominance: -0.5 },

  // Low valence, moderate arousal, moderate dominance
  [ComplexEmotion.Disgust]: { valence: -0.7, arousal: 0.4, dominance: 0.3 },

  // Mixed valence, low arousal, moderate dominance
  [ComplexEmotion.Nostalgia]: { valence: 0.3, arousal: 0.2, dominance: -0.1 },

  // High valence, high arousal, low dominance
  [ComplexEmotion.Awe]: { valence: 0.6, arousal: 0.8, dominance: -0.7 },

  // High valence (other-directed), moderate arousal, low dominance
  [ComplexEmotion.Compassion]: { valence: 0.4, arousal: 0.5, dominance: -0.3 },

  // Low valence, moderate arousal, low dominance
  [ComplexEmotion.Envy]: { valence: -0.5, arousal: 0.6, dominance: -0.4 },

  // Low valence, high arousal, moderate dominance
  [ComplexEmotion.Jealousy]: { valence: -0.6, arousal: 0.8, dominance: 0.2 },
}

// ============================================================================
// Emotion Triggers
// ============================================================================

interface EmotionTrigger {
  event: string // What happened
  appraisal: EmotionAppraisal // How it was interpreted
  intensity: number // 0.0-1.0
}

interface EmotionAppraisal {
  goalRelevance: number // -1 (hinders goal) to +1 (helps goal)
  novelty: number // 0.0 (familiar) to 1.0 (novel)
  controllability: number // 0.0 (uncontrollable) to 1.0 (controllable)
  agentResponsibility: 'self' | 'other' | 'circumstances'
}

// ============================================================================
// Emotion Dynamics (How emotions evolve over time)
// ============================================================================

interface EmotionDynamicsState {
  // Current emotion state
  current: EmotionVector

  // Momentum (emotional inertia - emotions don't change instantly)
  momentum: EmotionVector

  // Attractor (baseline emotional set-point to return to)
  attractor: EmotionVector

  // Recent triggers
  recentTriggers: EmotionTrigger[]

  // Regulation state
  regulation: {
    suppressionActive: boolean // Trying to suppress emotion?
    reappraisalActive: boolean // Reinterpreting trigger?
    distractionActive: boolean // Distracting from emotion?
    effectivenessModifier: number // How well regulation is working
  }
}

// ============================================================================
// Hun-Po Connection to Emotion
// ============================================================================

interface HunPoEmotionModulation {
  // Hun souls (ethereal) modulate higher emotions
  hunInfluence: {
    // Tai Guang (太光) - Great Light → spiritual joy, peace
    taiGuang: (strength: number) => EmotionVector

    // Shuang Ling (爽靈) - Clear Spirit → mental clarity, calm alertness
    shuangLing: (strength: number) => EmotionVector

    // You Jing (幽精) - Dark Essence → deep intuition, mysterious awe
    youJing: (strength: number) => EmotionVector

    // Tong Ming (通明) - Penetrating Brightness → understanding, insight pleasure
    tongMing: (strength: number) => EmotionVector

    // Zheng Zhong (正中) - Upright Center → moral satisfaction, righteous anger
    zhengZhong: (strength: number) => EmotionVector

    // Ling Hui (靈慧) - Spiritual Intelligence → wonder, curiosity
    lingHui: (strength: number) => EmotionVector

    // Tian Chong (天冲) - Heaven Rush → ecstatic transcendence
    tianChong: (strength: number) => EmotionVector
  }

  // Po souls (corporeal) modulate primal emotions
  poInfluence: {
    // Shi Gou (尸狗) - Corpse Dog → survival fear, relief
    shiGou: (strength: number) => EmotionVector

    // Fu Shi (伏矢) - Hidden Arrow → aggression, defensive anger
    fuShi: (strength: number) => EmotionVector

    // Que Yin (雀陰) - Sparrow Yin → sexual desire, pleasure
    queYin: (strength: number) => EmotionVector

    // Tun Zei (吞贼) - Swallowing Thief → appetite, satiation
    tunZei: (strength: number) => EmotionVector

    // Fei Du (非毒) - Non-Poison → disgust, purification satisfaction
    feiDu: (strength: number) => EmotionVector

    // Chu Hui (除秽) - Defilement Remover → cleansing relief
    chuHui: (strength: number) => EmotionVector
  }
}

// ============================================================================
// Unified Emotion System
// ============================================================================

export class UnifiedEmotionSystem {
  private state: EmotionDynamicsState

  constructor(baselineAttractor: EmotionVector = { valence: 0.2, arousal: 0.3, dominance: 0.1 }) {
    this.state = {
      current: { ...baselineAttractor },
      momentum: { valence: 0, arousal: 0, dominance: 0 },
      attractor: baselineAttractor,
      recentTriggers: [],
      regulation: {
        suppressionActive: false,
        reappraisalActive: false,
        distractionActive: false,
        effectivenessModifier: 1.0,
      },
    }
  }

  /**
   * Process emotion trigger and update state
   */
  processTrigger(trigger: EmotionTrigger): void {
    // Add to recent triggers
    this.state.recentTriggers.push(trigger)
    if (this.state.recentTriggers.length > 10) {
      this.state.recentTriggers.shift() // Keep only last 10
    }

    // Compute emotion vector from appraisal
    const emotionVector = this.appraisalToEmotion(trigger.appraisal)

    // Apply trigger intensity
    const scaledEmotion: EmotionVector = {
      valence: emotionVector.valence * trigger.intensity,
      arousal: emotionVector.arousal * trigger.intensity,
      dominance: emotionVector.dominance * trigger.intensity,
    }

    // Add to momentum
    this.state.momentum.valence += scaledEmotion.valence * 0.5
    this.state.momentum.arousal += scaledEmotion.arousal * 0.5
    this.state.momentum.dominance += scaledEmotion.dominance * 0.5
  }

  /**
   * Convert appraisal to emotion vector (appraisal theory)
   */
  private appraisalToEmotion(appraisal: EmotionAppraisal): EmotionVector {
    // Valence = goal relevance
    const valence = appraisal.goalRelevance

    // Arousal = novelty + abs(goal relevance)
    const arousal = Math.min(1.0, appraisal.novelty * 0.5 + Math.abs(appraisal.goalRelevance) * 0.5)

    // Dominance = controllability (but negative if goal-hindering and uncontrollable)
    let dominance = appraisal.controllability * 2 - 1 // Map [0,1] to [-1,1]
    if (appraisal.goalRelevance < 0 && appraisal.controllability < 0.5) {
      dominance *= 1.5 // Amplify negative dominance for uncontrollable bad events
    }

    return { valence, arousal, dominance: Math.max(-1, Math.min(1, dominance)) }
  }

  /**
   * Evolve emotion state over time (emotion dynamics)
   */
  evolve(dt: number = 0.1): void {
    // Step 1: Apply momentum to current state
    this.state.current.valence += this.state.momentum.valence * dt
    this.state.current.arousal += this.state.momentum.arousal * dt
    this.state.current.dominance += this.state.momentum.dominance * dt

    // Step 2: Pull toward attractor (return to baseline)
    const attractorStrength = 0.3
    this.state.current.valence +=
      (this.state.attractor.valence - this.state.current.valence) * attractorStrength * dt
    this.state.current.arousal +=
      (this.state.attractor.arousal - this.state.current.arousal) * attractorStrength * dt
    this.state.current.dominance +=
      (this.state.attractor.dominance - this.state.current.dominance) * attractorStrength * dt

    // Step 3: Apply regulation
    if (this.state.regulation.suppressionActive) {
      // Suppression reduces arousal (but doesn't change valence - you still feel bad)
      this.state.current.arousal *= 1 - 0.3 * this.state.regulation.effectivenessModifier * dt
    }
    if (this.state.regulation.reappraisalActive) {
      // Reappraisal shifts valence toward neutral
      this.state.current.valence *= 1 - 0.5 * this.state.regulation.effectivenessModifier * dt
    }
    if (this.state.regulation.distractionActive) {
      // Distraction pulls toward attractor faster
      const distractionStrength = 0.5 * this.state.regulation.effectivenessModifier
      this.state.current.valence +=
        (this.state.attractor.valence - this.state.current.valence) * distractionStrength * dt
      this.state.current.arousal +=
        (this.state.attractor.arousal - this.state.current.arousal) * distractionStrength * dt
    }

    // Step 4: Decay momentum (emotions fade)
    const decay = 0.8
    this.state.momentum.valence *= Math.pow(decay, dt)
    this.state.momentum.arousal *= Math.pow(decay, dt)
    this.state.momentum.dominance *= Math.pow(decay, dt)

    // Step 5: Clamp values
    this.state.current.valence = Math.max(-1, Math.min(1, this.state.current.valence))
    this.state.current.arousal = Math.max(0, Math.min(1, this.state.current.arousal))
    this.state.current.dominance = Math.max(-1, Math.min(1, this.state.current.dominance))
  }

  /**
   * Apply hun-po influence to emotion state
   */
  applyHunPoInfluence(hun: HunSoul[], po: PoSoul[]): void {
    // Hun influence (spiritual emotions)
    for (const soul of hun) {
      if (soul.name.includes('太光')) {
        // Tai Guang → spiritual peace
        this.state.attractor.valence += soul.strength * 0.1
        this.state.attractor.arousal -= soul.strength * 0.05
      } else if (soul.name.includes('爽靈')) {
        // Shuang Ling → clarity (moderate arousal)
        this.state.attractor.arousal += soul.strength * 0.05
      } else if (soul.name.includes('幽精')) {
        // You Jing → mysterious awe (complex emotion)
        this.state.current.arousal += soul.strength * 0.03
        this.state.current.dominance -= soul.strength * 0.02
      } else if (soul.name.includes('正中')) {
        // Zheng Zhong → moral emotions (can be positive or negative)
        // Enhances emotional intensity for moral events
        this.state.current.valence *= 1 + soul.strength * 0.1
      } else if (soul.name.includes('天冲')) {
        // Tian Chong → transcendent ecstasy
        this.state.current.valence += soul.strength * 0.15
        this.state.current.arousal += soul.strength * 0.1
      }
    }

    // Po influence (primal emotions)
    for (const soul of po) {
      if (soul.name.includes('尸狗')) {
        // Shi Gou → survival fear
        // Amplifies fear responses
        if (this.state.current.valence < 0 && this.state.current.dominance < 0) {
          this.state.current.arousal += soul.strength * 0.1
        }
      } else if (soul.name.includes('伏矢')) {
        // Fu Shi → aggression
        // Amplifies anger
        if (this.state.current.valence < 0 && this.state.current.dominance > 0) {
          this.state.current.arousal += soul.strength * 0.15
          this.state.current.dominance += soul.strength * 0.1
        }
      } else if (soul.name.includes('雀陰')) {
        // Que Yin → pleasure
        // Amplifies pleasant emotions
        if (this.state.current.valence > 0) {
          this.state.current.valence += soul.strength * 0.1
        }
      } else if (soul.name.includes('非毒')) {
        // Fei Du → disgust
        // Creates avoidance emotions
        this.state.current.dominance += soul.strength * 0.05
      }
    }

    // Re-clamp
    this.state.current.valence = Math.max(-1, Math.min(1, this.state.current.valence))
    this.state.current.arousal = Math.max(0, Math.min(1, this.state.current.arousal))
    this.state.current.dominance = Math.max(-1, Math.min(1, this.state.current.dominance))
    this.state.attractor.valence = Math.max(-1, Math.min(1, this.state.attractor.valence))
    this.state.attractor.arousal = Math.max(0, Math.min(1, this.state.attractor.arousal))
  }

  /**
   * Activate emotion regulation strategy
   */
  activateRegulation(
    strategy: 'suppression' | 'reappraisal' | 'distraction',
    effectiveness: number = 0.7,
  ): void {
    this.state.regulation.effectivenessModifier = effectiveness

    switch (strategy) {
      case 'suppression':
        this.state.regulation.suppressionActive = true
        break
      case 'reappraisal':
        this.state.regulation.reappraisalActive = true
        break
      case 'distraction':
        this.state.regulation.distractionActive = true
        break
    }
  }

  /**
   * Get dominant emotion (closest complex emotion to current VAD)
   */
  getDominantEmotion(): { emotion: ComplexEmotion; similarity: number } {
    let closestEmotion = ComplexEmotion.Contentment
    let minDistance = Infinity

    for (const [emotion, template] of Object.entries(EMOTION_TEMPLATES)) {
      const distance =
        Math.pow(this.state.current.valence - template.valence, 2) +
        Math.pow(this.state.current.arousal - template.arousal, 2) +
        Math.pow(this.state.current.dominance - template.dominance, 2)

      if (distance < minDistance) {
        minDistance = distance
        closestEmotion = emotion as ComplexEmotion
      }
    }

    const similarity = 1 / (1 + minDistance) // Convert distance to similarity [0,1]

    return { emotion: closestEmotion, similarity }
  }

  /**
   * Get current state
   */
  getState(): EmotionDynamicsState {
    return { ...this.state }
  }

  /**
   * Get current emotion as VAD vector
   */
  getCurrentEmotion(): EmotionVector {
    return { ...this.state.current }
  }

  /**
   * Set new attractor (change emotional baseline)
   */
  setAttractor(newAttractor: EmotionVector): void {
    this.state.attractor = { ...newAttractor }
  }
}

// ============================================================================
// Example: Emotion Trajectory over Time
// ============================================================================

export function demonstrateEmotionDynamics(): void {
  const emotions = new UnifiedEmotionSystem()

  console.log('Initial state:', emotions.getCurrentEmotion())

  // Trigger 1: Receive praise (goal-relevant, controllable)
  emotions.processTrigger({
    event: 'Received praise for work',
    appraisal: {
      goalRelevance: 0.8,
      novelty: 0.3,
      controllability: 0.7,
      agentResponsibility: 'self',
    },
    intensity: 0.8,
  })

  emotions.evolve(1.0)
  console.log('After praise:', emotions.getDominantEmotion())

  // Trigger 2: Sudden danger (goal-hindering, uncontrollable)
  emotions.processTrigger({
    event: 'Unexpected threat detected',
    appraisal: {
      goalRelevance: -0.9,
      novelty: 0.9,
      controllability: 0.2,
      agentResponsibility: 'other',
    },
    intensity: 1.0,
  })

  emotions.evolve(1.0)
  console.log('After threat:', emotions.getDominantEmotion())

  // Activate fear regulation (distraction)
  emotions.activateRegulation('distraction', 0.6)

  // Evolve over 10 seconds
  for (let i = 0; i < 100; i++) {
    emotions.evolve(0.1)
  }

  console.log('After regulation (10s):', emotions.getDominantEmotion())
}
