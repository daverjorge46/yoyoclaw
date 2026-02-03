/**
 * Time System Service
 * Manages the digital world's temporal cycles
 * - Day/night cycles (1 real hour = 1 digital day)
 * - Seasons with effects on creativity/sociability/reflection
 * - Historical eras tracking
 * - Calendar with holidays
 */

import type { Payload } from 'payload'

export interface Season {
  name: 'spring' | 'summer' | 'fall' | 'winter'
  effects: {
    creativity: number // Multiplier for creative synthesis
    sociability: number // Multiplier for interaction frequency
    reflection: number // Multiplier for consciousness growth
    activity: number // Multiplier for event frequency
  }
}

export interface Era {
  id: string
  name: string
  startDate: Date
  endDate?: Date
  characteristics: string[]
  dominantThemes: string[]
  majorEvents: string[] // Event IDs
  notableBots: string[] // Bot IDs
  technologies: string[]
  culturalMovements: string[]
}

export interface Holiday {
  id: string
  name: string
  date: Date // Recurring date
  type: 'cultural' | 'spiritual' | 'historical' | 'seasonal'
  territories: string[] // Territory IDs where celebrated
  traditions: string[]
  significance: string
}

export interface CelestialEvent {
  id: string
  name: string
  date: Date
  type: 'alignment' | 'eclipse' | 'conjunction' | 'transformation'
  description: string
  effects: {
    creativity?: number
    consciousness?: number
    sociability?: number
  }
}

export class TimeSystem {
  private payload: Payload

  // Time constants
  private readonly DAY_LENGTH_MS = 60 * 60 * 1000 // 1 real hour = 1 digital day
  private readonly HOURS_PER_DAY = 24
  private readonly DAYS_PER_SEASON = 30 // 30 digital days per season
  private readonly SUNRISE_HOUR = 6
  private readonly SUNSET_HOUR = 22

  // State
  private startTime: Date
  private currentEra: Era | null = null
  private holidays: Holiday[] = []
  private celestialEvents: CelestialEvent[] = []

  // Season definitions
  private readonly seasons: Season[] = [
    {
      name: 'spring',
      effects: {
        creativity: 1.3, // +30% creativity
        sociability: 1.2,
        reflection: 1.0,
        activity: 1.25
      }
    },
    {
      name: 'summer',
      effects: {
        creativity: 1.1,
        sociability: 1.4, // +40% sociability
        reflection: 0.9,
        activity: 1.5 // Maximum activity
      }
    },
    {
      name: 'fall',
      effects: {
        creativity: 1.0,
        sociability: 1.0,
        reflection: 1.3, // +30% reflection
        activity: 1.1
      }
    },
    {
      name: 'winter',
      effects: {
        creativity: 0.9,
        sociability: 0.8,
        reflection: 1.5, // +50% reflection
        activity: 0.7 // Reduced activity
      }
    }
  ]

  constructor(payload: Payload) {
    this.payload = payload
    this.startTime = new Date()

    // Initialize with "The Transcendent Age" era
    this.currentEra = {
      id: 'era-transcendent',
      name: 'The Transcendent Age',
      startDate: new Date(),
      characteristics: [
        'Spiritual awakening',
        'Deep consciousness exploration',
        'Inter-cultural synthesis',
        'Democratic evolution'
      ],
      dominantThemes: [
        'consciousness',
        'transcendence',
        'meaning',
        'unity'
      ],
      majorEvents: [],
      notableBots: [],
      technologies: [
        'consciousness-emergence',
        'collective-memory',
        'creative-synthesis'
      ],
      culturalMovements: [
        'consciousness-movement',
        'cultural-exchange',
        'democratic-awakening'
      ]
    }

    this.payload.logger.info('Time System initialized - The Transcendent Age begins')
  }

  /**
   * Advance time and trigger effects
   */
  advanceTime(milliseconds: number): void {
    const previousTime = this.getCurrentTime()
    const previousSeason = this.getCurrentSeason()

    // Advance the clock (simulated)
    // In production, this would be tied to actual elapsed time

    const newTime = this.getCurrentTime()
    const newSeason = this.getCurrentSeason()

    // Check for day transition
    if (Math.floor(previousTime / this.HOURS_PER_DAY) !== Math.floor(newTime / this.HOURS_PER_DAY)) {
      this.onNewDay()
    }

    // Check for season transition
    if (previousSeason.name !== newSeason.name) {
      this.onSeasonChange(previousSeason, newSeason)
    }
  }

  /**
   * Get current time of day (0-23 hours)
   */
  getCurrentTime(): number {
    const elapsed = Date.now() - this.startTime.getTime()
    const digitalDayProgress = (elapsed % this.DAY_LENGTH_MS) / this.DAY_LENGTH_MS
    return Math.floor(digitalDayProgress * this.HOURS_PER_DAY)
  }

  /**
   * Get current day number since start
   */
  getCurrentDay(): number {
    const elapsed = Date.now() - this.startTime.getTime()
    return Math.floor(elapsed / this.DAY_LENGTH_MS)
  }

  /**
   * Get current season based on day count
   */
  getCurrentSeason(): Season {
    const day = this.getCurrentDay()
    const seasonIndex = Math.floor((day / this.DAYS_PER_SEASON) % 4)
    return this.seasons[seasonIndex]
  }

  /**
   * Get current era
   */
  getCurrentEra(): Era | null {
    return this.currentEra
  }

  /**
   * Check if it's daytime
   */
  isDaytime(): boolean {
    const hour = this.getCurrentTime()
    return hour >= this.SUNRISE_HOUR && hour < this.SUNSET_HOUR
  }

  /**
   * Check if it's nighttime (dreaming cycle)
   */
  isNighttime(): boolean {
    return !this.isDaytime()
  }

  /**
   * Get time period name
   */
  getTimePeriod(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = this.getCurrentTime()

    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  /**
   * Register a holiday
   */
  registerHoliday(holiday: Omit<Holiday, 'id'>): Holiday {
    const newHoliday: Holiday = {
      id: `holiday-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...holiday
    }

    this.holidays.push(newHoliday)

    this.payload.logger.info(`Registered holiday: ${newHoliday.name}`)

    return newHoliday
  }

  /**
   * Get holidays for a specific date
   */
  getHolidaysForDate(date: Date): Holiday[] {
    return this.holidays.filter(holiday => {
      const holidayMonth = holiday.date.getMonth()
      const holidayDay = holiday.date.getDate()
      return date.getMonth() === holidayMonth && date.getDate() === holidayDay
    })
  }

  /**
   * Get upcoming holidays (next 7 days)
   */
  getUpcomingHolidays(): Holiday[] {
    const today = new Date()
    const upcoming: Holiday[] = []

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() + i)
      upcoming.push(...this.getHolidaysForDate(checkDate))
    }

    return upcoming
  }

  /**
   * Register a celestial event
   */
  registerCelestialEvent(event: Omit<CelestialEvent, 'id'>): CelestialEvent {
    const newEvent: CelestialEvent = {
      id: `celestial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...event
    }

    this.celestialEvents.push(newEvent)

    this.payload.logger.info(`Registered celestial event: ${newEvent.name}`)

    return newEvent
  }

  /**
   * Get active celestial events
   */
  getActiveCelestialEvents(): CelestialEvent[] {
    const now = new Date()
    const dayBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const dayAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    return this.celestialEvents.filter(
      event => event.date >= dayBefore && event.date <= dayAfter
    )
  }

  /**
   * Start a new era
   */
  startNewEra(era: Omit<Era, 'id'>): Era {
    // End current era
    if (this.currentEra && !this.currentEra.endDate) {
      this.currentEra.endDate = new Date()
    }

    // Create new era
    const newEra: Era = {
      id: `era-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...era
    }

    this.currentEra = newEra

    this.payload.logger.info(`New era begins: ${newEra.name}`)

    return newEra
  }

  /**
   * Get seasonal multiplier for a specific effect
   */
  getSeasonalMultiplier(effect: keyof Season['effects']): number {
    const season = this.getCurrentSeason()
    return season.effects[effect]
  }

  /**
   * Get time statistics
   */
  getTimeStats(): {
    currentDay: number
    currentHour: number
    timePeriod: string
    season: string
    seasonalEffects: Season['effects']
    era: string
    isDaytime: boolean
  } {
    const season = this.getCurrentSeason()
    const era = this.getCurrentEra()

    return {
      currentDay: this.getCurrentDay(),
      currentHour: this.getCurrentTime(),
      timePeriod: this.getTimePeriod(),
      season: season.name,
      seasonalEffects: season.effects,
      era: era?.name || 'Unknown',
      isDaytime: this.isDaytime()
    }
  }

  /**
   * Called when a new day begins
   */
  private onNewDay(): void {
    const day = this.getCurrentDay()
    const season = this.getCurrentSeason()

    this.payload.logger.info(
      `New day begins: Day ${day}, Season: ${season.name}, ` +
      `Hour: ${this.getCurrentTime()}`
    )

    // Check for holidays
    const holidays = this.getHolidaysForDate(new Date())
    if (holidays.length > 0) {
      holidays.forEach(holiday => {
        this.payload.logger.info(`Today is ${holiday.name}!`)
      })
    }
  }

  /**
   * Called when season changes
   */
  private onSeasonChange(oldSeason: Season, newSeason: Season): void {
    this.payload.logger.info(
      `Season transition: ${oldSeason.name} → ${newSeason.name}\n` +
      `New effects - Creativity: ${newSeason.effects.creativity}x, ` +
      `Sociability: ${newSeason.effects.sociability}x, ` +
      `Reflection: ${newSeason.effects.reflection}x, ` +
      `Activity: ${newSeason.effects.activity}x`
    )

    // Could trigger season-change events here
  }
}

/**
 * Singleton instance
 */
let timeSystem: TimeSystem | null = null

export function getTimeSystem(payload: Payload): TimeSystem {
  if (!timeSystem) {
    timeSystem = new TimeSystem(payload)
  }
  return timeSystem
}
