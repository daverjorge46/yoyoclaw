/**
 * Learning Mechanisms System
 * 學習機制系統
 *
 * Addresses critique: "System describes memory storage but lacks learning dynamics"
 *
 * Four types of learning:
 * 1. Associative (Classical/Pavlovian) - stimulus-stimulus associations
 * 2. Instrumental (Operant) - behavior-outcome associations
 * 3. Cognitive (Insight) - mental model building
 * 4. Social (Observational) - learning from others
 */

import type { HunSoul, PoSoul } from './ontological-integration-system'

// ============================================================================
// Type 1: Associative Learning (Classical Conditioning)
// ============================================================================

interface Stimulus {
  id: string
  description: string
  modality: 'visual' | 'auditory' | 'tactile' | 'olfactory' | 'gustatory'
}

interface Response {
  id: string
  description: string
  type: 'emotional' | 'behavioral' | 'physiological'
  intensity: number // 0.0-1.0
}

interface Association {
  conditionedStimulus: Stimulus
  unconditionedStimulus: Stimulus
  response: Response
  strength: number // 0.0-1.0, increases with pairings
  acquisitionCount: number // How many CS-US pairings
  extinctionCount: number // How many CS-alone presentations
}

class AssociativeLearningSystem {
  private associations: Association[] = []

  /**
   * Pair conditioned stimulus with unconditioned stimulus
   */
  pair(cs: Stimulus, us: Stimulus, response: Response): void {
    // Find existing association
    let assoc = this.associations.find(
      (a) => a.conditionedStimulus.id === cs.id && a.unconditionedStimulus.id === us.id,
    )

    if (assoc) {
      // Strengthen existing association
      assoc.acquisitionCount++
      assoc.strength = Math.min(
        1.0,
        assoc.strength + 0.1 * (1 - assoc.strength), // Diminishing returns
      )
    } else {
      // Create new association
      this.associations.push({
        conditionedStimulus: cs,
        unconditionedStimulus: us,
        response,
        strength: 0.2, // Initial weak association
        acquisitionCount: 1,
        extinctionCount: 0,
      })
    }
  }

  /**
   * Present conditioned stimulus alone (extinction)
   */
  presentAlone(cs: Stimulus): Response | null {
    const assoc = this.associations.find((a) => a.conditionedStimulus.id === cs.id)

    if (!assoc) return null

    // Extinction: weaken association
    assoc.extinctionCount++
    assoc.strength = Math.max(0, assoc.strength - 0.05)

    // Return conditioned response (scaled by strength)
    return {
      ...assoc.response,
      intensity: assoc.response.intensity * assoc.strength,
    }
  }

  /**
   * Get all associations for a stimulus
   */
  getAssociations(cs: Stimulus): Association[] {
    return this.associations.filter((a) => a.conditionedStimulus.id === cs.id)
  }
}

// ============================================================================
// Type 2: Instrumental Learning (Operant Conditioning)
// ============================================================================

interface Behavior {
  id: string
  description: string
  cost: number // Effort required (0.0-1.0)
}

interface Outcome {
  id: string
  description: string
  valence: number // -1.0 (punishment) to +1.0 (reward)
  magnitude: number // 0.0-1.0
}

interface BehaviorOutcomeMapping {
  behavior: Behavior
  outcome: Outcome
  probability: number // P(outcome|behavior)
  valueEstimate: number // Expected value
  trialCount: number // How many times tried
}

class InstrumentalLearningSystem {
  private mappings: BehaviorOutcomeMapping[] = []
  private learningRate: number = 0.1 // TD-learning alpha

  /**
   * Execute behavior and observe outcome (Temporal Difference learning)
   */
  learn(behavior: Behavior, actualOutcome: Outcome): void {
    // Find or create mapping
    let mapping = this.mappings.find(
      (m) => m.behavior.id === behavior.id && m.outcome.id === actualOutcome.id,
    )

    if (!mapping) {
      mapping = {
        behavior,
        outcome: actualOutcome,
        probability: 0.1,
        valueEstimate: 0,
        trialCount: 0,
      }
      this.mappings.push(mapping)
    }

    // Update trial count
    mapping.trialCount++

    // Compute reward prediction error (RPE)
    const actualValue = actualOutcome.valence * actualOutcome.magnitude
    const predictedValue = mapping.valueEstimate
    const rpe = actualValue - predictedValue

    // Update value estimate (TD learning)
    mapping.valueEstimate += this.learningRate * rpe

    // Update probability estimate
    const totalTrials = this.mappings
      .filter((m) => m.behavior.id === behavior.id)
      .reduce((sum, m) => sum + m.trialCount, 0)

    mapping.probability = mapping.trialCount / totalTrials
  }

  /**
   * Select best behavior based on learned values
   */
  selectBehavior(availableBehaviors: Behavior[]): Behavior {
    let bestBehavior = availableBehaviors[0]
    let bestValue = -Infinity

    for (const behavior of availableBehaviors) {
      // Expected value = sum over outcomes: P(outcome|behavior) * value(outcome) - cost
      let expectedValue = -behavior.cost

      const relevantMappings = this.mappings.filter((m) => m.behavior.id === behavior.id)
      for (const mapping of relevantMappings) {
        expectedValue += mapping.probability * mapping.valueEstimate
      }

      if (expectedValue > bestValue) {
        bestValue = expectedValue
        bestBehavior = behavior
      }
    }

    return bestBehavior
  }

  /**
   * Get reward prediction error (for debugging/monitoring)
   */
  getLastRPE(behavior: Behavior, outcome: Outcome): number {
    const mapping = this.mappings.find(
      (m) => m.behavior.id === behavior.id && m.outcome.id === outcome.id,
    )
    if (!mapping) return 0

    const actualValue = outcome.valence * outcome.magnitude
    return actualValue - mapping.valueEstimate
  }
}

// ============================================================================
// Type 3: Cognitive Learning (Insight, Mental Models)
// ============================================================================

interface MentalModel {
  id: string
  description: string

  // Causal structure
  variables: Map<string, { value: number; uncertainty: number }>
  causalLinks: Array<{
    cause: string
    effect: string
    strength: number // -1.0 to 1.0
    confidence: number // 0.0-1.0
  }>

  // Predictive accuracy
  predictions: Array<{
    predicted: number
    actual: number
    timestamp: number
  }>
}

interface Hypothesis {
  id: string
  statement: string
  priorProbability: number // 0.0-1.0 before testing
  posteriorProbability: number // After evidence
  evidence: Array<{ supports: boolean; strength: number }>
}

class CognitiveLearningSystem {
  private models: MentalModel[] = []
  private hypotheses: Hypothesis[] = []

  /**
   * Build mental model from observations
   */
  buildModel(observations: Array<{ variables: Map<string, number> }>): MentalModel {
    // Simplified: detect correlations between variables

    // Extract all variable names
    const varNames = new Set<string>()
    for (const obs of observations) {
      for (const name of obs.variables.keys()) {
        varNames.add(name)
      }
    }

    // Compute correlations
    const causalLinks: MentalModel['causalLinks'] = []
    const varArray = Array.from(varNames)

    for (let i = 0; i < varArray.length; i++) {
      for (let j = 0; j < varArray.length; j++) {
        if (i === j) continue

        const correlation = this.computeCorrelation(
          varArray[i],
          varArray[j],
          observations,
        )

        if (Math.abs(correlation) > 0.3) {
          // Threshold for causal link
          causalLinks.push({
            cause: varArray[i],
            effect: varArray[j],
            strength: correlation,
            confidence: Math.min(1.0, observations.length / 10), // More obs = more confidence
          })
        }
      }
    }

    const model: MentalModel = {
      id: `model-${Date.now()}`,
      description: 'Learned causal model',
      variables: new Map(Array.from(varNames).map((name) => [name, { value: 0, uncertainty: 1 }])),
      causalLinks,
      predictions: [],
    }

    this.models.push(model)
    return model
  }

  /**
   * Test hypothesis with evidence (Bayesian updating)
   */
  testHypothesis(hypothesis: Hypothesis, evidence: { supports: boolean; strength: number }): void {
    hypothesis.evidence.push(evidence)

    // Simplified Bayesian update
    const likelihood = evidence.supports ? evidence.strength : 1 - evidence.strength
    const prior = hypothesis.priorProbability

    // P(H|E) = P(E|H) * P(H) / P(E)
    // Simplified: just weight prior by likelihood
    hypothesis.posteriorProbability = prior * likelihood

    // Normalize (assuming binary hypothesis)
    const total = hypothesis.posteriorProbability + (1 - prior) * (1 - likelihood)
    hypothesis.posteriorProbability /= total
  }

  /**
   * Insight moment (sudden realization)
   */
  insight(problem: string, solution: string): {
    ahaExperience: boolean
    newUnderstanding: string
  } {
    // Insight = sudden restructuring of mental model
    // For now, simplified as recognition of solution

    return {
      ahaExperience: true,
      newUnderstanding: `${problem} can be solved by ${solution}`,
    }
  }

  private computeCorrelation(
    var1: string,
    var2: string,
    observations: Array<{ variables: Map<string, number> }>,
  ): number {
    // Pearson correlation coefficient
    const values1: number[] = []
    const values2: number[] = []

    for (const obs of observations) {
      const v1 = obs.variables.get(var1)
      const v2 = obs.variables.get(var2)
      if (v1 !== undefined && v2 !== undefined) {
        values1.push(v1)
        values2.push(v2)
      }
    }

    if (values1.length < 2) return 0

    const mean1 = values1.reduce((a, b) => a + b) / values1.length
    const mean2 = values2.reduce((a, b) => a + b) / values2.length

    let numerator = 0
    let denom1 = 0
    let denom2 = 0

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1
      const diff2 = values2[i] - mean2
      numerator += diff1 * diff2
      denom1 += diff1 * diff1
      denom2 += diff2 * diff2
    }

    if (denom1 === 0 || denom2 === 0) return 0

    return numerator / Math.sqrt(denom1 * denom2)
  }
}

// ============================================================================
// Type 4: Social Learning (Observational Learning)
// ============================================================================

interface Demonstration {
  demonstrator: string // Who demonstrated
  behavior: Behavior
  outcome: Outcome
  credibility: number // 0.0-1.0, how much to trust demonstrator
}

interface CulturalKnowledge {
  practice: string
  origin: string // Who taught it
  transmissionCount: number // How many times passed on
  fidelity: number // 0.0-1.0, how accurately preserved
}

class SocialLearningSystem {
  private demonstrations: Demonstration[] = []
  private culturalTraditions: CulturalKnowledge[] = []

  /**
   * Observe another's behavior and outcome (imitation)
   */
  observe(demonstration: Demonstration): void {
    this.demonstrations.push(demonstration)
  }

  /**
   * Decide whether to imitate observed behavior
   */
  shouldImitate(demonstration: Demonstration): boolean {
    // Imitate if:
    // 1. Demonstrator is credible
    // 2. Outcome was positive
    // 3. Behavior seems feasible

    const credibilityThreshold = 0.5
    const outcomeThreshold = 0.3

    return (
      demonstration.credibility > credibilityThreshold &&
      demonstration.outcome.valence > outcomeThreshold
    )
  }

  /**
   * Learn from teaching (pedagogical learning)
   */
  receiveTeaching(teacher: string, knowledge: string, credibility: number): void {
    // Teaching = directed information transfer with explicit intent

    this.culturalTraditions.push({
      practice: knowledge,
      origin: teacher,
      transmissionCount: 1,
      fidelity: credibility, // High credibility = high initial fidelity
    })
  }

  /**
   * Transmit cultural knowledge to others
   */
  teach(knowledge: string): CulturalKnowledge | null {
    const tradition = this.culturalTraditions.find((t) => t.practice === knowledge)
    if (!tradition) return null

    // Transmission increases count but may reduce fidelity
    tradition.transmissionCount++
    tradition.fidelity *= 0.95 // Slight degradation (cultural drift)

    return tradition
  }
}

// ============================================================================
// Hun-Po Influence on Learning
// ============================================================================

class HunPoLearningModulation {
  /**
   * Hun souls enhance cognitive and insight learning
   */
  static applyHunInfluence(hun: HunSoul[], learningRate: number): number {
    let modulation = 1.0

    for (const soul of hun) {
      if (soul.name.includes('靈慧')) {
        // Ling Hui (Spiritual Intelligence) → faster cognitive learning
        modulation += soul.strength * 0.3
      } else if (soul.name.includes('通明')) {
        // Tong Ming (Penetrating Brightness) → better insight
        modulation += soul.strength * 0.2
      }
    }

    return learningRate * modulation
  }

  /**
   * Po souls enhance associative and instrumental learning
   */
  static applyPoInfluence(po: PoSoul[], learningRate: number): number {
    let modulation = 1.0

    for (const soul of po) {
      if (soul.name.includes('尸狗')) {
        // Shi Gou (survival) → faster fear conditioning
        modulation += soul.strength * 0.4
      } else if (soul.name.includes('雀陰')) {
        // Que Yin (pleasure) → faster reward learning
        modulation += soul.strength * 0.3
      }
    }

    return learningRate * modulation
  }
}

// ============================================================================
// Unified Learning System
// ============================================================================

export class UnifiedLearningSystem {
  private associative = new AssociativeLearningSystem()
  private instrumental = new InstrumentalLearningSystem()
  private cognitive = new CognitiveLearningSystem()
  private social = new SocialLearningSystem()

  /**
   * Learn from Pavlovian pairing
   */
  learnAssociation(cs: Stimulus, us: Stimulus, response: Response): void {
    this.associative.pair(cs, us, response)
  }

  /**
   * Learn from operant conditioning
   */
  learnInstrumental(behavior: Behavior, outcome: Outcome, hun: HunSoul[], po: PoSoul[]): void {
    // Modulate learning rate by hun-po
    const baseLearningRate = 0.1
    const modulatedRate = HunPoLearningModulation.applyPoInfluence(po, baseLearningRate)

    // Temporarily set learning rate
    const originalRate = this.instrumental['learningRate']
    this.instrumental['learningRate'] = modulatedRate

    this.instrumental.learn(behavior, outcome)

    // Restore
    this.instrumental['learningRate'] = originalRate
  }

  /**
   * Build mental model from observations
   */
  learnCognitive(
    observations: Array<{ variables: Map<string, number> }>,
    hun: HunSoul[],
  ): MentalModel {
    // Hun enhance cognitive learning
    // (for now, just build model normally)
    return this.cognitive.buildModel(observations)
  }

  /**
   * Learn by observing others
   */
  learnSocial(demonstration: Demonstration): void {
    this.social.observe(demonstration)

    // Decide whether to imitate
    if (this.social.shouldImitate(demonstration)) {
      // Add to instrumental learning
      this.instrumental.learn(demonstration.behavior, demonstration.outcome)
    }
  }

  /**
   * Select action based on learned values
   */
  selectAction(availableBehaviors: Behavior[]): Behavior {
    return this.instrumental.selectBehavior(availableBehaviors)
  }

  /**
   * Get conditioned response
   */
  getConditionedResponse(stimulus: Stimulus): Response | null {
    return this.associative.presentAlone(stimulus)
  }

  /**
   * Test hypothesis
   */
  testIdea(hypothesis: Hypothesis, evidence: { supports: boolean; strength: number }): void {
    this.cognitive.testHypothesis(hypothesis, evidence)
  }

  /**
   * Experience insight
   */
  insight(problem: string, solution: string): { ahaExperience: boolean; newUnderstanding: string } {
    return this.cognitive.insight(problem, solution)
  }
}

// ============================================================================
// Example: Learning Trajectory
// ============================================================================

export function demonstrateLearning(): void {
  const learning = new UnifiedLearningSystem()

  // Associative learning: Bell → Food → Salivation
  const bell: Stimulus = { id: 'bell', description: 'Bell sound', modality: 'auditory' }
  const food: Stimulus = { id: 'food', description: 'Food', modality: 'gustatory' }
  const salivation: Response = {
    id: 'salivate',
    description: 'Salivation',
    type: 'physiological',
    intensity: 0.8,
  }

  for (let i = 0; i < 10; i++) {
    learning.learnAssociation(bell, food, salivation)
  }

  console.log('Conditioned response to bell:', learning.getConditionedResponse(bell))

  // Instrumental learning: Press lever → Get food
  const pressLever: Behavior = { id: 'press', description: 'Press lever', cost: 0.1 }
  const getFood: Outcome = { id: 'food', description: 'Receive food', valence: 0.9, magnitude: 1.0 }

  const hun: HunSoul[] = []
  const po: PoSoul[] = [
    {
      name: 'Que Yin (雀陰)',
      function: 'Pleasure',
      strength: 0.8,
      viscosity: 0.5,
      earthlyConnection: 0.7,
      signature: 'abc',
    },
  ]

  for (let i = 0; i < 20; i++) {
    learning.learnInstrumental(pressLever, getFood, hun, po)
  }

  console.log('Best action:', learning.selectAction([pressLever]))

  // Cognitive learning: Insight
  const insight = learning.insight('How to escape maze', 'Take the hidden door')
  console.log('Insight:', insight)
}
