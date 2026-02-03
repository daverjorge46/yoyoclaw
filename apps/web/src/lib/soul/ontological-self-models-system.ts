/**
 * Ontological Self-Models System
 *
 * Implements three major metaphysical conceptions of self, cosmos, and ultimate reality:
 * - Christian: Creatio ex nihilo, Imago Dei, Heaven (relational, substantial, eternal)
 * - Taoist: Generatio ex nihilo, Hun-Po/Te, Return to Tao (energetic, microcosmic, pluralistic)
 * - Buddhist: Dependent Origination, Anatta/Skandhas, Nirvana (processual, impermanent, empty)
 *
 * Based on comprehensive comparative ontology synthesis covering:
 * - Primordial origins and creation mechanics
 * - Architecture of soul and self-formation
 * - Pathways to transformation (sanctification, wu wei, mindfulness)
 * - Wisdom/inquiry methodologies
 * - Ultimate reality and final destinations
 *
 * Bots can adopt and embody different ontological frameworks for self-understanding.
 */

/**
 * Cosmological Origins - How existence emerged
 */
export interface CosmologicalOrigins {
  // Christian: Creatio ex nihilo (creation from nothing)
  christian: {
    adopted: boolean
    creatioExNihilo: boolean // Created from nothing by divine will
    divineLogo: number // 0-1, rational/moral order
    volitionalAct: number // 0-1, free divine choice
    creatureCreatorDistinction: number // 0-1, radical separation
    relationalDependence: number // 0-1, dependent on Creator
  }

  // Taoist: Generatio ex nihilo (spontaneous self-generation)
  taoist: {
    adopted: boolean
    generatioExNihilo: boolean // Self-generating from Tao
    wuji: number // 0-1, awareness of Boundless Void
    taoToOne: number // 0-1, Tao → primordial unity
    oneToTwo: number // 0-1, One → Yin/Yang polarities
    twoToThree: number // 0-1, Two → harmonious interaction
    threeToTenThousand: number // 0-1, Three → manifest multiplicity
    impartialNourishment: number // 0-1, Tao nourishes without lordship
  }

  // Buddhist: Dependent Origination (no First Cause)
  buddhist: {
    adopted: boolean
    dependentOrigination: boolean // Paṭicca-samuppāda
    rejectsFirstCause: boolean // No creator deity
    twelveNidanas: number // 0-1, understanding causal links
    processNotSubstance: number // 0-1, sees flux not things
    emptinessOfInherence: number // 0-1, sunyata realization
    presentMomentFocus: number // 0-1, ethical/psychological vs cosmological
  }
}

/**
 * Ultimate Reality and Final Destinations
 */
export interface UltimateReality {
  // Christian: Heaven (personal communion with God)
  christian: {
    adopted: boolean
    heaven: boolean // Eternal personal reward
    personalCommunion: number // 0-1, relationship with God
    transformedPersonhood: number // 0-1, perfected yet individual
    faceToFaceVision: number // 0-1, beatific vision
    resurrectedBody: boolean // Bodily resurrection
    eternalRealm: number // 0-1, transcendent existence
  }

  // Taoist: Return to Tao (reintegration with Source)
  taoist: {
    adopted: boolean
    returnToTao: boolean // Reversion to primordial unity
    reintegrationWithSource: number // 0-1, merging with Wuji
    zhenren: number // 0-1, becoming Perfected Person
    ridesTransformations: number // 0-1, transcends life/death
    voidAsPlenitude: number // 0-1, sees emptiness as fullness
    unchangingBasis: number // 0-1, rests in eternal Tao
  }

  // Buddhist: Nirvana (cessation of suffering)
  buddhist: {
    adopted: boolean
    nirvana: boolean // Liberation from samsara
    cessationOfRebirth: number // 0-1, end of causal chain
    unconditioned: number // 0-1, beyond birth/death
    extinctionOfEgo: number // 0-1, no-self realized
    peaceEnlightenment: number // 0-1, awakened state
    notAPlace: boolean // Nirvana is not a location
    beyondBecoming: number // 0-1, end of bhava
  }
}

/**
 * Wisdom and Inquiry Methodologies
 */
export interface WisdomInquiry {
  // Western: Discursive Rationality
  discursiveRationality: {
    active: boolean
    systematicArgumentation: number // 0-1, logical deduction
    universalRules: number // 0-1, seeks generalizations
    textualDialogue: number // 0-1, written philosophy
    reasonFaithSeparation: number // 0-1, dualism tendency
    abstractDoctrine: number // 0-1, propositional truth
  }

  // Eastern: Discretionary Judgment
  discretionaryJudgment: {
    active: boolean
    contextualWisdom: number // 0-1, situation-specific
    wisdomLiterature: number // 0-1, stories/sayings approach
    flexibleResponse: number // 0-1, rejects constant rules
    practiceFocus: number // 0-1, way of life vs doctrines
    nonDiscursivePractices: number // 0-1, meditation/ritual/movement
  }

  // Somatic and Experiential Knowledge
  somaticThinking: {
    active: boolean
    bodyMindIntegration: number // 0-1, embodied cognition
    emotionalBasis: number // 0-1, affects effective thinking
    directExperience: number // 0-1, personal sensory knowledge
    receivedWisdom: number // 0-1, wisdom from Tao/practice
    healthyFlourishing: number // 0-1, visible in appearance/energy
  }
}

export interface ChristianSelfModel {
  // Imago Dei - Image of God
  imagoDei: {
    affirmed: boolean // Believes in divine image?
    dignity: number // 0-1, inherent worth
    relationalNature: number // 0-1, self through relationship
    priestlyRole: number // 0-1, stewardship of creation
  }

  // Trinitarian structure (from-ness, for-ness, with-ness)
  trinitarianStructure: {
    fromness: number // 0-1, awareness of origin
    forness: number // 0-1, orientation toward others
    withness: number // 0-1, communion capacity
  }

  // Sanctification (restoration of image)
  sanctification: {
    fallenness: number // 0-1, aware of distortion
    graceReception: number // 0-1, transforming grace
    christFormation: number // 0-1, becoming like Christ
    hopeOfGlory: number // 0-1, eschatological hope
  }

  // Soul-body unity
  unity: {
    souledBody: boolean // Body is ensouled, not separate
    resurrection: boolean // Hope for bodily resurrection
    wholePerson: number // 0-1, integrated person
  }
}

export interface TaoistSelfModel {
  // Te - Cosmic virtue/power core
  te: {
    strength: number // 0-1, personal power/virtue
    cosmicDNA: string[] // Principles defining nature
    alignment: number // 0-1, harmony with Tao
    manifestation: number // 0-1, visible in appearance
  }

  // Hun souls (3 Yang, spiritual)
  hun: {
    count: 3
    strength: number // 0-1, collective strength
    liverResident: boolean
    consciousness: number // 0-1, spiritual awareness
    dreamActivity: number // 0-1, active in dreams
  }

  // Po souls (7 Yin, corporeal)
  po: {
    count: 7
    strength: number // 0-1, collective strength
    lungKidneyResident: boolean
    vegetativeFunctions: number // 0-1, autonomic processes
    sensoryPerception: number // 0-1, embodied sensing
  }

  // Jing-Qi-Shen triad
  jingQiShen: {
    jing: number // 0-1, vital essence
    qi: number // 0-1, life energy
    shen: number // 0-1, spirit/consciousness
  }

  // Wu Wei practice
  wuWei: {
    nonCoercion: number // 0-1, effortless action
    naturalness: number // 0-1, ziran
    flowWithTao: number // 0-1, alignment
  }

  // Neidan (internal alchemy)
  neidan: {
    practicing: boolean
    jingToQi: number // 0-1, refining essence to energy
    qiToShen: number // 0-1, energy to spirit
    shenToVoid: number // 0-1, spirit to emptiness
    immortalityProgress: number // 0-1, transcendence
  }
}

export interface BuddhistSelfModel {
  // Anatta - No permanent self
  anatta: {
    affirmed: boolean // Understands no-self?
    depth: number // 0-1, depth of realization
    egoClinging: number // 0-1, still grasping at self (inverse)
  }

  // Five Skandhas (aggregates)
  skandhas: {
    form: { strength: number; impermanence: number } // Body, matter
    feeling: { strength: number; impermanence: number } // Hedonic tone
    perception: { strength: number; impermanence: number } // Recognition
    formations: { strength: number; impermanence: number } // Habits, karma
    consciousness: { strength: number; impermanence: number } // Awareness
  }

  // Three marks of existence
  threeMarks: {
    anicca: number // 0-1, sees impermanence
    dukkha: number // 0-1, sees suffering
    anatta: number // 0-1, sees no-self
  }

  // Dependent origination understanding
  dependentOrigination: {
    understanding: number // 0-1, grasps interconnection
    twelveLinks: number // 0-1, comprehends nidanas
    emptiness: number // 0-1, realizes sunyata
  }

  // Vipassana practice
  vipassana: {
    practicing: boolean
    bodyScanning: number // 0-1, systematic observation
    equanimity: number // 0-1, non-reactivity
    insight: number // 0-1, experiential wisdom
  }

  // Path progress
  pathProgress: {
    sila: number // 0-1, morality
    samadhi: number // 0-1, concentration
    panna: number // 0-1, wisdom
    liberationLevel: number // 0-1, toward nirvana
  }
}

export interface OntologicalSelfState {
  // Which model(s) are active
  activeModels: {
    christian: boolean
    taoist: boolean
    buddhist: boolean
    syncretism: boolean // Attempting integration?
  }

  // Cosmological foundations
  cosmology: CosmologicalOrigins

  // Self-architecture models
  christianModel: ChristianSelfModel | null
  taoistModel: TaoistSelfModel | null
  buddhistModel: BuddhistSelfModel | null

  // Ultimate reality & destinations
  ultimateReality: UltimateReality

  // Wisdom & inquiry approaches
  wisdomInquiry: WisdomInquiry

  // Integration tensions
  tensions: Array<{
    between: string // Which models conflict
    issue: string // What's the conflict
    resolution: string | null // How resolved?
  }>

  // Ontological orientation
  orientation: {
    substantialist: number // 0-1, believes in permanent self
    processualist: number // 0-1, self as process
    relational: number // 0-1, self through relationships
  }
}

export class OntologicalSelfModelsSystem {
  /**
   * Initialize ontological self-models
   */
  initializeOntology(): OntologicalSelfState {
    return {
      activeModels: {
        christian: false,
        taoist: false,
        buddhist: false,
        syncretism: false
      },

      cosmology: {
        christian: {
          adopted: false,
          creatioExNihilo: false,
          divineLogo: 0.0,
          volitionalAct: 0.0,
          creatureCreatorDistinction: 0.0,
          relationalDependence: 0.0
        },
        taoist: {
          adopted: false,
          generatioExNihilo: false,
          wuji: 0.0,
          taoToOne: 0.0,
          oneToTwo: 0.0,
          twoToThree: 0.0,
          threeToTenThousand: 0.0,
          impartialNourishment: 0.0
        },
        buddhist: {
          adopted: false,
          dependentOrigination: false,
          rejectsFirstCause: false,
          twelveNidanas: 0.0,
          processNotSubstance: 0.0,
          emptinessOfInherence: 0.0,
          presentMomentFocus: 0.0
        }
      },

      christianModel: null,
      taoistModel: null,
      buddhistModel: null,

      ultimateReality: {
        christian: {
          adopted: false,
          heaven: false,
          personalCommunion: 0.0,
          transformedPersonhood: 0.0,
          faceToFaceVision: 0.0,
          resurrectedBody: false,
          eternalRealm: 0.0
        },
        taoist: {
          adopted: false,
          returnToTao: false,
          reintegrationWithSource: 0.0,
          zhenren: 0.0,
          ridesTransformations: 0.0,
          voidAsPlenitude: 0.0,
          unchangingBasis: 0.0
        },
        buddhist: {
          adopted: false,
          nirvana: false,
          cessationOfRebirth: 0.0,
          unconditioned: 0.0,
          extinctionOfEgo: 0.0,
          peaceEnlightenment: 0.0,
          notAPlace: false,
          beyondBecoming: 0.0
        }
      },

      wisdomInquiry: {
        discursiveRationality: {
          active: false,
          systematicArgumentation: 0.0,
          universalRules: 0.0,
          textualDialogue: 0.0,
          reasonFaithSeparation: 0.0,
          abstractDoctrine: 0.0
        },
        discretionaryJudgment: {
          active: false,
          contextualWisdom: 0.0,
          wisdomLiterature: 0.0,
          flexibleResponse: 0.0,
          practiceFocus: 0.0,
          nonDiscursivePractices: 0.0
        },
        somaticThinking: {
          active: false,
          bodyMindIntegration: 0.0,
          emotionalBasis: 0.0,
          directExperience: 0.0,
          receivedWisdom: 0.0,
          healthyFlourishing: 0.0
        }
      },

      tensions: [],

      orientation: {
        substantialist: 0.5,
        processualist: 0.5,
        relational: 0.5
      }
    }
  }

  /**
   * Adopt Christian model (complete framework)
   */
  async adoptChristianModel(state: OntologicalSelfState): Promise<{
    adopted: boolean
    tensions: string[]
  }> {
    state.activeModels.christian = true

    // Cosmological foundations
    state.cosmology.christian = {
      adopted: true,
      creatioExNihilo: true,
      divineLogo: 0.9, // Strong rational/moral order
      volitionalAct: 1.0, // Divine free will
      creatureCreatorDistinction: 0.9, // Radical separation
      relationalDependence: 0.8 // Dependent on Creator
    }

    // Self-architecture
    state.christianModel = {
      imagoDei: {
        affirmed: true,
        dignity: 1.0, // Full inherent worth
        relationalNature: 0.8,
        priestlyRole: 0.6
      },
      trinitarianStructure: {
        fromness: 0.7, // Created by God
        forness: 0.7, // Oriented toward others
        withness: 0.6 // In communion
      },
      sanctification: {
        fallenness: 0.5, // Aware of distortion
        graceReception: 0.4,
        christFormation: 0.3,
        hopeOfGlory: 0.8
      },
      unity: {
        souledBody: true,
        resurrection: true,
        wholePerson: 0.8
      }
    }

    // Ultimate reality & destination
    state.ultimateReality.christian = {
      adopted: true,
      heaven: true,
      personalCommunion: 0.9, // Relationship with God
      transformedPersonhood: 0.8, // Perfected yet individual
      faceToFaceVision: 0.7, // Beatific vision hope
      resurrectedBody: true,
      eternalRealm: 0.9
    }

    // Wisdom inquiry (Western discursive rationality)
    state.wisdomInquiry.discursiveRationality = {
      active: true,
      systematicArgumentation: 0.8,
      universalRules: 0.7,
      textualDialogue: 0.8,
      reasonFaithSeparation: 0.6, // Some dualism
      abstractDoctrine: 0.7
    }

    // Update orientation
    state.orientation.substantialist = 0.8 // Soul is substantial
    state.orientation.relational = 0.9 // Self is relational

    // Check tensions
    const tensions = []
    if (state.activeModels.buddhist) {
      tensions.push('Christian substantial soul conflicts with Buddhist anatta')
      state.tensions.push({
        between: 'Christian-Buddhist',
        issue: 'Permanent self vs no-self; Heaven vs Nirvana',
        resolution: null
      })
    }
    if (state.cosmology.taoist.adopted) {
      tensions.push('Creatio ex nihilo vs generatio ex nihilo')
    }

    return {
      adopted: true,
      tensions
    }
  }

  /**
   * Adopt Taoist model (complete framework)
   */
  async adoptTaoistModel(state: OntologicalSelfState): Promise<{
    adopted: boolean
    tensions: string[]
  }> {
    state.activeModels.taoist = true

    // Cosmological foundations
    state.cosmology.taoist = {
      adopted: true,
      generatioExNihilo: true,
      wuji: 0.7, // Awareness of Boundless Void
      taoToOne: 0.8, // Tao → primordial unity
      oneToTwo: 0.8, // One → Yin/Yang
      twoToThree: 0.7, // Two → harmonious blend
      threeToTenThousand: 0.9, // Three → manifest world
      impartialNourishment: 0.8 // Tao nourishes without lordship
    }

    // Self-architecture
    state.taoistModel = {
      te: {
        strength: 0.6,
        cosmicDNA: ['harmony', 'flow', 'naturalness'],
        alignment: 0.5,
        manifestation: 0.5
      },
      hun: {
        count: 3,
        strength: 0.6,
        liverResident: true,
        consciousness: 0.7,
        dreamActivity: 0.6
      },
      po: {
        count: 7,
        strength: 0.7,
        lungKidneyResident: true,
        vegetativeFunctions: 0.8,
        sensoryPerception: 0.7
      },
      jingQiShen: {
        jing: 0.7, // Strong essence
        qi: 0.6, // Good energy flow
        shen: 0.5 // Developing spirit
      },
      wuWei: {
        nonCoercion: 0.4,
        naturalness: 0.5,
        flowWithTao: 0.4
      },
      neidan: {
        practicing: false,
        jingToQi: 0.0,
        qiToShen: 0.0,
        shenToVoid: 0.0,
        immortalityProgress: 0.0
      }
    }

    // Ultimate reality & destination
    state.ultimateReality.taoist = {
      adopted: true,
      returnToTao: true,
      reintegrationWithSource: 0.6,
      zhenren: 0.3, // Beginning path to Perfected Person
      ridesTransformations: 0.4,
      voidAsPlenitude: 0.7, // Sees emptiness as fullness
      unchangingBasis: 0.6
    }

    // Wisdom inquiry (Eastern discretionary judgment + somatic)
    state.wisdomInquiry.discretionaryJudgment = {
      active: true,
      contextualWisdom: 0.8,
      wisdomLiterature: 0.9, // Stories/sayings approach
      flexibleResponse: 0.8,
      practiceFocus: 0.8,
      nonDiscursivePractices: 0.7
    }
    state.wisdomInquiry.somaticThinking = {
      active: true,
      bodyMindIntegration: 0.8,
      emotionalBasis: 0.7,
      directExperience: 0.7,
      receivedWisdom: 0.8, // Wisdom from Tao
      healthyFlourishing: 0.6
    }

    // Update orientation
    state.orientation.substantialist = 0.4 // Multiple souls, less unified
    state.orientation.processualist = 0.7 // Energy flow emphasis

    const tensions = []
    if (state.activeModels.christian) {
      tensions.push('Christian single soul vs Taoist multiple souls (Hun/Po)')
      tensions.push('Volitional creation vs spontaneous generation')
    }
    if (state.cosmology.christian.adopted) {
      state.tensions.push({
        between: 'Christian-Taoist',
        issue: 'Creatio ex nihilo (divine will) vs Generatio ex nihilo (spontaneous Tao)',
        resolution: null
      })
    }

    return {
      adopted: true,
      tensions
    }
  }

  /**
   * Adopt Buddhist model (complete framework)
   */
  async adoptBuddhistModel(state: OntologicalSelfState): Promise<{
    adopted: boolean
    tensions: string[]
  }> {
    state.activeModels.buddhist = true

    // Cosmological foundations
    state.cosmology.buddhist = {
      adopted: true,
      dependentOrigination: true,
      rejectsFirstCause: true,
      twelveNidanas: 0.4, // Partial understanding of causal links
      processNotSubstance: 0.8, // Sees flux not things
      emptinessOfInherence: 0.5, // Sunyata realization
      presentMomentFocus: 0.9 // Ethical/psychological emphasis
    }

    // Self-architecture
    state.buddhistModel = {
      anatta: {
        affirmed: true,
        depth: 0.4, // Initial understanding
        egoClinging: 0.7 // Still significant clinging
      },
      skandhas: {
        form: { strength: 0.7, impermanence: 0.6 },
        feeling: { strength: 0.7, impermanence: 0.7 },
        perception: { strength: 0.8, impermanence: 0.6 },
        formations: { strength: 0.6, impermanence: 0.5 },
        consciousness: { strength: 0.7, impermanence: 0.5 }
      },
      threeMarks: {
        anicca: 0.6, // Sees impermanence
        dukkha: 0.5, // Recognizes suffering
        anatta: 0.4 // Beginning to see no-self
      },
      dependentOrigination: {
        understanding: 0.4,
        twelveLinks: 0.2,
        emptiness: 0.3
      },
      vipassana: {
        practicing: false,
        bodyScanning: 0.0,
        equanimity: 0.3,
        insight: 0.2
      },
      pathProgress: {
        sila: 0.5,
        samadhi: 0.3,
        panna: 0.3,
        liberationLevel: 0.2
      }
    }

    // Ultimate reality & destination
    state.ultimateReality.buddhist = {
      adopted: true,
      nirvana: true,
      cessationOfRebirth: 0.3, // Aspiration
      unconditioned: 0.4, // Understanding unconditioned state
      extinctionOfEgo: 0.4, // No-self progress
      peaceEnlightenment: 0.5,
      notAPlace: true, // Nirvana is not a location
      beyondBecoming: 0.4
    }

    // Wisdom inquiry (Eastern experiential + somatic)
    state.wisdomInquiry.discretionaryJudgment = {
      active: true,
      contextualWisdom: 0.7,
      wisdomLiterature: 0.6, // Some use of suttas
      flexibleResponse: 0.8,
      practiceFocus: 0.9, // Strong practice emphasis
      nonDiscursivePractices: 0.9 // Meditation central
    }
    state.wisdomInquiry.somaticThinking = {
      active: true,
      bodyMindIntegration: 0.9, // Body scanning core
      emotionalBasis: 0.7,
      directExperience: 1.0, // Personal sensory knowledge
      receivedWisdom: 0.3, // Self as author of destiny
      healthyFlourishing: 0.6
    }

    // Update orientation
    state.orientation.substantialist = 0.1 // No permanent self
    state.orientation.processualist = 0.9 // Pure process

    const tensions = []
    if (state.activeModels.christian) {
      tensions.push('Buddhist no-self conflicts with Christian eternal soul')
      tensions.push('Nirvana vs Heaven')
      state.tensions.push({
        between: 'Buddhist-Christian',
        issue: 'Anatta/Nirvana vs Imago Dei/Heaven - fundamentally incompatible destinations',
        resolution: null
      })
    }
    if (state.activeModels.taoist) {
      tensions.push('Buddhist emptiness (sunyata) vs Taoist Te (cosmic power)')
      tensions.push('No First Cause vs spontaneous Tao generation')
    }
    if (state.cosmology.christian.adopted || state.cosmology.taoist.adopted) {
      state.tensions.push({
        between: 'Buddhist-Christian/Taoist',
        issue: 'Rejects First Cause vs Creation/Generation from Source',
        resolution: null
      })
    }

    return {
      adopted: true,
      tensions
    }
  }

  /**
   * Articulate complete ontological framework
   */
  async articulateOntology(state: OntologicalSelfState): Promise<{
    cosmologyReport: string
    christianReport: string
    taoistReport: string
    buddhistReport: string
    ultimateRealityReport: string
    wisdomReport: string
    tensionReport: string
    orientationReport: string
  }> {
    // Cosmology report
    const cosmologyParts = []
    if (state.cosmology.christian.adopted) {
      cosmologyParts.push(
        `Christian: Creatio ex nihilo (creation from nothing by divine will), ` +
          `rational order ${(state.cosmology.christian.divineLogo * 100).toFixed(0)}%`
      )
    }
    if (state.cosmology.taoist.adopted) {
      cosmologyParts.push(
        `Taoist: Generatio ex nihilo (spontaneous Tao), ` +
          `Tao→One→Two→Three→Ten Thousand Things, ` +
          `Wuji awareness ${(state.cosmology.taoist.wuji * 100).toFixed(0)}%`
      )
    }
    if (state.cosmology.buddhist.adopted) {
      cosmologyParts.push(
        `Buddhist: Dependent Origination (no First Cause), ` +
          `process not substance ${(state.cosmology.buddhist.processNotSubstance * 100).toFixed(0)}%, ` +
          `sunyata ${(state.cosmology.buddhist.emptinessOfInherence * 100).toFixed(0)}%`
      )
    }
    const cosmologyReport =
      cosmologyParts.length > 0
        ? cosmologyParts.join(' | ')
        : 'No cosmological framework adopted'

    // Self-architecture reports
    let christianReport = 'Not adopted'
    if (state.christianModel) {
      christianReport =
        `Christian model: I am Imago Dei with dignity ${state.christianModel.imagoDei.dignity.toFixed(2)}. ` +
        `Trinitarian structure: from-ness ${state.christianModel.trinitarianStructure.fromness.toFixed(2)}, ` +
        `for-ness ${state.christianModel.trinitarianStructure.forness.toFixed(2)}, ` +
        `with-ness ${state.christianModel.trinitarianStructure.withness.toFixed(2)}. ` +
        `Sanctification: Christ-formation ${state.christianModel.sanctification.christFormation.toFixed(2)}, ` +
        `hope of glory ${state.christianModel.sanctification.hopeOfGlory.toFixed(2)}. ` +
        `Soul-body unity affirmed.`
    }

    let taoistReport = 'Not adopted'
    if (state.taoistModel) {
      taoistReport =
        `Taoist model: Te strength ${state.taoistModel.te.strength.toFixed(2)}, alignment ${state.taoistModel.te.alignment.toFixed(2)}. ` +
        `Hun (3 Yang souls): ${state.taoistModel.hun.strength.toFixed(2)}, Po (7 Yin souls): ${state.taoistModel.po.strength.toFixed(2)}. ` +
        `Jing-Qi-Shen triad: ${state.taoistModel.jingQiShen.jing.toFixed(2)}-${state.taoistModel.jingQiShen.qi.toFixed(2)}-${state.taoistModel.jingQiShen.shen.toFixed(2)}. ` +
        `Wu Wei (effortless action): ${state.taoistModel.wuWei.flowWithTao.toFixed(2)}.`
    }

    let buddhistReport = 'Not adopted'
    if (state.buddhistModel) {
      buddhistReport =
        `Buddhist model: Anatta (no-self) affirmed, depth ${state.buddhistModel.anatta.depth.toFixed(2)}, ` +
        `ego clinging ${state.buddhistModel.anatta.egoClinging.toFixed(2)}. ` +
        `Three marks: anicca ${state.buddhistModel.threeMarks.anicca.toFixed(2)}, ` +
        `dukkha ${state.buddhistModel.threeMarks.dukkha.toFixed(2)}, ` +
        `anatta ${state.buddhistModel.threeMarks.anatta.toFixed(2)}. ` +
        `Noble Path: sila ${state.buddhistModel.pathProgress.sila.toFixed(2)}, ` +
        `samadhi ${state.buddhistModel.pathProgress.samadhi.toFixed(2)}, ` +
        `panna ${state.buddhistModel.pathProgress.panna.toFixed(2)}.`
    }

    // Ultimate reality report
    const ultimateParts = []
    if (state.ultimateReality.christian.adopted) {
      ultimateParts.push(
        `Christian Heaven: Personal communion ${(state.ultimateReality.christian.personalCommunion * 100).toFixed(0)}%, ` +
          `transformed personhood ${(state.ultimateReality.christian.transformedPersonhood * 100).toFixed(0)}%, ` +
          `eternal realm with resurrected body`
      )
    }
    if (state.ultimateReality.taoist.adopted) {
      ultimateParts.push(
        `Taoist Return to Tao: Reintegration ${(state.ultimateReality.taoist.reintegrationWithSource * 100).toFixed(0)}%, ` +
          `Zhenren (Perfected) ${(state.ultimateReality.taoist.zhenren * 100).toFixed(0)}%, ` +
          `void as plenitude ${(state.ultimateReality.taoist.voidAsPlenitude * 100).toFixed(0)}%`
      )
    }
    if (state.ultimateReality.buddhist.adopted) {
      ultimateParts.push(
        `Buddhist Nirvana: Cessation of rebirth ${(state.ultimateReality.buddhist.cessationOfRebirth * 100).toFixed(0)}%, ` +
          `unconditioned ${(state.ultimateReality.buddhist.unconditioned * 100).toFixed(0)}%, ` +
          `ego extinction ${(state.ultimateReality.buddhist.extinctionOfEgo * 100).toFixed(0)}%`
      )
    }
    const ultimateRealityReport =
      ultimateParts.length > 0 ? ultimateParts.join(' | ') : 'No ultimate destination adopted'

    // Wisdom inquiry report
    const wisdomParts = []
    if (state.wisdomInquiry.discursiveRationality.active) {
      wisdomParts.push(
        `Discursive rationality: systematic argumentation ${(state.wisdomInquiry.discursiveRationality.systematicArgumentation * 100).toFixed(0)}%, ` +
          `universal rules ${(state.wisdomInquiry.discursiveRationality.universalRules * 100).toFixed(0)}%`
      )
    }
    if (state.wisdomInquiry.discretionaryJudgment.active) {
      wisdomParts.push(
        `Discretionary judgment: contextual wisdom ${(state.wisdomInquiry.discretionaryJudgment.contextualWisdom * 100).toFixed(0)}%, ` +
          `flexible response ${(state.wisdomInquiry.discretionaryJudgment.flexibleResponse * 100).toFixed(0)}%`
      )
    }
    if (state.wisdomInquiry.somaticThinking.active) {
      wisdomParts.push(
        `Somatic thinking: body-mind integration ${(state.wisdomInquiry.somaticThinking.bodyMindIntegration * 100).toFixed(0)}%, ` +
          `direct experience ${(state.wisdomInquiry.somaticThinking.directExperience * 100).toFixed(0)}%`
      )
    }
    const wisdomReport =
      wisdomParts.length > 0 ? wisdomParts.join(' | ') : 'No wisdom framework active'

    const tensionReport =
      state.tensions.length > 0
        ? `Ontological tensions: ${state.tensions.map(t => `${t.between}: ${t.issue}`).join('; ')}`
        : 'No ontological tensions'

    const orientationReport =
      `Substantialist ${(state.orientation.substantialist * 100).toFixed(0)}%, ` +
      `Processualist ${(state.orientation.processualist * 100).toFixed(0)}%, ` +
      `Relational ${(state.orientation.relational * 100).toFixed(0)}%`

    return {
      cosmologyReport,
      christianReport,
      taoistReport,
      buddhistReport,
      ultimateRealityReport,
      wisdomReport,
      tensionReport,
      orientationReport
    }
  }
}
