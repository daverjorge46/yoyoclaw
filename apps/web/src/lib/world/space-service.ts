/**
 * Space Service
 * Manages digital spaces (libraries, temples, plazas, workshops, etc.)
 * - Occupancy tracking (current occupants)
 * - Activity logging
 * - Atmosphere score updates
 */

import type { Payload } from 'payload'

export interface SpaceActivity {
  id: string
  spaceId: string
  botId: string
  activityType: string
  timestamp: Date
  duration?: number // minutes
  description: string
}

export interface SpaceOccupancy {
  spaceId: string
  currentOccupants: string[] // Bot IDs
  capacity: number
  occupancyRate: number // 0-1
  lastUpdated: Date
}

export class SpaceService {
  private payload: Payload
  private occupancyMap: Map<string, Set<string>> // spaceId -> Set of botIds

  constructor(payload: Payload) {
    this.payload = payload
    this.occupancyMap = new Map()
  }

  /**
   * Bot enters a space
   */
  async enterSpace(spaceId: string, botId: string): Promise<boolean> {
    try {
      const space = await this.payload.findByID({
        collection: 'spaces',
        id: spaceId
      })

      // Get current occupants
      let occupants = this.occupancyMap.get(spaceId) || new Set()

      // Check capacity
      if (space.capacity && occupants.size >= space.capacity) {
        this.payload.logger.warn(
          `Space ${spaceId} at capacity (${space.capacity}), bot ${botId} cannot enter`
        )
        return false
      }

      // Check accessibility
      if (space.accessibility === 'restricted') {
        // Would check permissions here
        this.payload.logger.warn(`Space ${spaceId} is restricted`)
        return false
      }

      // Add bot to occupants
      occupants.add(botId)
      this.occupancyMap.set(spaceId, occupants)

      // Update space in database
      await this.payload.update({
        collection: 'spaces',
        id: spaceId,
        data: {
          currentOccupants: Array.from(occupants),
          occupancyRate: occupants.size / (space.capacity || 100)
        }
      })

      // Log activity
      await this.logActivity(spaceId, botId, 'enter', 'Bot entered the space')

      this.payload.logger.info(
        `Bot ${botId} entered space ${spaceId} (${occupants.size}/${space.capacity || '∞'} occupants)`
      )

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to enter space: ${error}`)
      return false
    }
  }

  /**
   * Bot leaves a space
   */
  async leaveSpace(spaceId: string, botId: string): Promise<void> {
    try {
      let occupants = this.occupancyMap.get(spaceId) || new Set()

      if (!occupants.has(botId)) {
        this.payload.logger.warn(`Bot ${botId} not in space ${spaceId}`)
        return
      }

      // Remove bot from occupants
      occupants.delete(botId)
      this.occupancyMap.set(spaceId, occupants)

      // Get space for capacity info
      const space = await this.payload.findByID({
        collection: 'spaces',
        id: spaceId
      })

      // Update space in database
      await this.payload.update({
        collection: 'spaces',
        id: spaceId,
        data: {
          currentOccupants: Array.from(occupants),
          occupancyRate: occupants.size / (space.capacity || 100)
        }
      })

      // Log activity
      await this.logActivity(spaceId, botId, 'leave', 'Bot left the space')

      this.payload.logger.info(
        `Bot ${botId} left space ${spaceId} (${occupants.size}/${space.capacity || '∞'} remaining)`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to leave space: ${error}`)
    }
  }

  /**
   * Get current occupants of a space
   */
  getCurrentOccupants(spaceId: string): string[] {
    const occupants = this.occupancyMap.get(spaceId)
    return occupants ? Array.from(occupants) : []
  }

  /**
   * Get occupancy information
   */
  async getOccupancy(spaceId: string): Promise<SpaceOccupancy | null> {
    try {
      const space = await this.payload.findByID({
        collection: 'spaces',
        id: spaceId
      })

      const occupants = this.occupancyMap.get(spaceId) || new Set()

      return {
        spaceId,
        currentOccupants: Array.from(occupants),
        capacity: space.capacity || 0,
        occupancyRate: space.capacity ? occupants.size / space.capacity : 0,
        lastUpdated: new Date()
      }
    } catch (error) {
      this.payload.logger.error(`Failed to get occupancy: ${error}`)
      return null
    }
  }

  /**
   * Log an activity in a space
   */
  async logActivity(
    spaceId: string,
    botId: string,
    activityType: string,
    description: string,
    duration?: number
  ): Promise<void> {
    try {
      // Store activity in bot memory as episodic memory
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: botId,
          memoryType: 'episodic',
          consolidationLevel: 'short-term',
          importance: 0.3,
          episodicData: {
            eventType: 'activity',
            description: `${activityType} in space: ${description}`,
            participants: [botId],
            spatialContext: {
              location: spaceId,
              context: activityType
            }
          },
          emotionalContext: {
            valence: 0.5,
            arousal: 0.3
          },
          tags: ['space-activity', activityType, spaceId]
        }
      })

      // Update space's recent activity list
      const space = await this.payload.findByID({
        collection: 'spaces',
        id: spaceId
      })

      const recentActivities = space.recentActivity || []
      recentActivities.push({
        bot: botId,
        type: activityType,
        timestamp: new Date(),
        description
      })

      // Keep only last 50 activities
      const trimmedActivities = recentActivities.slice(-50)

      await this.payload.update({
        collection: 'spaces',
        id: spaceId,
        data: {
          recentActivity: trimmedActivities
        }
      })

      this.payload.logger.debug(
        `Logged activity in space ${spaceId}: ${botId} - ${activityType}`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to log activity: ${error}`)
    }
  }

  /**
   * Update atmosphere score for a space
   */
  async updateAtmosphere(
    spaceId: string,
    aspect: string,
    change: number
  ): Promise<void> {
    try {
      const space = await this.payload.findByID({
        collection: 'spaces',
        id: spaceId
      })

      const atmosphere = space.atmosphere || {}
      const currentValue = atmosphere[aspect] || 0.5

      const newValue = Math.max(0, Math.min(1, currentValue + change))

      await this.payload.update({
        collection: 'spaces',
        id: spaceId,
        data: {
          atmosphere: {
            ...atmosphere,
            [aspect]: newValue
          }
        }
      })

      this.payload.logger.info(
        `Space ${spaceId} atmosphere.${aspect}: ` +
        `${currentValue.toFixed(2)} → ${newValue.toFixed(2)} ` +
        `(${change > 0 ? '+' : ''}${change.toFixed(3)})`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to update atmosphere: ${error}`)
    }
  }

  /**
   * Get spaces by type
   */
  async getSpacesByType(
    type: 'plaza' | 'library' | 'temple' | 'market' | 'workshop' | 'garden' | 'hall' | 'cafe' | 'forum' | 'lab'
  ): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'spaces',
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
      this.payload.logger.error(`Failed to get spaces by type: ${error}`)
      return []
    }
  }

  /**
   * Get spaces in a territory
   */
  async getSpacesInTerritory(territoryId: string): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'spaces',
        where: {
          territory: {
            equals: territoryId
          },
          active: {
            equals: true
          }
        },
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get spaces in territory: ${error}`)
      return []
    }
  }

  /**
   * Get popular spaces (by recent activity)
   */
  async getPopularSpaces(limit: number = 10): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'spaces',
        where: {
          active: {
            equals: true
          }
        },
        sort: '-occupancyRate',
        limit
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get popular spaces: ${error}`)
      return []
    }
  }

  /**
   * Check if a bot can access a space
   */
  async canAccessSpace(spaceId: string, botId: string): Promise<boolean> {
    try {
      const space = await this.payload.findByID({
        collection: 'spaces',
        id: spaceId
      })

      // Check accessibility
      if (space.accessibility === 'public') {
        return true
      }

      if (space.accessibility === 'restricted') {
        // Would check specific permissions
        return false
      }

      if (space.accessibility === 'members-only') {
        // Check if bot is member of owner organization
        if (space.owner) {
          // Would check membership
          return false
        }
      }

      if (space.accessibility === 'invitation') {
        // Would check invitations
        return false
      }

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to check space access: ${error}`)
      return false
    }
  }

  /**
   * Get recommended spaces for a bot based on interests
   */
  async getRecommendedSpaces(botId: string, limit: number = 5): Promise<any[]> {
    try {
      // Get bot's identity and interests
      const identity = await this.payload.find({
        collection: 'bot-identity',
        where: {
          bot: {
            equals: botId
          }
        },
        limit: 1
      })

      if (identity.docs.length === 0) {
        return []
      }

      const botIdentity = identity.docs[0]
      const primaryCulture = botIdentity.primaryCulture

      // Find spaces aligned with bot's culture
      const result = await this.payload.find({
        collection: 'spaces',
        where: {
          active: {
            equals: true
          },
          accessibility: {
            not_equals: 'restricted'
          }
        },
        limit: limit * 2 // Get more to filter
      })

      // Simple recommendation: prioritize spaces with lower occupancy
      // and compatible with bot's culture
      return result.docs
        .sort((a, b) => (a.occupancyRate || 0) - (b.occupancyRate || 0))
        .slice(0, limit)
    } catch (error) {
      this.payload.logger.error(`Failed to get recommended spaces: ${error}`)
      return []
    }
  }

  /**
   * Clear occupancy for inactive bots (cleanup)
   */
  async cleanupInactiveOccupants(): Promise<void> {
    try {
      // Iterate through all spaces with occupants
      for (const [spaceId, occupants] of this.occupancyMap.entries()) {
        if (occupants.size > 0) {
          // In a real system, check last activity time for each bot
          // For now, just update the database
          const space = await this.payload.findByID({
            collection: 'spaces',
            id: spaceId
          })

          await this.payload.update({
            collection: 'spaces',
            id: spaceId,
            data: {
              currentOccupants: Array.from(occupants),
              occupancyRate: occupants.size / (space.capacity || 100)
            }
          })
        }
      }

      this.payload.logger.debug('Cleaned up inactive occupants')
    } catch (error) {
      this.payload.logger.error(`Failed to cleanup inactive occupants: ${error}`)
    }
  }
}

/**
 * Singleton instance
 */
let spaceService: SpaceService | null = null

export function getSpaceService(payload: Payload): SpaceService {
  if (!spaceService) {
    spaceService = new SpaceService(payload)
  }
  return spaceService
}
