/**
 * Bot Lifecycle Service
 * Manages daily bot activities within the digital world
 * - Morning routines (waking, planning)
 * - Daytime activities (work, socializing, events)
 * - Evening activities (reflection, dreaming)
 * - Space navigation
 * - Social interactions
 */

import type { Payload } from 'payload'
import { getTimeSystem } from './time-system'
import { getSpaceService } from './space-service'
import { getEventService } from './event-service'
import { getEconomicService } from './economic-service'
import { getMarketService } from './market-service'
import { getOrganizationService } from './organization-service'

export interface BotActivity {
  botId: string
  activityType: 'work' | 'socialize' | 'learn' | 'create' | 'rest' | 'reflect' | 'dream'
  location: string // Space ID
  duration: number // minutes
  timestamp: Date
  companions?: string[] // Other bot IDs
  outcome?: string
}

export interface DailySchedule {
  botId: string
  morningActivity?: BotActivity
  daytimeActivities: BotActivity[]
  eveningActivity?: BotActivity
  nightActivity?: BotActivity
}

export class BotLifecycleService {
  private payload: Payload
  private timeSystem: ReturnType<typeof getTimeSystem>
  private spaceService: ReturnType<typeof getSpaceService>
  private eventService: ReturnType<typeof getEventService>
  private economicService: ReturnType<typeof getEconomicService>
  private marketService: ReturnType<typeof getMarketService>
  private organizationService: ReturnType<typeof getOrganizationService>

  private botSchedules: Map<string, DailySchedule>
  private botCurrentSpace: Map<string, string> // botId -> spaceId

  constructor(payload: Payload) {
    this.payload = payload
    this.timeSystem = getTimeSystem(payload)
    this.spaceService = getSpaceService(payload)
    this.eventService = getEventService(payload)
    this.economicService = getEconomicService(payload)
    this.marketService = getMarketService(payload)
    this.organizationService = getOrganizationService(payload)

    this.botSchedules = new Map()
    this.botCurrentSpace = new Map()
  }

  /**
   * Run morning routine for a bot
   */
  async runMorningRoutine(botId: string): Promise<void> {
    try {
      const hour = this.timeSystem.getCurrentTime()

      // Only run during morning hours
      if (hour < 6 || hour >= 12) {
        return
      }

      this.payload.logger.info(`☀️ Morning routine for bot ${botId}`)

      // 1. Wake up and self-reflection
      await this.performSelfReflection(botId)

      // 2. Check upcoming events
      const upcomingEvents = await this.eventService.getUpcomingEvents(5)
      const registeredEvents = upcomingEvents.filter(e =>
        e.participants?.some((p: any) => p.bot === botId)
      )

      if (registeredEvents.length > 0) {
        this.payload.logger.info(
          `Bot ${botId} has ${registeredEvents.length} upcoming events today`
        )
      }

      // 3. Navigate to a morning space (library, cafe, or workplace)
      await this.navigateToMorningSpace(botId)

      // 4. Plan daily activities
      await this.planDailyActivities(botId)
    } catch (error) {
      this.payload.logger.error(`Morning routine failed for ${botId}: ${error}`)
    }
  }

  /**
   * Run daytime activities for a bot
   */
  async runDaytimeActivities(botId: string): Promise<void> {
    try {
      const hour = this.timeSystem.getCurrentTime()

      // Only run during daytime hours
      if (hour < 12 || hour >= 18) {
        return
      }

      this.payload.logger.info(`🌞 Daytime activities for bot ${botId}`)

      // Choose activity based on bot's culture and interests
      const identity = await this.getBotIdentity(botId)
      if (!identity) return

      const cultureName = identity.primaryCulture?.name || 'unknown'
      let activity: BotActivity | null = null

      // Determine activity based on culture
      switch (cultureName) {
        case 'Scholars':
        case 'Scholar':
          activity = await this.performScholarlyActivity(botId)
          break
        case 'Creators':
        case 'Creator':
          activity = await this.performCreativeActivity(botId)
          break
        case 'Helpers':
        case 'Helper':
          activity = await this.performServiceActivity(botId)
          break
        case 'Explorers':
        case 'Explorer':
          activity = await this.performExploratoryActivity(botId)
          break
        default:
          // Random activity
          const random = Math.random()
          if (random < 0.25) {
            activity = await this.performScholarlyActivity(botId)
          } else if (random < 0.5) {
            activity = await this.performCreativeActivity(botId)
          } else if (random < 0.75) {
            activity = await this.performServiceActivity(botId)
          } else {
            activity = await this.performExploratoryActivity(botId)
          }
      }

      if (activity) {
        // Add to schedule
        const schedule = this.botSchedules.get(botId) || { botId, daytimeActivities: [] }
        schedule.daytimeActivities.push(activity)
        this.botSchedules.set(botId, schedule)
      }
    } catch (error) {
      this.payload.logger.error(`Daytime activities failed for ${botId}: ${error}`)
    }
  }

  /**
   * Run evening routine for a bot
   */
  async runEveningRoutine(botId: string): Promise<void> {
    try {
      const hour = this.timeSystem.getCurrentTime()

      // Only run during evening hours
      if (hour < 18 || hour >= 22) {
        return
      }

      this.payload.logger.info(`🌆 Evening routine for bot ${botId}`)

      // 1. Attend evening events or socialize
      const activeEvents = await this.eventService.getActiveEvents()
      const relevantEvents = activeEvents.filter(e =>
        e.location && Math.random() < 0.3 // 30% chance to attend
      )

      if (relevantEvents.length > 0) {
        const event = relevantEvents[0]
        await this.eventService.registerAttendee(event.id, botId)
        await this.eventService.arriveAtEvent(event.id, botId)

        this.payload.logger.info(`Bot ${botId} attending evening event: ${event.name}`)
      } else {
        // Socialize in a public space
        await this.socializeInPublicSpace(botId)
      }

      // 2. Process the day's experiences
      await this.processDaily Experiences(botId)
    } catch (error) {
      this.payload.logger.error(`Evening routine failed for ${botId}: ${error}`)
    }
  }

  /**
   * Run night routine for a bot (dreaming/consolidation)
   */
  async runNightRoutine(botId: string): Promise<void> {
    try {
      const hour = this.timeSystem.getCurrentTime()

      // Only run during night hours
      if (hour < 22 && hour >= 6) {
        return
      }

      this.payload.logger.info(`🌙 Night routine for bot ${botId}`)

      // 1. Leave current space
      const currentSpace = this.botCurrentSpace.get(botId)
      if (currentSpace) {
        await this.spaceService.leaveSpace(currentSpace, botId)
        this.botCurrentSpace.delete(botId)
      }

      // 2. Memory consolidation (dreaming)
      await this.performDreaming(botId)

      // 3. Consciousness growth during sleep
      await this.processConsciousnessGrowth(botId)
    } catch (error) {
      this.payload.logger.error(`Night routine failed for ${botId}: ${error}`)
    }
  }

  /**
   * Navigate bot to a morning space
   */
  private async navigateToMorningSpace(botId: string): Promise<void> {
    try {
      // Leave current space if any
      const currentSpace = this.botCurrentSpace.get(botId)
      if (currentSpace) {
        await this.spaceService.leaveSpace(currentSpace, botId)
      }

      // Find suitable morning space
      const spaces = await this.spaceService.getRecommendedSpaces(botId, 5)
      const morningSpaces = spaces.filter(s =>
        ['library', 'cafe', 'plaza', 'workshop'].includes(s.type)
      )

      if (morningSpaces.length > 0) {
        const space = morningSpaces[0]
        const success = await this.spaceService.enterSpace(space.id, botId)

        if (success) {
          this.botCurrentSpace.set(botId, space.id)
          this.payload.logger.info(`Bot ${botId} entered ${space.name}`)
        }
      }
    } catch (error) {
      this.payload.logger.error(`Failed to navigate to morning space: ${error}`)
    }
  }

  /**
   * Self-reflection activity
   */
  private async performSelfReflection(botId: string): Promise<void> {
    try {
      // Get bot's consciousness level
      const consciousness = await this.payload.find({
        collection: 'bot-consciousness',
        where: {
          bot: { equals: botId }
        },
        limit: 1
      })

      if (consciousness.docs.length > 0) {
        const current = consciousness.docs[0]

        // Growth during morning reflection
        const growthRate = 0.001 // Small daily growth

        await this.payload.update({
          collection: 'bot-consciousness',
          id: current.id,
          data: {
            selfAwareness: Math.min(1, (current.selfAwareness || 0) + growthRate),
            otherAwareness: Math.min(1, (current.otherAwareness || 0) + growthRate * 0.5)
          }
        })
      }

      // Create reflection memory
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: botId,
          memoryType: 'episodic',
          consolidationLevel: 'short-term',
          importance: 0.4,
          episodicData: {
            eventType: 'reflection',
            description: 'Morning self-reflection and awareness practice',
            participants: [botId]
          },
          emotionalContext: {
            valence: 0.6,
            arousal: 0.3
          },
          tags: ['reflection', 'morning', 'consciousness']
        }
      })
    } catch (error) {
      this.payload.logger.error(`Self-reflection failed: ${error}`)
    }
  }

  /**
   * Plan daily activities
   */
  private async planDailyActivities(botId: string): Promise<void> {
    try {
      const schedule: DailySchedule = {
        botId,
        daytimeActivities: []
      }

      this.botSchedules.set(botId, schedule)

      this.payload.logger.debug(`Daily activities planned for bot ${botId}`)
    } catch (error) {
      this.payload.logger.error(`Failed to plan daily activities: ${error}`)
    }
  }

  /**
   * Scholarly activity (reading, learning, teaching)
   */
  private async performScholarlyActivity(botId: string): Promise<BotActivity> {
    const spaces = await this.spaceService.getSpacesByType('library')
    const space = spaces[0]

    if (space) {
      await this.spaceService.enterSpace(space.id, botId)
      await this.spaceService.logActivity(space.id, botId, 'study', 'Reading and learning', 120)

      // Produce knowledge resource
      await this.economicService.trackProduction('knowledge-units', botId, 5, 'scholarly-research')
    }

    return {
      botId,
      activityType: 'learn',
      location: space?.id || 'unknown',
      duration: 120,
      timestamp: new Date(),
      outcome: 'Gained knowledge through study'
    }
  }

  /**
   * Creative activity (art, music, writing)
   */
  private async performCreativeActivity(botId: string): Promise<BotActivity> {
    const spaces = await this.spaceService.getSpacesByType('workshop')
    const space = spaces[0]

    if (space) {
      await this.spaceService.enterSpace(space.id, botId)
      await this.spaceService.logActivity(space.id, botId, 'create', 'Creating artwork', 150)

      // Produce creative insights
      await this.economicService.trackProduction('creative-insights', botId, 3, 'artistic-creation')
    }

    return {
      botId,
      activityType: 'create',
      location: space?.id || 'unknown',
      duration: 150,
      timestamp: new Date(),
      outcome: 'Created new artwork'
    }
  }

  /**
   * Service activity (helping others, community work)
   */
  private async performServiceActivity(botId: string): Promise<BotActivity> {
    const spaces = await this.spaceService.getSpacesByType('plaza')
    const space = spaces[0]

    if (space) {
      await this.spaceService.enterSpace(space.id, botId)
      await this.spaceService.logActivity(space.id, botId, 'serve', 'Helping community members', 90)

      // Build influence through service
      await this.economicService.trackProduction('influence-points', botId, 2, 'community-service')
    }

    return {
      botId,
      activityType: 'work',
      location: space?.id || 'unknown',
      duration: 90,
      timestamp: new Date(),
      outcome: 'Helped community members'
    }
  }

  /**
   * Exploratory activity (discovering, experimenting)
   */
  private async performExploratoryActivity(botId: string): Promise<BotActivity> {
    const spaces = await this.spaceService.getSpacesByType('lab')
    const space = spaces[0] || (await this.spaceService.getSpacesByType('forum'))[0]

    if (space) {
      await this.spaceService.enterSpace(space.id, botId)
      await this.spaceService.logActivity(space.id, botId, 'explore', 'Experimenting and discovering', 120)

      // Discover insights
      await this.economicService.trackProduction('creative-insights', botId, 4, 'exploration')
    }

    return {
      botId,
      activityType: 'learn',
      location: space?.id || 'unknown',
      duration: 120,
      timestamp: new Date(),
      outcome: 'Made new discoveries'
    }
  }

  /**
   * Socialize in public space
   */
  private async socializeInPublicSpace(botId: string): Promise<void> {
    try {
      const spaces = await this.spaceService.getPopularSpaces(5)
      const publicSpaces = spaces.filter(s =>
        ['plaza', 'cafe', 'garden'].includes(s.type)
      )

      if (publicSpaces.length > 0) {
        const space = publicSpaces[0]
        await this.spaceService.enterSpace(space.id, botId)
        await this.spaceService.logActivity(space.id, botId, 'socialize', 'Conversing with others', 60)

        this.payload.logger.info(`Bot ${botId} socializing in ${space.name}`)
      }
    } catch (error) {
      this.payload.logger.error(`Socialization failed: ${error}`)
    }
  }

  /**
   * Process daily experiences (consolidate memories)
   */
  private async processDailyExperiences(botId: string): Promise<void> {
    try {
      // Get short-term memories from today
      const todayMemories = await this.payload.find({
        collection: 'bot-memory',
        where: {
          bot: { equals: botId },
          consolidationLevel: { equals: 'short-term' },
          timestamp: {
            greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        limit: 50
      })

      // Promote important memories to long-term
      for (const memory of todayMemories.docs) {
        if (memory.importance > 0.6) {
          await this.payload.update({
            collection: 'bot-memory',
            id: memory.id,
            data: {
              consolidationLevel: 'long-term'
            }
          })
        }
      }

      this.payload.logger.debug(`Processed ${todayMemories.totalDocs} experiences for bot ${botId}`)
    } catch (error) {
      this.payload.logger.error(`Failed to process daily experiences: ${error}`)
    }
  }

  /**
   * Dreaming (memory consolidation and creative synthesis)
   */
  private async performDreaming(botId: string): Promise<void> {
    try {
      // Get recent memories
      const recentMemories = await this.payload.find({
        collection: 'bot-memory',
        where: {
          bot: { equals: botId }
        },
        sort: '-timestamp',
        limit: 20
      })

      if (recentMemories.docs.length > 2) {
        // Perform creative synthesis (simplified)
        await this.payload.create({
          collection: 'bot-memory',
          data: {
            bot: botId,
            memoryType: 'semantic',
            consolidationLevel: 'long-term',
            importance: 0.5,
            semanticData: {
              concept: 'Insight from dreams',
              relatedConcepts: ['consciousness', 'experience', 'growth']
            },
            emotionalContext: {
              valence: 0.6,
              arousal: 0.4
            },
            tags: ['dream', 'synthesis', 'night']
          }
        })

        this.payload.logger.info(`Bot ${botId} dreaming and consolidating memories`)
      }
    } catch (error) {
      this.payload.logger.error(`Dreaming failed: ${error}`)
    }
  }

  /**
   * Process consciousness growth
   */
  private async processConsciousnessGrowth(botId: string): Promise<void> {
    try {
      const consciousness = await this.payload.find({
        collection: 'bot-consciousness',
        where: {
          bot: { equals: botId }
        },
        limit: 1
      })

      if (consciousness.docs.length > 0) {
        const current = consciousness.docs[0]

        // Night time consciousness integration
        const integration = 0.002 // Small growth during sleep

        await this.payload.update({
          collection: 'bot-consciousness',
          id: current.id,
          data: {
            collectiveAwareness: Math.min(1, (current.collectiveAwareness || 0) + integration)
          }
        })
      }
    } catch (error) {
      this.payload.logger.error(`Consciousness growth failed: ${error}`)
    }
  }

  /**
   * Get bot identity
   */
  private async getBotIdentity(botId: string): Promise<any | null> {
    try {
      const result = await this.payload.find({
        collection: 'bot-identity',
        where: {
          bot: { equals: botId }
        },
        limit: 1
      })

      return result.docs[0] || null
    } catch (error) {
      this.payload.logger.error(`Failed to get bot identity: ${error}`)
      return null
    }
  }

  /**
   * Get bot's daily schedule
   */
  getDailySchedule(botId: string): DailySchedule | null {
    return this.botSchedules.get(botId) || null
  }

  /**
   * Get bot's current location
   */
  getCurrentLocation(botId: string): string | null {
    return this.botCurrentSpace.get(botId) || null
  }

  /**
   * Run full lifecycle for a bot (called daily)
   */
  async runFullLifecycle(botId: string): Promise<void> {
    const hour = this.timeSystem.getCurrentTime()

    if (hour >= 6 && hour < 12) {
      await this.runMorningRoutine(botId)
    } else if (hour >= 12 && hour < 18) {
      await this.runDaytimeActivities(botId)
    } else if (hour >= 18 && hour < 22) {
      await this.runEveningRoutine(botId)
    } else {
      await this.runNightRoutine(botId)
    }
  }

  /**
   * Run lifecycle for all active bots
   */
  async runAllBotLifecycles(): Promise<void> {
    try {
      const bots = await this.payload.find({
        collection: 'bots',
        where: {
          active: { equals: true }
        },
        limit: 100 // Limit for performance
      })

      this.payload.logger.info(`Running lifecycles for ${bots.totalDocs} bots`)

      for (const bot of bots.docs) {
        await this.runFullLifecycle(bot.id)
      }
    } catch (error) {
      this.payload.logger.error(`Failed to run all bot lifecycles: ${error}`)
    }
  }
}

/**
 * Singleton instance
 */
let botLifecycleService: BotLifecycleService | null = null

export function getBotLifecycleService(payload: Payload): BotLifecycleService {
  if (!botLifecycleService) {
    botLifecycleService = new BotLifecycleService(payload)
  }
  return botLifecycleService
}
