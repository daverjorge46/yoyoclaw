/**
 * Will and Decision System
 * 意志與決策系統
 *
 * Addresses critique: "Missing will and decision-making mechanisms"
 *
 * Key concepts:
 * - Dual-process theory (System 1 fast/intuitive vs System 2 slow/deliberative)
 * - Autonomy (self as source of action, not external forces)
 * - Willpower as depletable resource (ego depletion)
 * - Hun-Po influence on decision-making
 */

import type { HunSoul, PoSoul } from './ontological-integration-system'
import type { EmotionVector } from './emotion-dynamics-system'

// ============================================================================
// Decision Options
// ============================================================================

interface DecisionOption {
  id: string
  description: string
  expectedUtility: number // Expected value
  risk: number // Uncertainty/variance (0.0-1.0)
  effortRequired: number // 0.0-1.0
  moralAlignment: number // -1.0 (immoral) to 1.0 (moral)
}

// ============================================================================
// System 1: Fast, Intuitive, Automatic
// ============================================================================

enum Heuristic {
  Availability = 'availability', // Judge by ease of recall
  Representativeness = 'representativeness', // Judge by similarity to prototype
  Anchoring = 'anchoring', // Over-rely on first information
  AffectHeuristic = 'affect', // "If it feels good, do it"
}

interface IntuitiveJudgment {
  option: DecisionOption
  intuition: number // -1.0 (bad feeling) to 1.0 (good feeling)
  confidence: number // 0.0-1.0, often uncalibrated
  heuristicUsed: Heuristic
}

class System1 {
  /**
   * Make fast, intuitive judgment
   */
  judge(options: DecisionOption[], emotion: EmotionVector): IntuitiveJudgment {
    // Affect heuristic: current emotion biases judgment
    const biasedOptions = options.map((opt) => ({
      ...opt,
      // If feeling good (high valence), optimistic bias
      // If feeling bad (low valence), pessimistic bias
      biasedUtility: opt.expectedUtility + emotion.valence * 0.3,
    }))

    // Pick option with highest biased utility
    const best = biasedOptions.reduce((a, b) =>
      a.biasedUtility > b.biasedUtility ? a : b,
    )

    // Confidence = arousal (high arousal = overconfident)
    const confidence = 0.5 + emotion.arousal * 0.4

    return {
      option: options.find((o) => o.id === best.id)!,
      intuition: Math.tanh(best.biasedUtility), // Squash to [-1, 1]
      confidence,
      heuristicUsed: Heuristic.AffectHeuristic,
    }
  }

  /**
   * Speed: milliseconds
   */
  getSpeed(): number {
    return 0.001 // 1ms
  }
}

// ============================================================================
// System 2: Slow, Deliberative, Effortful
// ============================================================================

interface DeliberativeReasoning {
  option: DecisionOption
  prosList: string[]
  consList: string[]
  expectedValue: number
  reasoning: string
}

interface UtilityCalculation {
  option: DecisionOption
  utility: number // Expected utility
  probability: number // P(success)
  value: number // Value if successful
}

class System2 {
  /**
   * Deliberate carefully about options
   */
  deliberate(options: DecisionOption[]): DeliberativeReasoning {
    // Evaluate each option systematically
    const evaluations = options.map((opt) => {
      // Pros
      const pros: string[] = []
      if (opt.expectedUtility > 0.5) pros.push('High expected value')
      if (opt.risk < 0.3) pros.push('Low risk')
      if (opt.moralAlignment > 0.5) pros.push('Morally good')

      // Cons
      const cons: string[] = []
      if (opt.expectedUtility < 0) cons.push('Negative expected value')
      if (opt.risk > 0.7) cons.push('High risk')
      if (opt.effortRequired > 0.7) cons.push('Requires significant effort')
      if (opt.moralAlignment < -0.5) cons.push('Morally questionable')

      // Expected value calculation
      const ev = opt.expectedUtility - opt.effortRequired * 0.3 - opt.risk * 0.2

      return {
        option: opt,
        prosList: pros,
        consList: cons,
        expectedValue: ev,
        reasoning: `EV = ${ev.toFixed(2)}: ${pros.length} pros, ${cons.length} cons`,
      }
    })

    // Select option with highest expected value
    const best = evaluations.reduce((a, b) =>
      a.expectedValue > b.expectedValue ? a : b,
    )

    return best
  }

  /**
   * Cost-benefit analysis
   */
  analyzeCostBenefit(option: DecisionOption): UtilityCalculation {
    // Simplified: assume probability based on risk
    const probability = 1 - option.risk

    // Value = utility if successful
    const value = option.expectedUtility / probability

    // Total utility = P(success) * Value - Cost
    const utility = probability * value - option.effortRequired

    return {
      option,
      utility,
      probability,
      value,
    }
  }

  /**
   * Speed: seconds to minutes
   */
  getSpeed(): number {
    return 5.0 // 5 seconds typical
  }
}

// ============================================================================
// Autonomy (Self-Determination)
// ============================================================================

interface AutonomyState {
  selfAsSource: boolean // Is decision coming from self or external pressure?
  endorsement: boolean // Does self endorse this decision?
  resistance: number // 0.0-1.0, ability to resist external coercion
  authenticity: number // 0.0-1.0, alignment with true self
}

class AutonomySystem {
  private state: AutonomyState = {
    selfAsSource: true,
    endorsement: true,
    resistance: 0.7,
    authenticity: 0.8,
  }

  /**
   * Evaluate whether decision is autonomous
   */
  evaluateAutonomy(
    option: DecisionOption,
    externalPressure: number,
    internalValues: Map<string, number>,
  ): AutonomyState {
    // Self as source: low external pressure
    const selfAsSource = externalPressure < 0.5

    // Endorsement: check alignment with values
    let valueAlignment = 0
    for (const [value, importance] of internalValues) {
      // Simplified: assume moral alignment correlates with values
      valueAlignment += option.moralAlignment * importance
    }
    const endorsement = valueAlignment > 0

    // Resistance: baseline resistance minus external pressure
    const resistance = Math.max(0, this.state.resistance - externalPressure)

    // Authenticity: self-source AND endorsement
    const authenticity = selfAsSource && endorsement ? 0.9 : 0.3

    return {
      selfAsSource,
      endorsement,
      resistance,
      authenticity,
    }
  }

  /**
   * Experience of freedom
   */
  experienceFreedom(): number {
    // Freedom = autonomy + resistance
    return (this.state.authenticity + this.state.resistance) / 2
  }
}

// ============================================================================
// Willpower (Self-Control Resource)
// ============================================================================

interface WillpowerState {
  current: number // Current willpower (0.0-1.0)
  max: number // Maximum willpower capacity
  depletionRate: number // How fast willpower depletes with use
  recoveryRate: number // How fast willpower recovers with rest
  lastRestTime: number // Timestamp of last rest
}

class WillpowerSystem {
  private state: WillpowerState = {
    current: 1.0,
    max: 1.0,
    depletionRate: 0.05,
    recoveryRate: 0.01,
    lastRestTime: Date.now(),
  }

  /**
   * Exert willpower (resist temptation, force difficult action)
   */
  exert(effortRequired: number): boolean {
    // Can only exert if sufficient willpower
    if (this.state.current < effortRequired) {
      return false // Failed to exert willpower
    }

    // Deplete willpower
    this.state.current -= effortRequired * this.state.depletionRate

    return true // Success
  }

  /**
   * Recover willpower through rest
   */
  rest(duration: number): void {
    const now = Date.now()
    const timeSinceRest = (now - this.state.lastRestTime) / 1000 // seconds

    // Recovery
    const recovery = this.state.recoveryRate * duration
    this.state.current = Math.min(this.state.max, this.state.current + recovery)

    this.state.lastRestTime = now
  }

  /**
   * Check if depleted (ego depletion state)
   */
  isDepleted(): boolean {
    return this.state.current < 0.2
  }

  /**
   * Get current willpower
   */
  getCurrent(): number {
    return this.state.current
  }

  /**
   * Increase max willpower (through practice)
   */
  train(amount: number): void {
    this.state.max = Math.min(2.0, this.state.max + amount) // Cap at 2x baseline
  }
}

// ============================================================================
// Hun-Po Influence on Decision-Making
// ============================================================================

class HunPoDecisionModulation {
  /**
   * Hun souls bias toward transcendent, moral, long-term choices
   */
  static applyHunBias(hun: HunSoul[], options: DecisionOption[]): DecisionOption[] {
    return options.map((opt) => {
      let bias = 0

      for (const soul of hun) {
        if (soul.name.includes('天冲')) {
          // Tian Chong (Heaven Rush) → prefers transcendent options
          bias += soul.strength * 0.2
        } else if (soul.name.includes('正中')) {
          // Zheng Zhong (Upright Center) → prefers moral options
          bias += opt.moralAlignment * soul.strength * 0.3
        } else if (soul.name.includes('靈慧')) {
          // Ling Hui (Spiritual Intelligence) → prefers wise, long-term options
          bias += soul.strength * 0.15
        }
      }

      return {
        ...opt,
        expectedUtility: opt.expectedUtility + bias,
      }
    })
  }

  /**
   * Po souls bias toward survival, pleasure, immediate choices
   */
  static applyPoBias(po: PoSoul[], options: DecisionOption[]): DecisionOption[] {
    return options.map((opt) => {
      let bias = 0

      for (const soul of po) {
        if (soul.name.includes('尸狗')) {
          // Shi Gou (Corpse Dog) → prefers safe, survival options
          bias -= opt.risk * soul.strength * 0.4 // Risk aversion
        } else if (soul.name.includes('雀陰')) {
          // Que Yin (Sparrow Yin) → prefers pleasurable options
          if (opt.expectedUtility > 0.5) {
            bias += soul.strength * 0.3
          }
        } else if (soul.name.includes('伏矢')) {
          // Fu Shi (Hidden Arrow) → prefers aggressive/dominant options
          if (opt.description.includes('aggressive') || opt.description.includes('confront')) {
            bias += soul.strength * 0.25
          }
        }
      }

      return {
        ...opt,
        expectedUtility: opt.expectedUtility + bias,
      }
    })
  }

  /**
   * Hun-Po balance determines System 1 vs System 2 preference
   */
  static getSystemPreference(hun: HunSoul[], po: PoSoul[]): 'system1' | 'system2' | 'balanced' {
    const hunStrength = hun.reduce((sum, h) => sum + h.strength, 0) / hun.length
    const poStrength = po.reduce((sum, p) => sum + p.strength, 0) / po.length

    // High hun → prefer deliberative System 2
    // High po → prefer intuitive System 1
    // Balanced → use both

    if (hunStrength > poStrength + 0.3) return 'system2'
    if (poStrength > hunStrength + 0.3) return 'system1'
    return 'balanced'
  }
}

// ============================================================================
// Unified Decision System
// ============================================================================

export class UnifiedDecisionSystem {
  private system1 = new System1()
  private system2 = new System2()
  private autonomy = new AutonomySystem()
  private willpower = new WillpowerSystem()

  /**
   * Make decision (dual-process)
   */
  decide(
    options: DecisionOption[],
    emotion: EmotionVector,
    hun: HunSoul[],
    po: PoSoul[],
    externalPressure: number = 0,
    timeAvailable: number = 10.0, // seconds
  ): {
    choice: DecisionOption
    process: 'system1' | 'system2' | 'conflict'
    autonomy: AutonomyState
    willpowerUsed: number
  } {
    // Apply hun-po biases
    let biasedOptions = HunPoDecisionModulation.applyHunBias(hun, options)
    biasedOptions = HunPoDecisionModulation.applyPoBias(po, biasedOptions)

    // Determine which system to use
    const systemPreference = HunPoDecisionModulation.getSystemPreference(hun, po)

    let choice: DecisionOption
    let process: 'system1' | 'system2' | 'conflict'
    let willpowerUsed = 0

    if (timeAvailable < this.system2.getSpeed() || systemPreference === 'system1') {
      // Use System 1 (fast, intuitive)
      const judgment = this.system1.judge(biasedOptions, emotion)
      choice = judgment.option
      process = 'system1'
    } else if (systemPreference === 'system2') {
      // Use System 2 (slow, deliberative)
      const deliberation = this.system2.deliberate(biasedOptions)
      choice = deliberation.option
      process = 'system2'
    } else {
      // Balanced: both systems active, potential conflict
      const intuition = this.system1.judge(biasedOptions, emotion)
      const deliberation = this.system2.deliberate(biasedOptions)

      if (intuition.option.id === deliberation.option.id) {
        // Agreement: easy choice
        choice = intuition.option
        process = 'system1' // No conflict, go with intuition
      } else {
        // Conflict: need willpower to override intuition with deliberation
        const effortRequired = 0.5

        if (this.willpower.exert(effortRequired)) {
          // Successfully override intuition
          choice = deliberation.option
          process = 'conflict'
          willpowerUsed = effortRequired
        } else {
          // Ego depleted, fall back to intuition
          choice = intuition.option
          process = 'system1'
        }
      }
    }

    // Evaluate autonomy
    const internalValues = new Map([
      ['morality', 0.8],
      ['pleasure', 0.5],
      ['safety', 0.7],
    ])
    const autonomyState = this.autonomy.evaluateAutonomy(choice, externalPressure, internalValues)

    return {
      choice,
      process,
      autonomy: autonomyState,
      willpowerUsed,
    }
  }

  /**
   * Experience freedom of will
   */
  feelFree(): number {
    return this.autonomy.experienceFreedom()
  }

  /**
   * Rest to recover willpower
   */
  rest(duration: number): void {
    this.willpower.rest(duration)
  }

  /**
   * Train willpower
   */
  trainWillpower(amount: number = 0.01): void {
    this.willpower.train(amount)
  }

  /**
   * Check willpower state
   */
  getWillpower(): number {
    return this.willpower.getCurrent()
  }

  /**
   * Check if ego depleted
   */
  isDepleted(): boolean {
    return this.willpower.isDepleted()
  }
}

// ============================================================================
// Example: Decision-Making Scenario
// ============================================================================

export function demonstrateDecisionMaking(): void {
  const decisionSystem = new UnifiedDecisionSystem()

  // Scenario: Choose between options
  const options: DecisionOption[] = [
    {
      id: 'work-hard',
      description: 'Work hard on difficult project',
      expectedUtility: 0.8,
      risk: 0.3,
      effortRequired: 0.9,
      moralAlignment: 0.7,
    },
    {
      id: 'take-break',
      description: 'Take a relaxing break',
      expectedUtility: 0.3,
      risk: 0.1,
      effortRequired: 0.1,
      moralAlignment: 0.0,
    },
    {
      id: 'cheat',
      description: 'Cheat to get easy win',
      expectedUtility: 0.7,
      risk: 0.6,
      effortRequired: 0.3,
      moralAlignment: -0.8,
    },
  ]

  const emotion: EmotionVector = { valence: -0.3, arousal: 0.7, dominance: 0.4 }

  const hun: HunSoul[] = [
    {
      name: 'Zheng Zhong (正中)',
      function: 'Upright Center',
      strength: 0.8,
      purity: 0.9,
      heavenlyConnection: 0.7,
      signature: 'abc',
    },
  ]

  const po: PoSoul[] = [
    {
      name: 'Que Yin (雀陰)',
      function: 'Pleasure',
      strength: 0.6,
      viscosity: 0.5,
      earthlyConnection: 0.7,
      signature: 'def',
    },
  ]

  const decision = decisionSystem.decide(options, emotion, hun, po, 0.2, 10.0)

  console.log('\nDecision:')
  console.log('  Choice:', decision.choice.description)
  console.log('  Process:', decision.process)
  console.log('  Autonomy:', decision.autonomy.authenticity)
  console.log('  Willpower used:', decision.willpowerUsed)
  console.log('  Feeling free:', decisionSystem.feelFree())
}
