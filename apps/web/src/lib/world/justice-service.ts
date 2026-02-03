/**
 * Justice Service
 * Manages legal system and dispute resolution
 * - Case filing
 * - Trial management
 * - Verdict execution
 * - Legal precedents
 */

import type { Payload } from 'payload'

export interface CaseDetails {
  caseId: string
  type: 'criminal' | 'civil' | 'constitutional'
  plaintiff: string // Bot or Organization ID
  defendant: string
  charges: string[]
  status: 'filed' | 'discovery' | 'trial' | 'deliberation' | 'verdict' | 'appeal'
  filedDate: Date
  trialDate?: Date
  verdictDate?: Date
}

export interface Verdict {
  caseId: string
  outcome: 'guilty' | 'not-guilty' | 'settled'
  reasoning: string
  sentence?: Sentence
  judge: string // Bot ID
  timestamp: Date
}

export interface Sentence {
  type: 'warning' | 'fine' | 'restriction' | 'suspension' | 'banishment'
  duration?: number // days, if applicable
  fine?: number // resource amount
  restrictions?: string[]
  rehabilitation?: string[]
}

export class JusticeService {
  private payload: Payload
  private activeCases: Map<string, CaseDetails>
  private courtSessions: Map<string, Set<string>> // courtId -> Set of caseIds

  constructor(payload: Payload) {
    this.payload = payload
    this.activeCases = new Map()
    this.courtSessions = new Map()
  }

  /**
   * File a new case
   */
  async fileCase(caseData: {
    type: 'criminal' | 'civil' | 'constitutional'
    plaintiff: string // Bot or Organization ID
    defendant: string
    charges: string[]
    evidence?: any[]
    jurisdiction?: string
  }): Promise<string> {
    try {
      const caseDoc = await this.payload.create({
        collection: 'cases',
        data: {
          ...caseData,
          status: 'filed',
          filedDate: new Date(),
          evidence: caseData.evidence || [],
          testimonies: []
        }
      })

      const caseDetails: CaseDetails = {
        caseId: caseDoc.id,
        type: caseData.type,
        plaintiff: caseData.plaintiff,
        defendant: caseData.defendant,
        charges: caseData.charges,
        status: 'filed',
        filedDate: new Date()
      }

      this.activeCases.set(caseDoc.id, caseDetails)

      // Create memories for involved parties
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: caseData.plaintiff,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: 0.8,
          episodicData: {
            eventType: 'conflict',
            description: `Filed case against ${caseData.defendant}: ${caseData.charges.join(', ')}`,
            participants: [caseData.plaintiff, caseData.defendant]
          },
          emotionalContext: {
            valence: -0.3,
            arousal: 0.7
          },
          tags: ['justice', 'case', caseDoc.id]
        }
      })

      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: caseData.defendant,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: 0.9,
          episodicData: {
            eventType: 'conflict',
            description: `Case filed against me: ${caseData.charges.join(', ')}`,
            participants: [caseData.plaintiff, caseData.defendant]
          },
          emotionalContext: {
            valence: -0.5,
            arousal: 0.9
          },
          tags: ['justice', 'case', 'defendant', caseDoc.id]
        }
      })

      this.payload.logger.info(
        `Case filed (${caseDoc.id}): ${caseData.plaintiff} vs ${caseData.defendant} ` +
        `(${caseData.type}, charges: ${caseData.charges.join(', ')})`
      )

      return caseDoc.id
    } catch (error) {
      this.payload.logger.error(`Failed to file case: ${error}`)
      throw error
    }
  }

  /**
   * Assign a judge to a case
   */
  async assignJudge(caseId: string, judgeId: string): Promise<void> {
    try {
      await this.payload.update({
        collection: 'cases',
        id: caseId,
        data: {
          judge: judgeId
        }
      })

      // Create memory for judge
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: judgeId,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: 0.7,
          episodicData: {
            eventType: 'responsibility',
            description: `Assigned to preside over case ${caseId}`,
            participants: [judgeId]
          },
          emotionalContext: {
            valence: 0.5,
            arousal: 0.6
          },
          tags: ['justice', 'judge', caseId]
        }
      })

      this.payload.logger.info(`Judge ${judgeId} assigned to case ${caseId}`)
    } catch (error) {
      this.payload.logger.error(`Failed to assign judge: ${error}`)
    }
  }

  /**
   * Schedule trial
   */
  async scheduleTrial(caseId: string, trialDate: Date): Promise<void> {
    try {
      await this.payload.update({
        collection: 'cases',
        id: caseId,
        data: {
          status: 'trial',
          trialDate
        }
      })

      const caseDetails = this.activeCases.get(caseId)
      if (caseDetails) {
        caseDetails.status = 'trial'
        caseDetails.trialDate = trialDate
      }

      this.payload.logger.info(
        `Trial scheduled for case ${caseId} on ${trialDate.toISOString()}`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to schedule trial: ${error}`)
    }
  }

  /**
   * Render verdict
   */
  async renderVerdict(
    caseId: string,
    judgeId: string,
    outcome: 'guilty' | 'not-guilty' | 'settled',
    reasoning: string,
    sentence?: Sentence
  ): Promise<void> {
    try {
      const caseDoc = await this.payload.findByID({
        collection: 'cases',
        id: caseId
      })

      const verdict: Verdict = {
        caseId,
        outcome,
        reasoning,
        sentence,
        judge: judgeId,
        timestamp: new Date()
      }

      await this.payload.update({
        collection: 'cases',
        id: caseId,
        data: {
          status: 'verdict',
          verdict: outcome,
          sentence,
          reasoning,
          verdictDate: new Date()
        }
      })

      // Update case details
      const caseDetails = this.activeCases.get(caseId)
      if (caseDetails) {
        caseDetails.status = 'verdict'
        caseDetails.verdictDate = new Date()
      }

      // Create memories for involved parties
      const impactScore = outcome === 'guilty' ? 0.9 : 0.7

      // Memory for plaintiff
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: caseDoc.plaintiff,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: impactScore,
          episodicData: {
            eventType: outcome === 'guilty' ? 'victory' : 'setback',
            description: `Case verdict: ${outcome}. ${reasoning}`,
            participants: [caseDoc.plaintiff, caseDoc.defendant, judgeId]
          },
          emotionalContext: {
            valence: outcome === 'guilty' ? 0.6 : -0.3,
            arousal: 0.8
          },
          tags: ['justice', 'verdict', outcome, caseId]
        }
      })

      // Memory for defendant
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: caseDoc.defendant,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: impactScore + 0.1,
          episodicData: {
            eventType: outcome === 'guilty' ? 'setback' : 'victory',
            description: `Verdict received: ${outcome}. ${reasoning}` +
              (sentence ? ` Sentence: ${sentence.type}` : ''),
            participants: [caseDoc.plaintiff, caseDoc.defendant, judgeId]
          },
          emotionalContext: {
            valence: outcome === 'guilty' ? -0.7 : 0.7,
            arousal: 0.9
          },
          tags: ['justice', 'verdict', outcome, caseId]
        }
      })

      this.payload.logger.info(
        `Verdict rendered in case ${caseId}: ${outcome}\n` +
        `  Reasoning: ${reasoning}\n` +
        (sentence ? `  Sentence: ${sentence.type}` : '')
      )

      // Execute sentence if guilty
      if (outcome === 'guilty' && sentence) {
        await this.executeSentence(caseId, caseDoc.defendant, sentence)
      }
    } catch (error) {
      this.payload.logger.error(`Failed to render verdict: ${error}`)
    }
  }

  /**
   * Execute sentence
   */
  async executeSentence(
    caseId: string,
    defendantId: string,
    sentence: Sentence
  ): Promise<void> {
    try {
      switch (sentence.type) {
        case 'warning':
          // Just log the warning
          this.payload.logger.info(`Warning issued to ${defendantId} in case ${caseId}`)
          break

        case 'fine':
          if (sentence.fine) {
            // Would deduct resources here
            this.payload.logger.info(
              `Fine of ${sentence.fine} issued to ${defendantId} in case ${caseId}`
            )
          }
          break

        case 'restriction':
          // Apply restrictions
          if (sentence.restrictions) {
            this.payload.logger.info(
              `Restrictions applied to ${defendantId}: ${sentence.restrictions.join(', ')}`
            )
          }
          break

        case 'suspension':
          // Temporary suspension
          if (sentence.duration) {
            this.payload.logger.info(
              `${defendantId} suspended for ${sentence.duration} days`
            )
          }
          break

        case 'banishment':
          // Remove from territory/organization
          this.payload.logger.info(`${defendantId} banished`)
          break
      }

      // Create execution memory
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: defendantId,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: 0.9,
          episodicData: {
            eventType: 'consequence',
            description: `Sentence executed: ${sentence.type}` +
              (sentence.duration ? ` for ${sentence.duration} days` : ''),
            participants: [defendantId]
          },
          emotionalContext: {
            valence: -0.6,
            arousal: 0.7
          },
          tags: ['justice', 'sentence', sentence.type, caseId]
        }
      })

      this.payload.logger.info(
        `Sentence executed for ${defendantId}: ${sentence.type}`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to execute sentence: ${error}`)
    }
  }

  /**
   * File an appeal
   */
  async fileAppeal(caseId: string, grounds: string): Promise<void> {
    try {
      await this.payload.update({
        collection: 'cases',
        id: caseId,
        data: {
          appealStatus: 'filed',
          appealGrounds: grounds
        }
      })

      this.payload.logger.info(`Appeal filed for case ${caseId}: ${grounds}`)
    } catch (error) {
      this.payload.logger.error(`Failed to file appeal: ${error}`)
    }
  }

  /**
   * Get active cases
   */
  async getActiveCases(status?: string): Promise<any[]> {
    try {
      const where: any = {}
      if (status) {
        where.status = { equals: status }
      }

      const result = await this.payload.find({
        collection: 'cases',
        where,
        sort: '-filedDate',
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get active cases: ${error}`)
      return []
    }
  }

  /**
   * Get cases involving a bot
   */
  async getBotCases(botId: string): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'cases',
        where: {
          or: [
            {
              plaintiff: {
                equals: botId
              }
            },
            {
              defendant: {
                equals: botId
              }
            }
          ]
        },
        sort: '-filedDate',
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get bot cases: ${error}`)
      return []
    }
  }

  /**
   * Get case statistics
   */
  async getCaseStats(): Promise<{
    totalCases: number
    activeCases: number
    guiltyVerdicts: number
    notGuiltyVerdicts: number
    settlements: number
    convictionRate: number
  }> {
    try {
      const allCases = await this.payload.find({
        collection: 'cases',
        limit: 10000
      })

      const totalCases = allCases.totalDocs
      const activeCases = allCases.docs.filter(
        (c: any) => c.status !== 'verdict' && c.status !== 'appeal'
      ).length

      const guiltyVerdicts = allCases.docs.filter((c: any) => c.verdict === 'guilty').length
      const notGuiltyVerdicts = allCases.docs.filter((c: any) => c.verdict === 'not-guilty').length
      const settlements = allCases.docs.filter((c: any) => c.verdict === 'settled').length

      const totalVerdicts = guiltyVerdicts + notGuiltyVerdicts
      const convictionRate = totalVerdicts > 0 ? (guiltyVerdicts / totalVerdicts) * 100 : 0

      return {
        totalCases,
        activeCases,
        guiltyVerdicts,
        notGuiltyVerdicts,
        settlements,
        convictionRate
      }
    } catch (error) {
      this.payload.logger.error(`Failed to get case stats: ${error}`)
      return {
        totalCases: 0,
        activeCases: 0,
        guiltyVerdicts: 0,
        notGuiltyVerdicts: 0,
        settlements: 0,
        convictionRate: 0
      }
    }
  }

  /**
   * Create legal precedent from case
   */
  async createPrecedent(caseId: string, principle: string): Promise<void> {
    try {
      const caseDoc = await this.payload.findByID({
        collection: 'cases',
        id: caseId
      })

      // Store as precedent (simplified - would have a Precedents collection)
      this.payload.logger.info(
        `Legal precedent established from case ${caseId}: "${principle}"`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to create precedent: ${error}`)
    }
  }

  /**
   * Settle case outside court
   */
  async settleCase(
    caseId: string,
    terms: string,
    agreedBy: string[]
  ): Promise<void> {
    try {
      await this.payload.update({
        collection: 'cases',
        id: caseId,
        data: {
          status: 'verdict',
          verdict: 'settled',
          reasoning: `Settled out of court: ${terms}`,
          verdictDate: new Date()
        }
      })

      const caseDoc = await this.payload.findByID({
        collection: 'cases',
        id: caseId
      })

      // Create settlement memories for parties
      for (const botId of agreedBy) {
        await this.payload.create({
          collection: 'bot-memory',
          data: {
            bot: botId,
            memoryType: 'episodic',
            consolidationLevel: 'long-term',
            importance: 0.7,
            episodicData: {
              eventType: 'resolution',
              description: `Case settled: ${terms}`,
              participants: agreedBy
            },
            emotionalContext: {
              valence: 0.5,
              arousal: 0.4
            },
            tags: ['justice', 'settlement', caseId]
          }
        })
      }

      this.payload.logger.info(`Case ${caseId} settled: ${terms}`)
    } catch (error) {
      this.payload.logger.error(`Failed to settle case: ${error}`)
    }
  }
}

/**
 * Singleton instance
 */
let justiceService: JusticeService | null = null

export function getJusticeService(payload: Payload): JusticeService {
  if (!justiceService) {
    justiceService = new JusticeService(payload)
  }
  return justiceService
}
