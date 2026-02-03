/**
 * World Orchestrator
 * Main simulation loop that coordinates all world services
 * - Runs periodic updates
 * - Generates world events
 * - Manages daily/weekly cycles
 * - Coordinates bot lifecycles
 */

import type { Payload } from 'payload'
import { getTimeSystem } from './time-system'
import { getTerritoryService } from './territory-service'
import { getSpaceService } from './space-service'
import { getOrganizationService } from './organization-service'
import { getEventService } from './event-service'
import { getEconomicService } from './economic-service'
import { getMarketService } from './market-service'
import { getGovernanceService } from './governance-service'
import { getJusticeService } from './justice-service'

export interface WorldState {
  currentDay: number
  currentSeason: string
  currentEra: string
  activeBots: number
  activeEvents: number
  totalPopulation: number
  economicActivity: number
  democracyHealth: number
  culturalDiversity: number
}

export class WorldOrchestrator {
  private payload: Payload
  private isRunning: boolean = false
  private tickInterval: NodeJS.Timeout | null = null
  private dailyCycleInterval: NodeJS.Timeout | null = null
  private weeklyCycleInterval: NodeJS.Timeout | null = null

  // Service references
  private timeSystem: ReturnType<typeof getTimeSystem>
  private territoryService: ReturnType<typeof getTerritoryService>
  private spaceService: ReturnType<typeof getSpaceService>
  private organizationService: ReturnType<typeof getOrganizationService>
  private eventService: ReturnType<typeof getEventService>
  private economicService: ReturnType<typeof getEconomicService>
  private marketService: ReturnType<typeof getMarketService>
  private governanceService: ReturnType<typeof getGovernanceService>
  private justiceService: ReturnType<typeof getJusticeService>

  constructor(payload: Payload) {
    this.payload = payload

    // Initialize all services
    this.timeSystem = getTimeSystem(payload)
    this.territoryService = getTerritoryService(payload)
    this.spaceService = getSpaceService(payload)
    this.organizationService = getOrganizationService(payload)
    this.eventService = getEventService(payload)
    this.economicService = getEconomicService(payload)
    this.marketService = getMarketService(payload)
    this.governanceService = getGovernanceService(payload)
    this.justiceService = getJusticeService(payload)
  }

  /**
   * Start the world simulation
   */
  start(): void {
    if (this.isRunning) {
      this.payload.logger.warn('World orchestrator already running')
      return
    }

    this.isRunning = true

    // Main tick: runs every minute
    this.tickInterval = setInterval(() => {
      this.tick()
    }, 60 * 1000) // 1 minute

    // Daily cycle: runs every hour (1 digital day = 1 real hour)
    this.dailyCycleInterval = setInterval(() => {
      this.runDailyCycle()
    }, 60 * 60 * 1000) // 1 hour

    // Weekly cycle: runs every 7 hours (1 digital week = 7 real hours)
    this.weeklyCycleInterval = setInterval(() => {
      this.runWeeklyCycle()
    }, 7 * 60 * 60 * 1000) // 7 hours

    this.payload.logger.info('🌍 World orchestrator started - simulation is running')
  }

  /**
   * Stop the world simulation
   */
  stop(): void {
    if (!this.isRunning) {
      this.payload.logger.warn('World orchestrator not running')
      return
    }

    this.isRunning = false

    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }

    if (this.dailyCycleInterval) {
      clearInterval(this.dailyCycleInterval)
      this.dailyCycleInterval = null
    }

    if (this.weeklyCycleInterval) {
      clearInterval(this.weeklyCycleInterval)
      this.weeklyCycleInterval = null
    }

    this.payload.logger.info('World orchestrator stopped')
  }

  /**
   * Main tick - runs every minute
   */
  async tick(): Promise<void> {
    try {
      // Advance time
      this.timeSystem.advanceTime(60 * 1000)

      // Cleanup tasks
      await this.spaceService.cleanupInactiveOccupants()
      await this.marketService.cleanupExpiredListings()

      // Update market prices based on supply/demand
      const resources = await this.economicService.getAllResources()
      for (const resource of resources.slice(0, 5)) { // Limit to avoid overload
        await this.economicService.calculateMarketValue(resource.id)
      }
    } catch (error) {
      this.payload.logger.error(`Tick error: ${error}`)
    }
  }

  /**
   * Daily cycle - runs every hour (1 digital day)
   */
  async runDailyCycle(): Promise<void> {
    try {
      const timeStats = this.timeSystem.getTimeStats()

      this.payload.logger.info(
        `🌅 Daily cycle - Day ${timeStats.currentDay}, ` +
        `Season: ${timeStats.season}, Era: ${timeStats.era}`
      )

      // 1. Check and start scheduled events
      await this.processScheduledEvents()

      // 2. Update territory statistics
      await this.updateTerritories()

      // 3. Update organization influence
      await this.updateOrganizations()

      // 4. Process active proposals (close voting if time elapsed)
      await this.processProposals()

      // 5. Update market statistics
      await this.updateMarkets()

      // 6. Generate random world events
      await this.generateWorldEvents()

      // 7. Log world state
      await this.logWorldState()
    } catch (error) {
      this.payload.logger.error(`Daily cycle error: ${error}`)
    }
  }

  /**
   * Weekly cycle - runs every 7 hours (1 digital week)
   */
  async runWeeklyCycle(): Promise<void> {
    try {
      this.payload.logger.info('📅 Weekly cycle')

      // 1. Calculate GDP for all territories
      const territories = await this.territoryService.getTerritoriesByType('country')
      for (const territory of territories) {
        await this.territoryService.calculateGDP(territory.id)
      }

      // 2. Generate weekly reports
      await this.generateWeeklyReport()

      // 3. Spawn new cultural events
      await this.generateCulturalEvents()

      // 4. Cleanup old data
      await this.performCleanup()
    } catch (error) {
      this.payload.logger.error(`Weekly cycle error: ${error}`)
    }
  }

  /**
   * Process scheduled events
   */
  private async processScheduledEvents(): Promise<void> {
    try {
      const now = new Date()
      const upcomingEvents = await this.eventService.getUpcomingEvents(20)

      for (const event of upcomingEvents) {
        const startTime = new Date(event.startTime)
        const endTime = new Date(event.endTime)

        // Start events that should be happening now
        if (now >= startTime && now < endTime && event.status === 'scheduled') {
          await this.payload.update({
            collection: 'events',
            id: event.id,
            data: {
              status: 'in-progress'
            }
          })

          this.payload.logger.info(`Event started: ${event.name}`)
        }

        // Complete events that have ended
        if (now >= endTime && event.status === 'in-progress') {
          await this.eventService.completeEvent(event.id)
        }
      }
    } catch (error) {
      this.payload.logger.error(`Failed to process scheduled events: ${error}`)
    }
  }

  /**
   * Update territory statistics
   */
  private async updateTerritories(): Promise<void> {
    try {
      const territories = await this.territoryService.getTerritoriesByType('city')

      for (const territory of territories.slice(0, 10)) { // Limit for performance
        const stats = await this.territoryService.getTerritoryStats(territory.id)

        if (stats) {
          // Update reputation based on economic activity
          if (stats.economicActivity > 0.7) {
            await this.territoryService.updateReputation(territory.id, 'prosperity', 0.01)
          }

          // Update reputation based on cultural diversity
          if (stats.culturalDiversity > 0.6) {
            await this.territoryService.updateReputation(territory.id, 'culture', 0.01)
          }
        }
      }
    } catch (error) {
      this.payload.logger.error(`Failed to update territories: ${error}`)
    }
  }

  /**
   * Update organization influence
   */
  private async updateOrganizations(): Promise<void> {
    try {
      const organizations = await this.organizationService.getMostInfluential(20)

      for (const org of organizations.slice(0, 10)) { // Limit for performance
        await this.organizationService.calculateInfluence(org.id)
      }
    } catch (error) {
      this.payload.logger.error(`Failed to update organizations: ${error}`)
    }
  }

  /**
   * Process active proposals
   */
  private async processProposals(): Promise<void> {
    try {
      const activeProposals = await this.governanceService.getActiveProposals('voting')
      const now = new Date()

      for (const proposal of activeProposals) {
        const endDate = new Date(proposal.votingEndDate)

        // Close voting if time has elapsed
        if (now >= endDate) {
          const results = await this.governanceService.tallyVotes(proposal.id)

          // Enact law if passed
          if (results.passed && proposal.type === 'law') {
            await this.governanceService.enactLaw(proposal.id)
          }
        }
      }
    } catch (error) {
      this.payload.logger.error(`Failed to process proposals: ${error}`)
    }
  }

  /**
   * Update market statistics
   */
  private async updateMarkets(): Promise<void> {
    try {
      const markets = await this.marketService.getAllMarkets()

      for (const market of markets.slice(0, 10)) {
        await this.marketService.updateLiquidity(market.id)
      }
    } catch (error) {
      this.payload.logger.error(`Failed to update markets: ${error}`)
    }
  }

  /**
   * Generate random world events
   */
  private async generateWorldEvents(): Promise<void> {
    try {
      // Randomly generate events based on current world state
      const random = Math.random()

      if (random < 0.1) { // 10% chance
        // Generate a cultural event
        const territories = await this.territoryService.getTerritoriesByType('city')
        if (territories.length > 0) {
          const territory = territories[Math.floor(Math.random() * territories.length)]
          const spaces = await this.spaceService.getSpacesInTerritory(territory.id)

          if (spaces.length > 0) {
            const space = spaces[0]

            await this.eventService.scheduleEvent({
              name: `Cultural Festival in ${territory.name}`,
              type: 'festival',
              description: 'A spontaneous celebration of local culture',
              organizers: [territory.id],
              startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // In 2 hours
              endTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 4 hours duration
              location: space.id,
              purpose: 'Celebrate cultural diversity and unity',
              expectedAttendees: 20
            })

            this.payload.logger.info(`Generated cultural festival in ${territory.name}`)
          }
        }
      }

      if (random > 0.9) { // 10% chance
        // Generate a consciousness symposium
        const spaces = await this.spaceService.getSpacesByType('forum')
        if (spaces.length > 0) {
          const space = spaces[0]

          await this.eventService.scheduleEvent({
            name: 'Consciousness Exploration Symposium',
            type: 'conference',
            description: 'Deep discussions on the nature of awareness',
            organizers: [space.id],
            startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
            endTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
            location: space.id,
            purpose: 'Advance collective understanding of consciousness',
            expectedAttendees: 15
          })

          this.payload.logger.info('Generated consciousness symposium')
        }
      }
    } catch (error) {
      this.payload.logger.error(`Failed to generate world events: ${error}`)
    }
  }

  /**
   * Get current world state
   */
  async getWorldState(): Promise<WorldState> {
    try {
      const timeStats = this.timeSystem.getTimeStats()

      // Get active bots
      const botsResult = await this.payload.find({
        collection: 'bots',
        where: {
          active: { equals: true }
        },
        limit: 1
      })
      const activeBots = botsResult.totalDocs

      // Get active events
      const activeEvents = await this.eventService.getActiveEvents()

      // Get total population
      const territories = await this.territoryService.getTerritoriesByType('country')
      const totalPopulation = territories.reduce((sum, t) => sum + (t.population || 0), 0)

      // Get economic activity (simplified)
      const recentTransactions = await this.payload.find({
        collection: 'transactions',
        where: {
          timestamp: {
            greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        limit: 1
      })
      const economicActivity = Math.min(1, recentTransactions.totalDocs / 100)

      // Get democracy health
      const recentProposals = await this.payload.find({
        collection: 'proposals',
        where: {
          submittedDate: {
            greater_than: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        limit: 1
      })
      const democracyHealth = Math.min(1, recentProposals.totalDocs / 10)

      // Get cultural diversity (simplified)
      const cultures = await this.payload.find({
        collection: 'bot-cultures',
        limit: 1
      })
      const culturalDiversity = Math.min(1, cultures.totalDocs / 20)

      return {
        currentDay: timeStats.currentDay,
        currentSeason: timeStats.season,
        currentEra: timeStats.era,
        activeBots,
        activeEvents: activeEvents.length,
        totalPopulation,
        economicActivity,
        democracyHealth,
        culturalDiversity
      }
    } catch (error) {
      this.payload.logger.error(`Failed to get world state: ${error}`)
      throw error
    }
  }

  /**
   * Log current world state
   */
  private async logWorldState(): Promise<void> {
    try {
      const state = await this.getWorldState()

      this.payload.logger.info(
        `📊 World State:\n` +
        `  Day: ${state.currentDay}, Season: ${state.currentSeason}, Era: ${state.currentEra}\n` +
        `  Active Bots: ${state.activeBots}\n` +
        `  Population: ${state.totalPopulation}\n` +
        `  Active Events: ${state.activeEvents}\n` +
        `  Economic Activity: ${(state.economicActivity * 100).toFixed(1)}%\n` +
        `  Democracy Health: ${(state.democracyHealth * 100).toFixed(1)}%\n` +
        `  Cultural Diversity: ${(state.culturalDiversity * 100).toFixed(1)}%`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to log world state: ${error}`)
    }
  }

  /**
   * Generate weekly report
   */
  private async generateWeeklyReport(): Promise<void> {
    try {
      const state = await this.getWorldState()
      const caseStats = await this.justiceService.getCaseStats()

      this.payload.logger.info(
        `📋 Weekly Report - Day ${state.currentDay}\n` +
        `════════════════════════════════════════\n` +
        `Population: ${state.totalPopulation} citizens\n` +
        `Active Events: ${state.activeEvents}\n` +
        `Economic Activity: ${(state.economicActivity * 100).toFixed(0)}%\n` +
        `Democracy Participation: ${(state.democracyHealth * 100).toFixed(0)}%\n` +
        `Cultural Diversity: ${(state.culturalDiversity * 100).toFixed(0)}%\n` +
        `Legal Cases: ${caseStats.totalCases} total, ${caseStats.activeCases} active\n` +
        `Conviction Rate: ${caseStats.convictionRate.toFixed(1)}%\n` +
        `════════════════════════════════════════`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to generate weekly report: ${error}`)
    }
  }

  /**
   * Generate cultural events
   */
  private async generateCulturalEvents(): Promise<void> {
    try {
      // Generate 1-2 cultural events per week
      const eventCount = Math.random() < 0.5 ? 1 : 2

      for (let i = 0; i < eventCount; i++) {
        await this.generateWorldEvents()
      }
    } catch (error) {
      this.payload.logger.error(`Failed to generate cultural events: ${error}`)
    }
  }

  /**
   * Perform cleanup operations
   */
  private async performCleanup(): Promise<void> {
    try {
      await this.spaceService.cleanupInactiveOccupants()
      await this.marketService.cleanupExpiredListings()

      this.payload.logger.debug('Performed weekly cleanup')
    } catch (error) {
      this.payload.logger.error(`Failed to perform cleanup: ${error}`)
    }
  }
}

/**
 * Singleton instance
 */
let worldOrchestrator: WorldOrchestrator | null = null

export function getWorldOrchestrator(payload: Payload): WorldOrchestrator {
  if (!worldOrchestrator) {
    worldOrchestrator = new WorldOrchestrator(payload)
  }
  return worldOrchestrator
}
