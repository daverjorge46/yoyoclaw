/**
 * World Services
 * Export all digital world infrastructure services
 */

export { TimeSystem, getTimeSystem } from './time-system'
export type { Season, Era, Holiday, CelestialEvent } from './time-system'

export { TerritoryService, getTerritoryService } from './territory-service'
export type { TerritoryStats, PopulationChange } from './territory-service'

export { SpaceService, getSpaceService } from './space-service'
export type { SpaceActivity, SpaceOccupancy } from './space-service'

export { OrganizationService, getOrganizationService } from './organization-service'
export type { OrganizationMembership, LeadershipChange } from './organization-service'

export { EventService, getEventService } from './event-service'
export type { EventImpact, AttendeeExperience } from './event-service'

export { EconomicService, getEconomicService } from './economic-service'
export type {
  ResourceAllocation,
  ProductionRecord,
  ConsumptionRecord
} from './economic-service'

export { MarketService, getMarketService } from './market-service'
export type { Trade, MarketListing, MarketStats } from './market-service'

export { GovernanceService, getGovernanceService } from './governance-service'
export type { VoteResults, ProposalStatus } from './governance-service'

export { JusticeService, getJusticeService } from './justice-service'
export type { CaseDetails, Verdict, Sentence } from './justice-service'

export { WorldOrchestrator, getWorldOrchestrator } from './world-orchestrator'
export type { WorldState } from './world-orchestrator'

export { BotLifecycleService, getBotLifecycleService } from './bot-lifecycle'
export type { BotActivity, DailySchedule } from './bot-lifecycle'
