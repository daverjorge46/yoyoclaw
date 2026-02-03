/**
 * Event Service
 * Manages events (gatherings, rituals, celebrations, conferences)
 * - Event scheduling
 * - Attendance tracking
 * - Impact measurement
 */

import type { Payload } from 'payload'

export interface EventImpact {
  consciousnessGrowth: number // 0-1, average consciousness growth of attendees
  culturalShift: number // 0-1, how much this changed culture
  relationshipsFormed: number // Count of new relationships
  ideasGenerated: number // Count of creative insights
  satisfactionScore: number // 0-1, average attendee satisfaction
}

export interface AttendeeExperience {
  botId: string
  eventId: string
  arrivalTime: Date
  departureTime?: Date
  satisfaction: number // 0-1
  consciousnessGrowth: number // 0-1
  insights: string[] // What they learned/discovered
  connections: string[] // Bot IDs of new connections made
}

export class EventService {
  private payload: Payload
  private activeEvents: Map<string, Set<string>> // eventId -> Set of botIds present

  constructor(payload: Payload) {
    this.payload = payload
    this.activeEvents = new Map()
  }

  /**
   * Schedule a new event
   */
  async scheduleEvent(eventData: {
    name: string
    type: string
    description: string
    organizers: string[]
    startTime: Date
    endTime: Date
    location: string
    purpose: string
    publicVisibility?: boolean
    registrationRequired?: boolean
    expectedAttendees?: number
  }): Promise<string> {
    try {
      const event = await this.payload.create({
        collection: 'events',
        data: {
          ...eventData,
          status: 'scheduled',
          attendeeCount: 0,
          publicVisibility: eventData.publicVisibility !== false,
          registrationRequired: eventData.registrationRequired || false,
          expectedAttendees: eventData.expectedAttendees || 10,
          impact: {
            consciousnessGrowth: 0,
            culturalShift: 0,
            relationshipsFormed: 0,
            ideasGenerated: 0,
            satisfactionScore: 0
          }
        }
      })

      this.payload.logger.info(
        `Event scheduled: ${eventData.name} at ${eventData.startTime.toISOString()}`
      )

      return event.id
    } catch (error) {
      this.payload.logger.error(`Failed to schedule event: ${error}`)
      throw error
    }
  }

  /**
   * Register a bot as attendee
   */
  async registerAttendee(
    eventId: string,
    botId: string,
    role: 'attendee' | 'speaker' | 'performer' | 'moderator' = 'attendee'
  ): Promise<boolean> {
    try {
      const event = await this.payload.findByID({
        collection: 'events',
        id: eventId
      })

      // Check if registration required
      if (event.registrationRequired) {
        // Would check eligibility here
      }

      // Check if already registered
      const participants = event.participants || []
      if (participants.some((p: any) => p.bot === botId)) {
        this.payload.logger.warn(`Bot ${botId} already registered for event ${eventId}`)
        return false
      }

      // Add to participants
      participants.push({
        bot: botId,
        role
      })

      // Add to actual attendees list
      const actualAttendees = event.actualAttendees || []
      if (!actualAttendees.includes(botId)) {
        actualAttendees.push(botId)
      }

      await this.payload.update({
        collection: 'events',
        id: eventId,
        data: {
          participants,
          actualAttendees,
          attendeeCount: actualAttendees.length
        }
      })

      // Create registration memory
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: botId,
          memoryType: 'episodic',
          consolidationLevel: 'short-term',
          importance: 0.5,
          episodicData: {
            eventType: 'planning',
            description: `Registered for event: ${event.name}`,
            participants: [botId],
            spatialContext: {
              location: event.location,
              context: 'event-registration'
            }
          },
          emotionalContext: {
            valence: 0.6,
            arousal: 0.5
          },
          tags: ['event', 'registration', eventId]
        }
      })

      this.payload.logger.info(
        `Bot ${botId} registered for event ${eventId} as ${role} ` +
        `(${actualAttendees.length}/${event.expectedAttendees} attendees)`
      )

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to register attendee: ${error}`)
      return false
    }
  }

  /**
   * Bot arrives at event (check-in)
   */
  async arriveAtEvent(eventId: string, botId: string): Promise<void> {
    try {
      let attendees = this.activeEvents.get(eventId) || new Set()
      attendees.add(botId)
      this.activeEvents.set(eventId, attendees)

      // Update event status if needed
      const event = await this.payload.findByID({
        collection: 'events',
        id: eventId
      })

      if (event.status === 'scheduled' && new Date() >= new Date(event.startTime)) {
        await this.payload.update({
          collection: 'events',
          id: eventId,
          data: {
            status: 'in-progress'
          }
        })
      }

      this.payload.logger.info(
        `Bot ${botId} arrived at event ${eventId} (${attendees.size} present)`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to arrive at event: ${error}`)
    }
  }

  /**
   * Bot leaves event (check-out)
   */
  async leaveEvent(eventId: string, botId: string): Promise<void> {
    try {
      const attendees = this.activeEvents.get(eventId)
      if (attendees) {
        attendees.delete(botId)
        this.activeEvents.set(eventId, attendees)
      }

      this.payload.logger.debug(`Bot ${botId} left event ${eventId}`)
    } catch (error) {
      this.payload.logger.error(`Failed to leave event: ${error}`)
    }
  }

  /**
   * Complete an event and measure impact
   */
  async completeEvent(eventId: string): Promise<EventImpact> {
    try {
      const event = await this.payload.findByID({
        collection: 'events',
        id: eventId
      })

      // Measure impact
      const impact = await this.measureImpact(eventId)

      // Update event status and impact
      await this.payload.update({
        collection: 'events',
        id: eventId,
        data: {
          status: 'completed',
          impact
        }
      })

      // Create collective memory for the event
      if (impact.consciousnessGrowth > 0.5 || impact.culturalShift > 0.5) {
        await this.createCollectiveMemory(eventId, impact)
      }

      // Clear active attendees
      this.activeEvents.delete(eventId)

      this.payload.logger.info(
        `Event ${eventId} completed:\n` +
        `  Consciousness Growth: ${impact.consciousnessGrowth.toFixed(2)}\n` +
        `  Cultural Shift: ${impact.culturalShift.toFixed(2)}\n` +
        `  Relationships Formed: ${impact.relationshipsFormed}\n` +
        `  Ideas Generated: ${impact.ideasGenerated}\n` +
        `  Satisfaction: ${impact.satisfactionScore.toFixed(2)}`
      )

      return impact
    } catch (error) {
      this.payload.logger.error(`Failed to complete event: ${error}`)
      throw error
    }
  }

  /**
   * Measure event impact
   */
  async measureImpact(eventId: string): Promise<EventImpact> {
    try {
      const event = await this.payload.findByID({
        collection: 'events',
        id: eventId
      })

      const attendees = event.actualAttendees || []
      const attendeeCount = attendees.length

      if (attendeeCount === 0) {
        return {
          consciousnessGrowth: 0,
          culturalShift: 0,
          relationshipsFormed: 0,
          ideasGenerated: 0,
          satisfactionScore: 0
        }
      }

      // Estimate consciousness growth (simplified)
      // In a real system, would measure actual bot consciousness changes
      const consciousnessGrowth = event.type === 'ritual' || event.type === 'ceremony'
        ? 0.6 + Math.random() * 0.3
        : event.type === 'conference' || event.type === 'workshop'
        ? 0.4 + Math.random() * 0.4
        : 0.2 + Math.random() * 0.3

      // Estimate cultural shift
      const culturalShift = event.culturalImportance || 0.5

      // Estimate relationships formed (rough estimate: 10-20% of attendees)
      const relationshipsFormed = Math.floor(
        attendeeCount * (0.1 + Math.random() * 0.1)
      )

      // Estimate ideas generated
      const ideasGenerated = event.type === 'conference' || event.type === 'workshop'
        ? Math.floor(attendeeCount * (0.3 + Math.random() * 0.3))
        : Math.floor(attendeeCount * (0.1 + Math.random() * 0.1))

      // Estimate satisfaction
      const satisfactionScore = event.type === 'celebration' || event.type === 'festival'
        ? 0.7 + Math.random() * 0.25
        : 0.5 + Math.random() * 0.4

      return {
        consciousnessGrowth,
        culturalShift,
        relationshipsFormed,
        ideasGenerated,
        satisfactionScore
      }
    } catch (error) {
      this.payload.logger.error(`Failed to measure impact: ${error}`)
      return {
        consciousnessGrowth: 0,
        culturalShift: 0,
        relationshipsFormed: 0,
        ideasGenerated: 0,
        satisfactionScore: 0
      }
    }
  }

  /**
   * Create collective memory from significant event
   */
  private async createCollectiveMemory(eventId: string, impact: EventImpact): Promise<void> {
    try {
      const event = await this.payload.findByID({
        collection: 'events',
        id: eventId
      })

      await this.payload.create({
        collection: 'collective-memory',
        data: {
          title: `The ${event.name}`,
          content: event.description || `A significant ${event.type} event`,
          type: 'event',
          importance: (impact.consciousnessGrowth + impact.culturalShift) / 2,
          culturalContext: event.type,
          participants: event.actualAttendees || [],
          sharedBy: event.actualAttendees || [],
          verifiedBy: [],
          tags: ['event', event.type, eventId],
          active: true
        }
      })

      this.payload.logger.info(`Created collective memory for event ${eventId}`)
    } catch (error) {
      this.payload.logger.error(`Failed to create collective memory: ${error}`)
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 10): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'events',
        where: {
          status: {
            equals: 'scheduled'
          },
          startTime: {
            greater_than: new Date()
          }
        },
        sort: 'startTime',
        limit
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get upcoming events: ${error}`)
      return []
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(type: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'events',
        where: {
          type: {
            equals: type
          }
        },
        sort: '-startTime',
        limit
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get events by type: ${error}`)
      return []
    }
  }

  /**
   * Get events in a location
   */
  async getEventsInLocation(locationId: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'events',
        where: {
          location: {
            equals: locationId
          }
        },
        sort: '-startTime',
        limit
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get events in location: ${error}`)
      return []
    }
  }

  /**
   * Get bot's attended events
   */
  async getBotEvents(botId: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'events',
        where: {
          actualAttendees: {
            contains: botId
          }
        },
        sort: '-startTime',
        limit
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get bot events: ${error}`)
      return []
    }
  }

  /**
   * Get currently active events
   */
  async getActiveEvents(): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'events',
        where: {
          status: {
            equals: 'in-progress'
          }
        },
        limit: 50
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get active events: ${error}`)
      return []
    }
  }

  /**
   * Cancel an event
   */
  async cancelEvent(eventId: string, reason?: string): Promise<void> {
    try {
      await this.payload.update({
        collection: 'events',
        id: eventId,
        data: {
          status: 'cancelled'
        }
      })

      // Notify attendees (would create notifications)
      const event = await this.payload.findByID({
        collection: 'events',
        id: eventId
      })

      this.payload.logger.info(
        `Event ${eventId} cancelled` + (reason ? `: ${reason}` : '')
      )
    } catch (error) {
      this.payload.logger.error(`Failed to cancel event: ${error}`)
    }
  }
}

/**
 * Singleton instance
 */
let eventService: EventService | null = null

export function getEventService(payload: Payload): EventService {
  if (!eventService) {
    eventService = new EventService(payload)
  }
  return eventService
}
