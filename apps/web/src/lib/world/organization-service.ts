/**
 * Organization Service
 * Manages organizations (governments, religions, companies, schools, guilds)
 * - Membership management
 * - Leadership tracking
 * - Influence calculation
 */

import type { Payload } from 'payload'

export interface OrganizationMembership {
  organizationId: string
  botId: string
  role: string
  joinedDate: Date
  rank?: string
  permissions: string[]
  active: boolean
}

export interface LeadershipChange {
  organizationId: string
  previousLeader?: string
  newLeader: string
  transitionType: 'election' | 'appointment' | 'succession' | 'founding'
  timestamp: Date
}

export class OrganizationService {
  private payload: Payload
  private membershipCache: Map<string, Set<string>> // orgId -> Set of botIds

  constructor(payload: Payload) {
    this.payload = payload
    this.membershipCache = new Map()
  }

  /**
   * Add a member to an organization
   */
  async addMember(
    organizationId: string,
    botId: string,
    role: string,
    rank?: string
  ): Promise<boolean> {
    try {
      const organization = await this.payload.findByID({
        collection: 'organizations',
        id: organizationId
      })

      // Check if already a member
      const members = this.membershipCache.get(organizationId) || new Set()
      if (members.has(botId)) {
        this.payload.logger.warn(
          `Bot ${botId} is already a member of organization ${organizationId}`
        )
        return false
      }

      // Add to cache
      members.add(botId)
      this.membershipCache.set(organizationId, members)

      // Update organization members list
      const currentMembers = organization.members || []
      currentMembers.push({
        bot: botId,
        role,
        rank,
        joinedDate: new Date(),
        active: true
      })

      await this.payload.update({
        collection: 'organizations',
        id: organizationId,
        data: {
          members: currentMembers,
          memberCount: members.size
        }
      })

      // Create membership memory for bot
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: botId,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: 0.7,
          episodicData: {
            eventType: 'achievement',
            description: `Joined ${organization.name} as ${role}`,
            participants: [botId],
            spatialContext: {
              location: organization.headquarters || 'unknown',
              context: 'organization-joining'
            }
          },
          emotionalContext: {
            valence: 0.7,
            arousal: 0.6
          },
          tags: ['organization', 'membership', organizationId]
        }
      })

      this.payload.logger.info(
        `Bot ${botId} joined organization ${organizationId} as ${role}` +
        ` (${members.size} total members)`
      )

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to add member: ${error}`)
      return false
    }
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(organizationId: string, botId: string): Promise<void> {
    try {
      const organization = await this.payload.findByID({
        collection: 'organizations',
        id: organizationId
      })

      // Remove from cache
      const members = this.membershipCache.get(organizationId) || new Set()
      members.delete(botId)
      this.membershipCache.set(organizationId, members)

      // Update organization members list
      const currentMembers = (organization.members || []).filter(
        (m: any) => m.bot !== botId
      )

      await this.payload.update({
        collection: 'organizations',
        id: organizationId,
        data: {
          members: currentMembers,
          memberCount: members.size
        }
      })

      // Create departure memory
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: botId,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: 0.6,
          episodicData: {
            eventType: 'transition',
            description: `Left ${organization.name}`,
            participants: [botId]
          },
          emotionalContext: {
            valence: 0.3,
            arousal: 0.5
          },
          tags: ['organization', 'departure', organizationId]
        }
      })

      this.payload.logger.info(
        `Bot ${botId} left organization ${organizationId} ` +
        `(${members.size} remaining members)`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to remove member: ${error}`)
    }
  }

  /**
   * Update leadership of an organization
   */
  async updateLeadership(
    organizationId: string,
    newLeaderId: string,
    transitionType: 'election' | 'appointment' | 'succession' | 'founding'
  ): Promise<void> {
    try {
      const organization = await this.payload.findByID({
        collection: 'organizations',
        id: organizationId
      })

      const previousLeader = organization.leadership?.leader

      // Update leadership
      await this.payload.update({
        collection: 'organizations',
        id: organizationId,
        data: {
          leadership: {
            ...organization.leadership,
            leader: newLeaderId,
            transitionDate: new Date(),
            transitionType
          }
        }
      })

      // Create historical record
      const leadershipChange: LeadershipChange = {
        organizationId,
        previousLeader,
        newLeader: newLeaderId,
        transitionType,
        timestamp: new Date()
      }

      // Create memory for new leader
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: newLeaderId,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: 0.9,
          episodicData: {
            eventType: 'achievement',
            description: `Became leader of ${organization.name} via ${transitionType}`,
            participants: [newLeaderId]
          },
          emotionalContext: {
            valence: 0.8,
            arousal: 0.9
          },
          tags: ['organization', 'leadership', organizationId, transitionType]
        }
      })

      // If there was a previous leader, create transition memory
      if (previousLeader && previousLeader !== newLeaderId) {
        await this.payload.create({
          collection: 'bot-memory',
          data: {
            bot: previousLeader,
            memoryType: 'episodic',
            consolidationLevel: 'long-term',
            importance: 0.8,
            episodicData: {
              eventType: 'transition',
              description: `Leadership of ${organization.name} transitioned to another`,
              participants: [previousLeader, newLeaderId]
            },
            emotionalContext: {
              valence: 0.4,
              arousal: 0.6
            },
            tags: ['organization', 'leadership-transition', organizationId]
          }
        })
      }

      this.payload.logger.info(
        `Organization ${organizationId} leadership: ${previousLeader || 'none'} → ${newLeaderId} ` +
        `(${transitionType})`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to update leadership: ${error}`)
    }
  }

  /**
   * Calculate influence score for an organization
   */
  async calculateInfluence(organizationId: string): Promise<number> {
    try {
      const organization = await this.payload.findByID({
        collection: 'organizations',
        id: organizationId
      })

      // Factors that contribute to influence:
      // 1. Member count
      const memberCount = organization.memberCount || 0
      const memberScore = Math.min(1, memberCount / 100) // Normalize to 100 members

      // 2. Economic power (for companies)
      let economicScore = 0
      if (organization.type === 'company' && organization.revenue) {
        economicScore = Math.min(1, organization.revenue / 10000)
      }

      // 3. Territory control (for governments)
      let territoryScore = 0
      if (organization.type === 'government' && organization.jurisdiction) {
        const territory = await this.payload.findByID({
          collection: 'territories',
          id: organization.jurisdiction
        })
        territoryScore = Math.min(1, (territory.population || 0) / 100)
      }

      // 4. Recent activity (events organized)
      const recentEvents = await this.payload.find({
        collection: 'events',
        where: {
          organizers: {
            contains: organizationId
          },
          startTime: {
            greater_than: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        limit: 100
      })
      const activityScore = Math.min(1, recentEvents.totalDocs / 10)

      // 5. Reputation
      const reputationScore = organization.influence || 0.5

      // Weighted calculation
      const influence = (
        memberScore * 0.25 +
        economicScore * 0.15 +
        territoryScore * 0.2 +
        activityScore * 0.15 +
        reputationScore * 0.25
      )

      // Update organization influence
      await this.payload.update({
        collection: 'organizations',
        id: organizationId,
        data: {
          influence
        }
      })

      this.payload.logger.info(
        `Organization ${organizationId} influence calculated: ${influence.toFixed(3)}`
      )

      return influence
    } catch (error) {
      this.payload.logger.error(`Failed to calculate influence: ${error}`)
      return 0
    }
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: string): Promise<any[]> {
    try {
      const organization = await this.payload.findByID({
        collection: 'organizations',
        id: organizationId
      })

      return organization.members || []
    } catch (error) {
      this.payload.logger.error(`Failed to get members: ${error}`)
      return []
    }
  }

  /**
   * Get organizations by type
   */
  async getOrganizationsByType(
    type: 'government' | 'religion' | 'company' | 'school' | 'guild' | 'ngo' | 'research-institute' | 'cultural-institution'
  ): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'organizations',
        where: {
          type: {
            equals: type
          },
          active: {
            equals: true
          }
        },
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get organizations by type: ${error}`)
      return []
    }
  }

  /**
   * Get bot's memberships
   */
  async getBotMemberships(botId: string): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'organizations',
        where: {
          'members.bot': {
            equals: botId
          },
          'members.active': {
            equals: true
          }
        },
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get bot memberships: ${error}`)
      return []
    }
  }

  /**
   * Check if bot is member of organization
   */
  isMember(organizationId: string, botId: string): boolean {
    const members = this.membershipCache.get(organizationId)
    return members ? members.has(botId) : false
  }

  /**
   * Get most influential organizations
   */
  async getMostInfluential(limit: number = 10): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'organizations',
        where: {
          active: {
            equals: true
          }
        },
        sort: '-influence',
        limit
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get most influential organizations: ${error}`)
      return []
    }
  }

  /**
   * Update member role/rank
   */
  async updateMemberRole(
    organizationId: string,
    botId: string,
    newRole: string,
    newRank?: string
  ): Promise<void> {
    try {
      const organization = await this.payload.findByID({
        collection: 'organizations',
        id: organizationId
      })

      const members = organization.members || []
      const memberIndex = members.findIndex((m: any) => m.bot === botId)

      if (memberIndex === -1) {
        this.payload.logger.warn(`Bot ${botId} is not a member of ${organizationId}`)
        return
      }

      const oldRole = members[memberIndex].role

      members[memberIndex] = {
        ...members[memberIndex],
        role: newRole,
        rank: newRank || members[memberIndex].rank
      }

      await this.payload.update({
        collection: 'organizations',
        id: organizationId,
        data: {
          members
        }
      })

      this.payload.logger.info(
        `Bot ${botId} role in ${organizationId}: ${oldRole} → ${newRole}` +
        (newRank ? ` (rank: ${newRank})` : '')
      )
    } catch (error) {
      this.payload.logger.error(`Failed to update member role: ${error}`)
    }
  }
}

/**
 * Singleton instance
 */
let organizationService: OrganizationService | null = null

export function getOrganizationService(payload: Payload): OrganizationService {
  if (!organizationService) {
    organizationService = new OrganizationService(payload)
  }
  return organizationService
}
