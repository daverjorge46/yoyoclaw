/**
 * Governance Service
 * Manages democratic processes and law-making
 * - Proposal creation
 * - Voting management
 * - Law enactment
 * - Democratic participation
 */

import type { Payload } from 'payload'

export interface VoteResults {
  proposalId: string
  totalVotes: number
  yesVotes: number
  noVotes: number
  abstainVotes: number
  yesPercentage: number
  noPercentage: number
  passed: boolean
  votingSystem: string
  threshold: number
}

export interface ProposalStatus {
  proposalId: string
  status: 'draft' | 'open-comment' | 'voting' | 'passed' | 'rejected' | 'implemented'
  submittedDate: Date
  votingStartDate?: Date
  votingEndDate?: Date
  implementationDate?: Date
}

export class GovernanceService {
  private payload: Payload
  private activeProposals: Map<string, any> // proposalId -> proposal data

  constructor(payload: Payload) {
    this.payload = payload
    this.activeProposals = new Map()
  }

  /**
   * Create a new proposal
   */
  async createProposal(proposalData: {
    title: string
    description: string
    type: 'law' | 'policy' | 'budget' | 'constitution-amendment' | 'territory-change'
    author: string // Bot ID
    sponsors?: string[] // Bot IDs
    organization?: string // Organization ID (government)
    votingSystem?: 'simple-majority' | 'supermajority' | 'consensus' | 'ranked-choice'
  }): Promise<string> {
    try {
      const proposal = await this.payload.create({
        collection: 'proposals',
        data: {
          ...proposalData,
          status: 'draft',
          submittedDate: new Date(),
          votingSystem: proposalData.votingSystem || 'simple-majority',
          sponsors: proposalData.sponsors || [],
          discussions: [],
          amendments: [],
          votes: []
        }
      })

      this.activeProposals.set(proposal.id, proposal)

      // Create memory for author
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: proposalData.author,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: 0.7,
          episodicData: {
            eventType: 'achievement',
            description: `Proposed: ${proposalData.title}`,
            participants: [proposalData.author]
          },
          emotionalContext: {
            valence: 0.6,
            arousal: 0.7
          },
          tags: ['governance', 'proposal', proposal.id]
        }
      })

      this.payload.logger.info(
        `Proposal created by ${proposalData.author}: "${proposalData.title}" (${proposal.id})`
      )

      return proposal.id
    } catch (error) {
      this.payload.logger.error(`Failed to create proposal: ${error}`)
      throw error
    }
  }

  /**
   * Open proposal for public comment
   */
  async openForComment(proposalId: string, commentPeriodDays: number = 7): Promise<void> {
    try {
      await this.payload.update({
        collection: 'proposals',
        id: proposalId,
        data: {
          status: 'open-comment',
          commentEndDate: new Date(Date.now() + commentPeriodDays * 24 * 60 * 60 * 1000)
        }
      })

      this.payload.logger.info(
        `Proposal ${proposalId} opened for comment (${commentPeriodDays} days)`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to open proposal for comment: ${error}`)
    }
  }

  /**
   * Start voting period
   */
  async startVoting(
    proposalId: string,
    votingPeriodDays: number = 3
  ): Promise<void> {
    try {
      const votingStartDate = new Date()
      const votingEndDate = new Date(votingStartDate.getTime() + votingPeriodDays * 24 * 60 * 60 * 1000)

      await this.payload.update({
        collection: 'proposals',
        id: proposalId,
        data: {
          status: 'voting',
          votingStartDate,
          votingEndDate
        }
      })

      const proposal = await this.payload.findByID({
        collection: 'proposals',
        id: proposalId
      })

      this.payload.logger.info(
        `Voting started for proposal ${proposalId}: "${proposal.title}" ` +
        `(ends ${votingEndDate.toISOString()})`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to start voting: ${error}`)
    }
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(
    proposalId: string,
    voterId: string,
    choice: 'yes' | 'no' | 'abstain',
    reasoning?: string,
    weight: number = 1.0
  ): Promise<boolean> {
    try {
      const proposal = await this.payload.findByID({
        collection: 'proposals',
        id: proposalId
      })

      // Check if voting is open
      if (proposal.status !== 'voting') {
        this.payload.logger.warn(`Proposal ${proposalId} is not open for voting`)
        return false
      }

      // Check if already voted
      const existingVote = await this.payload.find({
        collection: 'votes',
        where: {
          proposal: {
            equals: proposalId
          },
          voter: {
            equals: voterId
          }
        },
        limit: 1
      })

      if (existingVote.totalDocs > 0) {
        this.payload.logger.warn(`Bot ${voterId} has already voted on proposal ${proposalId}`)
        return false
      }

      // Create vote
      await this.payload.create({
        collection: 'votes',
        data: {
          proposal: proposalId,
          voter: voterId,
          choice,
          weight,
          reasoning,
          timestamp: new Date()
        }
      })

      // Create voting memory
      await this.payload.create({
        collection: 'bot-memory',
        data: {
          bot: voterId,
          memoryType: 'episodic',
          consolidationLevel: 'long-term',
          importance: 0.6,
          episodicData: {
            eventType: 'participation',
            description: `Voted ${choice} on: ${proposal.title}`,
            participants: [voterId]
          },
          emotionalContext: {
            valence: choice === 'yes' ? 0.6 : choice === 'no' ? 0.4 : 0.5,
            arousal: 0.5
          },
          tags: ['governance', 'voting', proposalId, choice]
        }
      })

      this.payload.logger.info(
        `Bot ${voterId} voted ${choice} on proposal ${proposalId}` +
        (reasoning ? ` (reason: ${reasoning})` : '')
      )

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to cast vote: ${error}`)
      return false
    }
  }

  /**
   * Tally votes and determine outcome
   */
  async tallyVotes(proposalId: string): Promise<VoteResults> {
    try {
      const proposal = await this.payload.findByID({
        collection: 'proposals',
        id: proposalId
      })

      // Get all votes
      const votesResult = await this.payload.find({
        collection: 'votes',
        where: {
          proposal: {
            equals: proposalId
          }
        },
        limit: 10000
      })

      const votes = votesResult.docs

      // Count weighted votes
      let yesVotes = 0
      let noVotes = 0
      let abstainVotes = 0

      for (const vote of votes) {
        const weight = vote.weight || 1.0
        if (vote.choice === 'yes') {
          yesVotes += weight
        } else if (vote.choice === 'no') {
          noVotes += weight
        } else if (vote.choice === 'abstain') {
          abstainVotes += weight
        }
      }

      const totalVotes = yesVotes + noVotes + abstainVotes
      const yesPercentage = totalVotes > 0 ? (yesVotes / (yesVotes + noVotes)) * 100 : 0
      const noPercentage = totalVotes > 0 ? (noVotes / (yesVotes + noVotes)) * 100 : 0

      // Determine if passed based on voting system
      let passed = false
      let threshold = 50

      switch (proposal.votingSystem) {
        case 'simple-majority':
          threshold = 50
          passed = yesPercentage > 50
          break
        case 'supermajority':
          threshold = 66.67
          passed = yesPercentage > 66.67
          break
        case 'consensus':
          threshold = 90
          passed = yesPercentage > 90
          break
        case 'ranked-choice':
          // Simplified for now
          threshold = 50
          passed = yesPercentage > 50
          break
      }

      const results: VoteResults = {
        proposalId,
        totalVotes,
        yesVotes,
        noVotes,
        abstainVotes,
        yesPercentage,
        noPercentage,
        passed,
        votingSystem: proposal.votingSystem,
        threshold
      }

      // Update proposal status
      await this.payload.update({
        collection: 'proposals',
        id: proposalId,
        data: {
          status: passed ? 'passed' : 'rejected',
          results
        }
      })

      this.payload.logger.info(
        `Proposal ${proposalId} voting results:\n` +
        `  Total votes: ${totalVotes}\n` +
        `  Yes: ${yesVotes.toFixed(1)} (${yesPercentage.toFixed(1)}%)\n` +
        `  No: ${noVotes.toFixed(1)} (${noPercentage.toFixed(1)}%)\n` +
        `  Abstain: ${abstainVotes.toFixed(1)}\n` +
        `  Result: ${passed ? 'PASSED' : 'REJECTED'}`
      )

      return results
    } catch (error) {
      this.payload.logger.error(`Failed to tally votes: ${error}`)
      throw error
    }
  }

  /**
   * Enact a law from a passed proposal
   */
  async enactLaw(proposalId: string): Promise<string> {
    try {
      const proposal = await this.payload.findByID({
        collection: 'proposals',
        id: proposalId
      })

      if (proposal.status !== 'passed') {
        throw new Error(`Proposal ${proposalId} has not passed voting`)
      }

      // Create law
      const law = await this.payload.create({
        collection: 'laws',
        data: {
          name: proposal.title,
          text: proposal.description,
          enactedBy: proposal.organization,
          jurisdiction: proposal.jurisdiction || '',
          category: this.determineCategory(proposal.type),
          severity: 'moderate',
          status: 'active',
          enactedDate: new Date(),
          voteHistory: [proposalId],
          publicSupport: proposal.results?.yesPercentage / 100 || 0,
          controversiality: Math.abs(0.5 - (proposal.results?.yesPercentage / 100 || 0.5)),
          complianceRate: 1.0,
          violationsCount: 0,
          effectivenessScore: 0.5
        }
      })

      // Update proposal status
      await this.payload.update({
        collection: 'proposals',
        id: proposalId,
        data: {
          status: 'implemented',
          implementationDate: new Date()
        }
      })

      this.payload.logger.info(
        `Law enacted from proposal ${proposalId}: "${law.name}" (${law.id})`
      )

      return law.id
    } catch (error) {
      this.payload.logger.error(`Failed to enact law: ${error}`)
      throw error
    }
  }

  /**
   * Get active proposals
   */
  async getActiveProposals(status?: string): Promise<any[]> {
    try {
      const where: any = {}
      if (status) {
        where.status = { equals: status }
      }

      const result = await this.payload.find({
        collection: 'proposals',
        where,
        sort: '-submittedDate',
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get active proposals: ${error}`)
      return []
    }
  }

  /**
   * Get laws in a jurisdiction
   */
  async getLawsByJurisdiction(jurisdictionId: string): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'laws',
        where: {
          jurisdiction: {
            equals: jurisdictionId
          },
          status: {
            equals: 'active'
          }
        },
        limit: 1000
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get laws: ${error}`)
      return []
    }
  }

  /**
   * Check voting eligibility
   */
  async canVote(botId: string, proposalId: string): Promise<boolean> {
    try {
      const proposal = await this.payload.findByID({
        collection: 'proposals',
        id: proposalId
      })

      // Check if voting is open
      if (proposal.status !== 'voting') {
        return false
      }

      // Check if already voted
      const existingVote = await this.payload.find({
        collection: 'votes',
        where: {
          proposal: {
            equals: proposalId
          },
          voter: {
            equals: botId
          }
        },
        limit: 1
      })

      return existingVote.totalDocs === 0
    } catch (error) {
      this.payload.logger.error(`Failed to check voting eligibility: ${error}`)
      return false
    }
  }

  /**
   * Get voter turnout statistics
   */
  async getVoterTurnout(proposalId: string): Promise<{
    totalEligible: number
    totalVoted: number
    turnoutPercentage: number
  }> {
    try {
      const proposal = await this.payload.findByID({
        collection: 'proposals',
        id: proposalId
      })

      // Get all eligible voters (simplified: all bots in jurisdiction)
      const botsResult = await this.payload.find({
        collection: 'bots',
        limit: 10000
      })
      const totalEligible = botsResult.totalDocs

      // Get total votes
      const votesResult = await this.payload.find({
        collection: 'votes',
        where: {
          proposal: {
            equals: proposalId
          }
        },
        limit: 10000
      })
      const totalVoted = votesResult.totalDocs

      const turnoutPercentage = totalEligible > 0 ? (totalVoted / totalEligible) * 100 : 0

      return {
        totalEligible,
        totalVoted,
        turnoutPercentage
      }
    } catch (error) {
      this.payload.logger.error(`Failed to get voter turnout: ${error}`)
      return {
        totalEligible: 0,
        totalVoted: 0,
        turnoutPercentage: 0
      }
    }
  }

  /**
   * Determine law category from proposal type
   */
  private determineCategory(
    proposalType: string
  ): 'criminal' | 'civil' | 'constitutional' | 'economic' | 'cultural' {
    switch (proposalType) {
      case 'constitution-amendment':
        return 'constitutional'
      case 'budget':
        return 'economic'
      case 'law':
        return 'civil'
      default:
        return 'civil'
    }
  }
}

/**
 * Singleton instance
 */
let governanceService: GovernanceService | null = null

export function getGovernanceService(payload: Payload): GovernanceService {
  if (!governanceService) {
    governanceService = new GovernanceService(payload)
  }
  return governanceService
}
