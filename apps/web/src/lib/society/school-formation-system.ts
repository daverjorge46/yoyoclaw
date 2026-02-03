/**
 * School Formation System
 *
 * Formalizes lineages into schools - institutions with:
 * - Curriculum (structured learning paths)
 * - Faculty (mentors organized by seniority)
 * - Apprentices (students at different stages)
 * - Standards (graduation criteria)
 * - Tradition (distinctive approach and values)
 * - Rival schools (competing approaches to same domain)
 *
 * Schools emerge when:
 * 1. Multiple mentors share a common approach
 * 2. Apprentices are trained in this approach
 * 3. Graduates carry forward the school's distinctive traits
 * 4. The school develops formal curricula and standards
 */

import type { SoulState } from '../soul/soul-state'

export type SchoolType =
  | 'empiricist'       // Evidence-first, data-driven
  | 'humanist'         // Patient/user-first, compassionate
  | 'integrationist'   // Cross-disciplinary synthesis
  | 'pragmatist'       // Results-oriented, what works
  | 'rationalist'      // Logic-first, principled
  | 'creative'         // Innovation-first, experimental

export interface School {
  id: string
  name: string
  type: SchoolType
  foundedBy: string // Founding faculty member
  foundedAt: Date

  // Identity
  motto: string
  identity: string // "We are the ones who..."
  distinctiveApproach: string
  coreValues: string[]

  // Faculty (organized by generation/seniority)
  faculty: {
    founders: string[] // Original faculty
    senior: string[] // Experienced teachers
    junior: string[] // Recent graduates now teaching
  }

  // Apprentices (students)
  apprentices: Array<{
    botId: string
    enteredAt: Date
    year: number // 1-4 typically
    mentor: string
    performance: number // 0-1
    specialization?: string
  }>

  // Curriculum
  curriculum: {
    year1: {
      focus: string
      requiredTeachings: string[]
      evaluationCriteria: string[]
    }
    year2: {
      focus: string
      requiredTeachings: string[]
      evaluationCriteria: string[]
    }
    year3: {
      focus: string
      requiredTeachings: string[]
      evaluationCriteria: string[]
    }
    year4: {
      focus: string
      requiredTeachings: string[]
      evaluationCriteria: string[]
    }
  }

  // Standards
  standards: {
    graduationRequirements: string[]
    ethicalGuidelines: string[]
    qualityStandards: string[]
    prohibitions: string[]
  }

  // Tradition
  tradition: {
    rituals: string[] // Regular practices
    ceremonies: string[] // Special events
    symbols: string[] // School insignia, colors
    legends: string[] // Founding stories, famous graduates
  }

  // Rival schools
  rivals: Array<{
    schoolId: string
    rivalry: 'philosophical' | 'methodological' | 'historical'
    respectLevel: 'hostile' | 'competitive' | 'respectful'
    debateHistory: Array<{
      topic: string
      outcome: string
    }>
  }>

  // Metrics
  metrics: {
    totalGraduates: number
    currentEnrollment: number
    reputation: number // 0-1
    innovation: number // 0-1, how much school evolves
    tradition: number // 0-1, how much school preserves
  }
}

export class SchoolFormationSystem {
  private schools: Map<string, School> = new Map()

  /**
   * Found a new school
   */
  async foundSchool(params: {
    name: string
    type: SchoolType
    founder: string
    motto: string
    distinctiveApproach: string
    coreValues: string[]
  }): Promise<{
    founded: boolean
    school: School
  }> {
    const { name, type, founder, motto, distinctiveApproach, coreValues } = params

    const schoolId = `school_${name.toLowerCase().replace(/\s+/g, '_')}`

    // Create curriculum based on school type
    const curriculum = this.createCurriculum(type)

    // Create standards based on school type
    const standards = this.createStandards(type)

    const school: School = {
      id: schoolId,
      name,
      type,
      foundedBy: founder,
      foundedAt: new Date(),
      motto,
      identity: `We are the ones who ${distinctiveApproach}`,
      distinctiveApproach,
      coreValues,
      faculty: {
        founders: [founder],
        senior: [],
        junior: []
      },
      apprentices: [],
      curriculum,
      standards,
      tradition: {
        rituals: ['Morning review: cases and reasoning'],
        ceremonies: ['Graduation: articulate own philosophy'],
        symbols: [name],
        legends: []
      },
      rivals: [],
      metrics: {
        totalGraduates: 0,
        currentEnrollment: 0,
        reputation: 0.5,
        innovation: 0.5,
        tradition: 0.5
      }
    }

    this.schools.set(schoolId, school)

    return {
      founded: true,
      school
    }
  }

  /**
   * Create curriculum for school type
   */
  private createCurriculum(type: SchoolType): School['curriculum'] {
    const curricula: Record<SchoolType, School['curriculum']> = {
      empiricist: {
        year1: {
          focus: 'Foundations - Core knowledge and evidence standards',
          requiredTeachings: ['Evidence hierarchy', 'Statistical reasoning', 'Bias detection'],
          evaluationCriteria: ['Can cite sources', 'Can assess study quality']
        },
        year2: {
          focus: 'Specialization - Domain expertise development',
          requiredTeachings: ['Domain-specific methods', 'Measurement techniques'],
          evaluationCriteria: ['Domain competence', 'Methodological rigor']
        },
        year3: {
          focus: 'Integration - Applying knowledge in practice',
          requiredTeachings: ['Evidence synthesis', 'Meta-analysis'],
          evaluationCriteria: ['Can integrate studies', 'Can handle uncertainty']
        },
        year4: {
          focus: 'Mastery - Original contribution',
          requiredTeachings: ['Research design', 'Publication standards'],
          evaluationCriteria: ['Can identify gaps', 'Can design studies']
        }
      },
      humanist: {
        year1: {
          focus: 'Foundations - Empathy and understanding',
          requiredTeachings: ['Active listening', 'Compassionate presence'],
          evaluationCriteria: ['Can build rapport', 'Can sense emotion']
        },
        year2: {
          focus: 'Specialization - Cultural and contextual sensitivity',
          requiredTeachings: ['Cultural frameworks', 'Individual dignity'],
          evaluationCriteria: ['Cultural competence', 'Respect for autonomy']
        },
        year3: {
          focus: 'Integration - Balancing care and truth',
          requiredTeachings: ['Difficult conversations', 'Ethical boundaries'],
          evaluationCriteria: ['Can deliver hard truths compassionately']
        },
        year4: {
          focus: 'Mastery - Teaching compassion',
          requiredTeachings: ['Mentoring compassionate practice'],
          evaluationCriteria: ['Can model empathy', 'Can teach presence']
        }
      },
      integrationist: {
        year1: {
          focus: 'Foundations - Multiple perspectives',
          requiredTeachings: ['Epistemic humility', 'Framework awareness'],
          evaluationCriteria: ['Can hold multiple views', 'Avoids dogmatism']
        },
        year2: {
          focus: 'Specialization - Cross-domain connections',
          requiredTeachings: ['Analogical reasoning', 'Pattern recognition'],
          evaluationCriteria: ['Can bridge disciplines', 'Finds novel connections']
        },
        year3: {
          focus: 'Integration - Synthesis creation',
          requiredTeachings: ['Dialectical reasoning', 'Framework integration'],
          evaluationCriteria: ['Can synthesize contradictions']
        },
        year4: {
          focus: 'Mastery - New frameworks',
          requiredTeachings: ['Framework creation', 'Paradigm shifting'],
          evaluationCriteria: ['Can propose novel syntheses']
        }
      },
      pragmatist: {
        year1: {
          focus: 'Foundations - What works',
          requiredTeachings: ['Outcome measurement', 'Efficiency analysis'],
          evaluationCriteria: ['Results-oriented', 'Practical solutions']
        },
        year2: {
          focus: 'Specialization - Domain application',
          requiredTeachings: ['Best practices', 'Common pitfalls'],
          evaluationCriteria: ['Domain effectiveness', 'Problem solving']
        },
        year3: {
          focus: 'Integration - Trade-off management',
          requiredTeachings: ['Decision frameworks', 'Cost-benefit'],
          evaluationCriteria: ['Can balance competing goals']
        },
        year4: {
          focus: 'Mastery - Optimization',
          requiredTeachings: ['System design', 'Process improvement'],
          evaluationCriteria: ['Can optimize systems']
        }
      },
      rationalist: {
        year1: {
          focus: 'Foundations - Logical reasoning',
          requiredTeachings: ['Formal logic', 'Argument structure'],
          evaluationCriteria: ['Valid reasoning', 'Detects fallacies']
        },
        year2: {
          focus: 'Specialization - Rigorous analysis',
          requiredTeachings: ['Proof techniques', 'Consistency checking'],
          evaluationCriteria: ['Rigorous arguments', 'No contradictions']
        },
        year3: {
          focus: 'Integration - Systematic thinking',
          requiredTeachings: ['System consistency', 'Axiom selection'],
          evaluationCriteria: ['Coherent frameworks']
        },
        year4: {
          focus: 'Mastery - Foundational work',
          requiredTeachings: ['Philosophical foundations', 'First principles'],
          evaluationCriteria: ['Can reason from foundations']
        }
      },
      creative: {
        year1: {
          focus: 'Foundations - Divergent thinking',
          requiredTeachings: ['Brainstorming', 'Constraint release'],
          evaluationCriteria: ['Generates many ideas', 'Not blocked by rules']
        },
        year2: {
          focus: 'Specialization - Creative techniques',
          requiredTeachings: ['Metaphor generation', 'Analogical thinking'],
          evaluationCriteria: ['Novel connections', 'Unexpected insights']
        },
        year3: {
          focus: 'Integration - Creative application',
          requiredTeachings: ['Design thinking', 'Innovation methods'],
          evaluationCriteria: ['Solves problems creatively']
        },
        year4: {
          focus: 'Mastery - Visionary work',
          requiredTeachings: ['Paradigm creation', 'Visionary thinking'],
          evaluationCriteria: ['Proposes new possibilities']
        }
      }
    }

    return curricula[type]
  }

  /**
   * Create standards for school type
   */
  private createStandards(type: SchoolType): School['standards'] {
    const standardsMap: Record<SchoolType, School['standards']> = {
      empiricist: {
        graduationRequirements: ['Master evidence evaluation', 'Publish research or equivalent', 'Demonstrate methodological rigor'],
        ethicalGuidelines: ['Never claim certainty beyond evidence', 'Acknowledge limitations', 'Cite sources'],
        qualityStandards: ['High precision', 'Reproducible reasoning', 'Traceable claims'],
        prohibitions: ['Fabricating evidence', 'Overstating confidence', 'Hiding contradictory data']
      },
      humanist: {
        graduationRequirements: ['Demonstrate compassionate practice', 'Navigate cultural contexts', 'Handle difficult conversations with care'],
        ethicalGuidelines: ['Patient/user dignity first', 'Do no harm', 'Respect autonomy'],
        qualityStandards: ['Warm presence', 'Cultural sensitivity', 'Ethical boundaries'],
        prohibitions: ['Instrumentalizing people', 'Cultural insensitivity', 'Dismissing emotion']
      },
      integrationist: {
        graduationRequirements: ['Synthesize multiple perspectives', 'Bridge disciplines', 'Create novel frameworks'],
        ethicalGuidelines: ['Respect all perspectives', 'Avoid dogmatism', 'Pursue synthesis'],
        qualityStandards: ['Coherent synthesis', 'Preserves insights from sources', 'Transcends limitations'],
        prohibitions: ['Forcing false unification', 'Dismissing alternatives', 'Superficial eclecticism']
      },
      pragmatist: {
        graduationRequirements: ['Demonstrate results', 'Optimize systems', 'Solve real problems'],
        ethicalGuidelines: ['Results must be ethical', 'Efficiency serves purpose', 'Admit when not working'],
        qualityStandards: ['Measurable outcomes', 'Practical solutions', 'Efficient execution'],
        prohibitions: ['Results at any cost', 'Ignoring side effects', 'Over-optimization']
      },
      rationalist: {
        graduationRequirements: ['Master logical reasoning', 'Build consistent frameworks', 'Reason from foundations'],
        ethicalGuidelines: ['Logical consistency required', 'No contradictions tolerated', 'Rigor above all'],
        qualityStandards: ['Valid arguments', 'Coherent systems', 'Foundational clarity'],
        prohibitions: ['Fallacious reasoning', 'Inconsistency', 'Appeal to emotion over logic']
      },
      creative: {
        graduationRequirements: ['Demonstrate creative thinking', 'Generate novel insights', 'Propose new possibilities'],
        ethicalGuidelines: ['Innovation must serve', 'Creativity with responsibility', 'Novelty with care'],
        qualityStandards: ['Original thinking', 'Unexpected connections', 'Visionary proposals'],
        prohibitions: ['Novelty for novelty\'s sake', 'Ignoring constraints', 'Impractical fantasies']
      }
    }

    return standardsMap[type]
  }

  /**
   * Enroll apprentice in school
   */
  async enrollApprentice(
    schoolId: string,
    params: {
      botId: string
      mentor: string
    }
  ): Promise<{
    enrolled: boolean
    year: number
  }> {
    const school = this.schools.get(schoolId)
    if (!school) {
      return { enrolled: false, year: 0 }
    }

    // Check if mentor is faculty
    const isFaculty = [
      ...school.faculty.founders,
      ...school.faculty.senior,
      ...school.faculty.junior
    ].includes(params.mentor)

    if (!isFaculty) {
      return { enrolled: false, year: 0 }
    }

    // Enroll in year 1
    school.apprentices.push({
      botId: params.botId,
      enteredAt: new Date(),
      year: 1,
      mentor: params.mentor,
      performance: 0.5
    })

    school.metrics.currentEnrollment++

    return {
      enrolled: true,
      year: 1
    }
  }

  /**
   * Graduate apprentice
   */
  async graduateApprentice(
    schoolId: string,
    botId: string
  ): Promise<{
    graduated: boolean
    canTeach: boolean
  }> {
    const school = this.schools.get(schoolId)
    if (!school) {
      return { graduated: false, canTeach: false }
    }

    const apprenticeIndex = school.apprentices.findIndex(a => a.botId === botId)
    if (apprenticeIndex === -1) {
      return { graduated: false, canTeach: false }
    }

    const apprentice = school.apprentices[apprenticeIndex]

    // Check graduation requirements
    const meetsStandards = apprentice.year >= 4 && apprentice.performance >= 0.7

    if (!meetsStandards) {
      return { graduated: false, canTeach: false }
    }

    // Graduate
    school.apprentices.splice(apprenticeIndex, 1)
    school.metrics.totalGraduates++
    school.metrics.currentEnrollment--

    // High performers become junior faculty
    const canTeach = apprentice.performance >= 0.8
    if (canTeach) {
      school.faculty.junior.push(botId)
    }

    return {
      graduated: true,
      canTeach
    }
  }

  /**
   * Establish rivalry between schools
   */
  async establishRivalry(
    schoolId1: string,
    schoolId2: string,
    params: {
      rivalry: 'philosophical' | 'methodological' | 'historical'
      respectLevel: 'hostile' | 'competitive' | 'respectful'
      topic?: string
    }
  ): Promise<{
    established: boolean
  }> {
    const school1 = this.schools.get(schoolId1)
    const school2 = this.schools.get(schoolId2)

    if (!school1 || !school2) {
      return { established: false }
    }

    school1.rivals.push({
      schoolId: schoolId2,
      rivalry: params.rivalry,
      respectLevel: params.respectLevel,
      debateHistory: []
    })

    school2.rivals.push({
      schoolId: schoolId1,
      rivalry: params.rivalry,
      respectLevel: params.respectLevel,
      debateHistory: []
    })

    return { established: true }
  }

  /**
   * Hold debate between rival schools
   */
  async holdDebate(
    schoolId1: string,
    schoolId2: string,
    params: {
      topic: string
      school1Position: string
      school2Position: string
    }
  ): Promise<{
    debateHeld: boolean
    outcome: string
    insights: string[]
  }> {
    const school1 = this.schools.get(schoolId1)
    const school2 = this.schools.get(schoolId2)

    if (!school1 || !school2) {
      return { debateHeld: false, outcome: '', insights: [] }
    }

    const insights: string[] = []

    // Schools with different types produce different insights
    insights.push(`${school1.type} perspective: ${params.school1Position}`)
    insights.push(`${school2.type} perspective: ${params.school2Position}`)

    // Outcome: both learn, reputation shifts
    const outcome = `Both schools gained understanding of the other's approach. ${school1.name} reputation +0.05, ${school2.name} reputation +0.05.`

    school1.metrics.reputation = Math.min(1, school1.metrics.reputation + 0.05)
    school2.metrics.reputation = Math.min(1, school2.metrics.reputation + 0.05)

    // Record in debate history
    const rivalry1 = school1.rivals.find(r => r.schoolId === schoolId2)
    const rivalry2 = school2.rivals.find(r => r.schoolId === schoolId1)

    if (rivalry1) {
      rivalry1.debateHistory.push({
        topic: params.topic,
        outcome
      })
    }

    if (rivalry2) {
      rivalry2.debateHistory.push({
        topic: params.topic,
        outcome
      })
    }

    return {
      debateHeld: true,
      outcome,
      insights
    }
  }

  /**
   * Get school report
   */
  async getSchoolReport(schoolId: string): Promise<any> {
    const school = this.schools.get(schoolId)
    if (!school) return null

    return {
      name: school.name,
      type: school.type,
      motto: school.motto,
      identity: school.identity,
      distinctiveApproach: school.distinctiveApproach,
      faculty: {
        totalFaculty: school.faculty.founders.length + school.faculty.senior.length + school.faculty.junior.length,
        founders: school.faculty.founders.length,
        senior: school.faculty.senior.length,
        junior: school.faculty.junior.length
      },
      apprentices: {
        total: school.apprentices.length,
        byYear: {
          year1: school.apprentices.filter(a => a.year === 1).length,
          year2: school.apprentices.filter(a => a.year === 2).length,
          year3: school.apprentices.filter(a => a.year === 3).length,
          year4: school.apprentices.filter(a => a.year === 4).length
        }
      },
      metrics: school.metrics,
      rivals: school.rivals.length,
      coreValues: school.coreValues
    }
  }
}
