/**
 * Territory Service
 * Manages territories (countries, regions, cities) in the digital world
 * - Population tracking
 * - GDP calculation
 * - Reputation score updates
 * - Territory statistics
 */

import type { Payload } from 'payload'

export interface TerritoryStats {
  population: number
  populationDensity: number
  gdp: number
  reputation: {
    safety: number
    innovation: number
    culture: number
    prosperity: number
    harmony: number
  }
  culturalDiversity: number // 0-1, based on culture distribution
  economicActivity: number // 0-1, based on transactions
}

export class TerritoryService {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Update population count for a territory
   */
  async updatePopulation(territoryId: string, change: number): Promise<void> {
    try {
      const territory = await this.payload.findByID({
        collection: 'territories',
        id: territoryId
      })

      const newPopulation = Math.max(0, (territory.population || 0) + change)

      await this.payload.update({
        collection: 'territories',
        id: territoryId,
        data: {
          population: newPopulation
        }
      })

      this.payload.logger.info(
        `Territory ${territoryId} population: ${territory.population} → ${newPopulation} ` +
        `(${change > 0 ? '+' : ''}${change})`
      )

      // Update population density if area is known
      await this.updatePopulationDensity(territoryId)
    } catch (error) {
      this.payload.logger.error(`Failed to update population for territory ${territoryId}: ${error}`)
    }
  }

  /**
   * Update population density
   */
  async updatePopulationDensity(territoryId: string): Promise<void> {
    try {
      const territory = await this.payload.findByID({
        collection: 'territories',
        id: territoryId
      })

      // Simplified: assume city = 100 area, district = 25, neighborhood = 10
      const areaMap: Record<string, number> = {
        world: 10000,
        continent: 5000,
        country: 1000,
        region: 500,
        city: 100,
        district: 25,
        neighborhood: 10
      }

      const area = areaMap[territory.type as string] || 100
      const density = territory.population / area

      await this.payload.update({
        collection: 'territories',
        id: territoryId,
        data: {
          populationDensity: density
        }
      })
    } catch (error) {
      this.payload.logger.error(`Failed to update population density: ${error}`)
    }
  }

  /**
   * Calculate and update GDP for a territory
   */
  async calculateGDP(territoryId: string): Promise<number> {
    try {
      const territory = await this.payload.findByID({
        collection: 'territories',
        id: territoryId
      })

      // Get all transactions involving this territory
      const transactions = await this.payload.find({
        collection: 'transactions',
        where: {
          or: [
            {
              'from.territory': {
                equals: territoryId
              }
            },
            {
              'to.territory': {
                equals: territoryId
              }
            }
          ]
        },
        limit: 1000
      })

      // Calculate total economic value (simplified)
      let totalValue = 0
      for (const transaction of transactions.docs) {
        // Sum all resource values
        if (transaction.resourcesOffered) {
          totalValue += Object.values(transaction.resourcesOffered as any).reduce(
            (sum: number, val: any) => sum + (typeof val === 'number' ? val : 0),
            0
          )
        }
      }

      // Add population factor
      const populationFactor = Math.sqrt(territory.population || 1)
      const gdp = totalValue * populationFactor

      // Update territory GDP
      await this.payload.update({
        collection: 'territories',
        id: territoryId,
        data: {
          gdp
        }
      })

      this.payload.logger.info(
        `Territory ${territoryId} GDP calculated: ${gdp.toFixed(2)}`
      )

      return gdp
    } catch (error) {
      this.payload.logger.error(`Failed to calculate GDP for territory ${territoryId}: ${error}`)
      return 0
    }
  }

  /**
   * Update reputation score for a territory
   */
  async updateReputation(
    territoryId: string,
    aspect: 'safety' | 'innovation' | 'culture' | 'prosperity' | 'harmony',
    change: number
  ): Promise<void> {
    try {
      const territory = await this.payload.findByID({
        collection: 'territories',
        id: territoryId
      })

      const currentReputation = territory.reputation || {
        safety: 0.5,
        innovation: 0.5,
        culture: 0.5,
        prosperity: 0.5,
        harmony: 0.5
      }

      const newValue = Math.max(0, Math.min(1, currentReputation[aspect] + change))

      await this.payload.update({
        collection: 'territories',
        id: territoryId,
        data: {
          reputation: {
            ...currentReputation,
            [aspect]: newValue
          }
        }
      })

      this.payload.logger.info(
        `Territory ${territoryId} reputation.${aspect}: ` +
        `${currentReputation[aspect].toFixed(2)} → ${newValue.toFixed(2)} ` +
        `(${change > 0 ? '+' : ''}${change.toFixed(3)})`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to update reputation for territory ${territoryId}: ${error}`)
    }
  }

  /**
   * Get comprehensive territory statistics
   */
  async getTerritoryStats(territoryId: string): Promise<TerritoryStats | null> {
    try {
      const territory = await this.payload.findByID({
        collection: 'territories',
        id: territoryId
      })

      // Calculate cultural diversity
      const cultures = territory.demographicDistribution?.cultures || []
      const totalCulturalPop = cultures.reduce((sum: number, c: any) => sum + (c.population || 0), 0)
      const culturalDiversity = cultures.length > 0
        ? 1 - cultures.reduce((sum: number, c: any) => {
            const ratio = c.population / totalCulturalPop
            return sum + ratio * ratio
          }, 0)
        : 0

      // Calculate economic activity (based on recent transactions)
      const recentTransactions = await this.payload.find({
        collection: 'transactions',
        where: {
          or: [
            {
              'from.territory': {
                equals: territoryId
              }
            },
            {
              'to.territory': {
                equals: territoryId
              }
            }
          ],
          timestamp: {
            greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        limit: 100
      })

      const economicActivity = Math.min(1, recentTransactions.totalDocs / 50)

      return {
        population: territory.population || 0,
        populationDensity: territory.populationDensity || 0,
        gdp: territory.gdp || 0,
        reputation: territory.reputation || {
          safety: 0.5,
          innovation: 0.5,
          culture: 0.5,
          prosperity: 0.5,
          harmony: 0.5
        },
        culturalDiversity,
        economicActivity
      }
    } catch (error) {
      this.payload.logger.error(`Failed to get territory stats for ${territoryId}: ${error}`)
      return null
    }
  }

  /**
   * Get all active territories of a specific type
   */
  async getTerritoriesByType(
    type: 'world' | 'continent' | 'country' | 'region' | 'city' | 'district' | 'neighborhood'
  ): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'territories',
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
      this.payload.logger.error(`Failed to get territories by type ${type}: ${error}`)
      return []
    }
  }

  /**
   * Get child territories (e.g., cities within a country)
   */
  async getChildTerritories(parentTerritoryId: string): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'territories',
        where: {
          parentTerritory: {
            equals: parentTerritoryId
          },
          active: {
            equals: true
          }
        },
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get child territories: ${error}`)
      return []
    }
  }

  /**
   * Get bots residing in a territory
   */
  async getResidents(territoryId: string): Promise<any[]> {
    try {
      // Get bot identities that list this as their primary territory
      const result = await this.payload.find({
        collection: 'bot-identity',
        where: {
          'demographics.location': {
            equals: territoryId
          }
        },
        limit: 1000
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get residents for territory ${territoryId}: ${error}`)
      return []
    }
  }

  /**
   * Update demographic distribution
   */
  async updateDemographics(
    territoryId: string,
    cultureId: string,
    populationChange: number
  ): Promise<void> {
    try {
      const territory = await this.payload.findByID({
        collection: 'territories',
        id: territoryId
      })

      const cultures = territory.demographicDistribution?.cultures || []
      const cultureIndex = cultures.findIndex((c: any) => c.culture === cultureId)

      if (cultureIndex !== -1) {
        // Update existing culture population
        cultures[cultureIndex].population = Math.max(0, cultures[cultureIndex].population + populationChange)
      } else if (populationChange > 0) {
        // Add new culture
        cultures.push({
          culture: cultureId,
          population: populationChange
        })
      }

      await this.payload.update({
        collection: 'territories',
        id: territoryId,
        data: {
          demographicDistribution: {
            ...territory.demographicDistribution,
            cultures
          }
        }
      })

      this.payload.logger.info(
        `Territory ${territoryId} demographics updated for culture ${cultureId}: ${populationChange > 0 ? '+' : ''}${populationChange}`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to update demographics: ${error}`)
    }
  }

  /**
   * Calculate overall territory health score (0-1)
   */
  async calculateHealthScore(territoryId: string): Promise<number> {
    const stats = await this.getTerritoryStats(territoryId)
    if (!stats) return 0

    // Weighted average of various factors
    const reputationAvg = Object.values(stats.reputation).reduce((a, b) => a + b, 0) / 5
    const populationScore = Math.min(1, stats.population / 100) // Normalize to 100
    const economicScore = Math.min(1, stats.gdp / 1000) // Normalize to 1000
    const diversityScore = stats.culturalDiversity

    return (
      reputationAvg * 0.4 +
      populationScore * 0.2 +
      economicScore * 0.2 +
      diversityScore * 0.1 +
      stats.economicActivity * 0.1
    )
  }
}

/**
 * Singleton instance
 */
let territoryService: TerritoryService | null = null

export function getTerritoryService(payload: Payload): TerritoryService {
  if (!territoryService) {
    territoryService = new TerritoryService(payload)
  }
  return territoryService
}
