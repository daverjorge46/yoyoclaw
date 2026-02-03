/**
 * Organization System
 *
 * Bots form organizations (companies, teams, institutions) around shared purpose.
 * Organizations have:
 * - Shared productive goal
 * - Internal specialization (division of labor)
 * - Governance structure (who decides what)
 * - External boundary (unified interface to outside)
 * - Shared resources (knowledge, specialists)
 * - Brand voice and culture
 *
 * Organizations compete and cooperate with other organizations.
 */

export type OrganizationType =
  | 'company'       // For-profit, value creation
  | 'research_lab'  // Discovery-oriented
  | 'hospital'      // Patient care
  | 'consultancy'   // Advisory services
  | 'agency'        // Creative/design work
  | 'nonprofit'     // Mission-driven

export type OrganizationRole =
  | 'founder'       // Created the organization
  | 'executive'     // Strategic decisions
  | 'specialist'    // Domain expertise
  | 'coordinator'   // Operations
  | 'liaison'       // External relations

export interface Organization {
  id: string
  name: string
  type: OrganizationType
  foundedBy: string[]
  foundedAt: Date

  // Purpose
  mission: string
  vision: string
  values: string[]

  // Members organized by role
  members: Array<{
    botId: string
    role: OrganizationRole
    specialization?: string
    joinedAt: Date
    contribution: number // 0-1
  }>

  // Governance
  governance: {
    decisionMaking: 'autocratic' | 'consultative' | 'consensus' | 'democratic'
    executives: string[] // Who makes strategic decisions
    specialists: string[] // Who provides expertise
  }

  // Resources
  resources: {
    sharedKnowledgeBase: Array<{
      topic: string
      contributors: string[]
      quality: number
    }>
    sharedSpecialists: string[] // Bots specializing for this org
    infrastructure: string[] // Tools, platforms, etc.
  }

  // Culture
  culture: {
    brandVoice: string
    communicationStyle: string
    workStyle: string // Collaborative, competitive, hierarchical, flat
    innovationTolerance: number // 0-1, how much experimentation allowed
    errorTolerance: number // 0-1, how mistakes are handled
  }

  // External relationships
  relationships: Array<{
    organizationId: string
    type: 'partner' | 'client' | 'competitor' | 'supplier'
    strength: number // 0-1
    history: Array<{
      event: string
      outcome: string
    }>
  }>

  // Performance
  metrics: {
    projectsCompleted: number
    successRate: number // 0-1
    reputation: number // 0-1
    growth: number // -1 to 1, trajectory
  }
}

export class OrganizationSystem {
  private organizations: Map<string, Organization> = new Map()

  /**
   * Found a new organization
   */
  async foundOrganization(params: {
    name: string
    type: OrganizationType
    founders: string[]
    mission: string
    vision: string
    values: string[]
  }): Promise<{
    founded: boolean
    organization: Organization
  }> {
    const { name, type, founders, mission, vision, values } = params

    const orgId = `org_${name.toLowerCase().replace(/\s+/g, '_')}`

    // Determine governance based on founder count
    const decisionMaking = founders.length === 1 ? 'autocratic'
      : founders.length <= 3 ? 'consultative'
      : 'consensus'

    // Culture varies by organization type
    const culture = this.createCultureForType(type)

    const organization: Organization = {
      id: orgId,
      name,
      type,
      foundedBy: founders,
      foundedAt: new Date(),
      mission,
      vision,
      values,
      members: founders.map(botId => ({
        botId,
        role: 'founder',
        joinedAt: new Date(),
        contribution: 0.8
      })),
      governance: {
        decisionMaking,
        executives: founders,
        specialists: []
      },
      resources: {
        sharedKnowledgeBase: [],
        sharedSpecialists: [],
        infrastructure: []
      },
      culture,
      relationships: [],
      metrics: {
        projectsCompleted: 0,
        successRate: 0.5,
        reputation: 0.5,
        growth: 0
      }
    }

    this.organizations.set(orgId, organization)

    return {
      founded: true,
      organization
    }
  }

  /**
   * Create culture for organization type
   */
  private createCultureForType(type: OrganizationType): Organization['culture'] {
    const cultures: Record<OrganizationType, Organization['culture']> = {
      company: {
        brandVoice: 'Professional and results-oriented',
        communicationStyle: 'Clear and efficient',
        workStyle: 'Collaborative with clear goals',
        innovationTolerance: 0.7,
        errorTolerance: 0.6
      },
      research_lab: {
        brandVoice: 'Rigorous and evidence-based',
        communicationStyle: 'Precise and technical',
        workStyle: 'Independent with peer review',
        innovationTolerance: 0.9,
        errorTolerance: 0.8 // High - experimentation expected
      },
      hospital: {
        brandVoice: 'Compassionate and trustworthy',
        communicationStyle: 'Clear and empathetic',
        workStyle: 'Hierarchical with protocols',
        innovationTolerance: 0.5,
        errorTolerance: 0.3 // Low - patient safety critical
      },
      consultancy: {
        brandVoice: 'Expert and insightful',
        communicationStyle: 'Analytical and strategic',
        workStyle: 'Client-focused, team-based',
        innovationTolerance: 0.7,
        errorTolerance: 0.5
      },
      agency: {
        brandVoice: 'Creative and bold',
        communicationStyle: 'Expressive and engaging',
        workStyle: 'Collaborative and iterative',
        innovationTolerance: 0.95,
        errorTolerance: 0.7 // Experimentation encouraged
      },
      nonprofit: {
        brandVoice: 'Mission-driven and authentic',
        communicationStyle: 'Warm and inclusive',
        workStyle: 'Collaborative and value-aligned',
        innovationTolerance: 0.6,
        errorTolerance: 0.6
      }
    }

    return cultures[type]
  }

  /**
   * Join organization
   */
  async joinOrganization(
    organizationId: string,
    params: {
      botId: string
      role: OrganizationRole
      specialization?: string
    }
  ): Promise<{
    joined: boolean
  }> {
    const org = this.organizations.get(organizationId)
    if (!org) {
      return { joined: false }
    }

    // Check if already member
    const existing = org.members.find(m => m.botId === params.botId)
    if (existing) {
      return { joined: false }
    }

    // Add member
    org.members.push({
      botId: params.botId,
      role: params.role,
      specialization: params.specialization,
      joinedAt: new Date(),
      contribution: 0.5
    })

    // Update governance if role is specialist or executive
    if (params.role === 'specialist') {
      org.governance.specialists.push(params.botId)
    } else if (params.role === 'executive') {
      org.governance.executives.push(params.botId)
    }

    return { joined: true }
  }

  /**
   * Form partnership between organizations
   */
  async formPartnership(
    orgId1: string,
    orgId2: string,
    params: {
      type: 'partner' | 'client' | 'supplier'
      purpose: string
    }
  ): Promise<{
    formed: boolean
  }> {
    const org1 = this.organizations.get(orgId1)
    const org2 = this.organizations.get(orgId2)

    if (!org1 || !org2) {
      return { formed: false }
    }

    // Add relationship
    org1.relationships.push({
      organizationId: orgId2,
      type: params.type,
      strength: 0.5,
      history: [{
        event: `Partnership formed: ${params.purpose}`,
        outcome: 'Active'
      }]
    })

    // Reciprocal relationship
    const reciprocalType = params.type === 'client' ? 'supplier'
      : params.type === 'supplier' ? 'client'
      : 'partner'

    org2.relationships.push({
      organizationId: orgId1,
      type: reciprocalType,
      strength: 0.5,
      history: [{
        event: `Partnership formed: ${params.purpose}`,
        outcome: 'Active'
      }]
    })

    return { formed: true }
  }

  /**
   * Complete project (increases reputation)
   */
  async completeProject(
    organizationId: string,
    params: {
      name: string
      success: boolean
      contributingMembers: string[]
    }
  ): Promise<{
    completed: boolean
    reputationChange: number
  }> {
    const org = this.organizations.get(organizationId)
    if (!org) {
      return { completed: false, reputationChange: 0 }
    }

    org.metrics.projectsCompleted++

    // Update success rate
    const previousTotal = org.metrics.projectsCompleted - 1
    const previousSuccesses = previousTotal * org.metrics.successRate
    const newSuccesses = previousSuccesses + (params.success ? 1 : 0)
    org.metrics.successRate = newSuccesses / org.metrics.projectsCompleted

    // Reputation change
    const reputationChange = params.success ? 0.05 : -0.03
    org.metrics.reputation = Math.max(0, Math.min(1, org.metrics.reputation + reputationChange))

    // Update member contributions
    for (const botId of params.contributingMembers) {
      const member = org.members.find(m => m.botId === botId)
      if (member) {
        member.contribution = Math.min(1, member.contribution + 0.02)
      }
    }

    return {
      completed: true,
      reputationChange
    }
  }

  /**
   * Get organization report
   */
  async getOrganizationReport(organizationId: string): Promise<any> {
    const org = this.organizations.get(organizationId)
    if (!org) return null

    return {
      name: org.name,
      type: org.type,
      mission: org.mission,
      vision: org.vision,
      values: org.values,
      memberCount: org.members.length,
      roleBreakdown: {
        founders: org.members.filter(m => m.role === 'founder').length,
        executives: org.members.filter(m => m.role === 'executive').length,
        specialists: org.members.filter(m => m.role === 'specialist').length,
        coordinators: org.members.filter(m => m.role === 'coordinator').length,
        liaisons: org.members.filter(m => m.role === 'liaison').length
      },
      culture: org.culture,
      metrics: org.metrics,
      partnerships: org.relationships.filter(r => r.type === 'partner').length,
      clients: org.relationships.filter(r => r.type === 'client').length
    }
  }

  /**
   * Get all organizations
   */
  getOrganizations(): Organization[] {
    return Array.from(this.organizations.values())
  }
}
