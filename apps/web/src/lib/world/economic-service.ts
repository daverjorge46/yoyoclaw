/**
 * Economic Service
 * Manages resources and economic activities
 * - Resource allocation
 * - Production/consumption tracking
 * - Price updates
 * - Resource distribution
 */

import type { Payload } from 'payload'

export interface ResourceAllocation {
  resourceId: string
  entityId: string // Bot, Organization, or Territory ID
  entityType: 'bot' | 'organization' | 'territory'
  amount: number
  timestamp: Date
}

export interface ProductionRecord {
  resourceId: string
  producerId: string
  amount: number
  timestamp: Date
  method: string // How it was produced
}

export interface ConsumptionRecord {
  resourceId: string
  consumerId: string
  amount: number
  timestamp: Date
  purpose: string // Why it was consumed
}

export class EconomicService {
  private payload: Payload
  private resourceBalances: Map<string, Map<string, number>> // resourceId -> (entityId -> balance)

  constructor(payload: Payload) {
    this.payload = payload
    this.resourceBalances = new Map()
  }

  /**
   * Allocate resource to an entity
   */
  async allocateResource(
    resourceId: string,
    entityId: string,
    entityType: 'bot' | 'organization' | 'territory',
    amount: number
  ): Promise<boolean> {
    try {
      if (amount <= 0) {
        this.payload.logger.warn('Cannot allocate non-positive amount')
        return false
      }

      // Get current balance
      const balance = this.getBalance(resourceId, entityId)
      const newBalance = balance + amount

      // Update in-memory balance
      this.setBalance(resourceId, entityId, newBalance)

      // Update resource distribution in database
      const resource = await this.payload.findByID({
        collection: 'resources',
        id: resourceId
      })

      const distribution = resource.distribution || {}
      distribution[entityId] = newBalance

      await this.payload.update({
        collection: 'resources',
        id: resourceId,
        data: {
          distribution
        }
      })

      this.payload.logger.info(
        `Allocated ${amount} ${resourceId} to ${entityType} ${entityId} ` +
        `(new balance: ${newBalance})`
      )

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to allocate resource: ${error}`)
      return false
    }
  }

  /**
   * Deduct resource from an entity
   */
  async deductResource(
    resourceId: string,
    entityId: string,
    amount: number
  ): Promise<boolean> {
    try {
      if (amount <= 0) {
        this.payload.logger.warn('Cannot deduct non-positive amount')
        return false
      }

      const balance = this.getBalance(resourceId, entityId)

      if (balance < amount) {
        this.payload.logger.warn(
          `Insufficient ${resourceId} for ${entityId}: has ${balance}, needs ${amount}`
        )
        return false
      }

      const newBalance = balance - amount
      this.setBalance(resourceId, entityId, newBalance)

      // Update database
      const resource = await this.payload.findByID({
        collection: 'resources',
        id: resourceId
      })

      const distribution = resource.distribution || {}
      distribution[entityId] = newBalance

      await this.payload.update({
        collection: 'resources',
        id: resourceId,
        data: {
          distribution
        }
      })

      this.payload.logger.info(
        `Deducted ${amount} ${resourceId} from ${entityId} ` +
        `(new balance: ${newBalance})`
      )

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to deduct resource: ${error}`)
      return false
    }
  }

  /**
   * Track production of a resource
   */
  async trackProduction(
    resourceId: string,
    producerId: string,
    amount: number,
    method: string
  ): Promise<void> {
    try {
      const resource = await this.payload.findByID({
        collection: 'resources',
        id: resourceId
      })

      // Update producer's balance
      await this.allocateResource(resourceId, producerId, 'bot', amount)

      // Update production rate
      const productionRate = resource.productionRate || {}
      productionRate[producerId] = (productionRate[producerId] || 0) + amount

      // Add to producers list if not already there
      const producers = resource.producers || []
      if (!producers.includes(producerId)) {
        producers.push(producerId)
      }

      // Update total supply
      const totalSupply = (resource.totalSupply || 0) + amount

      await this.payload.update({
        collection: 'resources',
        id: resourceId,
        data: {
          producers,
          productionRate,
          totalSupply
        }
      })

      this.payload.logger.info(
        `Production tracked: ${producerId} produced ${amount} ${resourceId} via ${method}`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to track production: ${error}`)
    }
  }

  /**
   * Track consumption of a resource
   */
  async trackConsumption(
    resourceId: string,
    consumerId: string,
    amount: number,
    purpose: string
  ): Promise<boolean> {
    try {
      // Deduct from consumer's balance
      const success = await this.deductResource(resourceId, consumerId, amount)

      if (!success) {
        return false
      }

      const resource = await this.payload.findByID({
        collection: 'resources',
        id: resourceId
      })

      // Update consumption rate
      const consumptionRate = resource.consumptionRate || {}
      consumptionRate[consumerId] = (consumptionRate[consumerId] || 0) + amount

      // Add to consumers list if not already there
      const consumers = resource.consumers || []
      if (!consumers.includes(consumerId)) {
        consumers.push(consumerId)
      }

      // Update total supply (reduce)
      const totalSupply = Math.max(0, (resource.totalSupply || 0) - amount)

      await this.payload.update({
        collection: 'resources',
        id: resourceId,
        data: {
          consumers,
          consumptionRate,
          totalSupply
        }
      })

      this.payload.logger.info(
        `Consumption tracked: ${consumerId} consumed ${amount} ${resourceId} for ${purpose}`
      )

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to track consumption: ${error}`)
      return false
    }
  }

  /**
   * Update market value of a resource
   */
  async updateMarketValue(resourceId: string, newValue: number): Promise<void> {
    try {
      const resource = await this.payload.findByID({
        collection: 'resources',
        id: resourceId
      })

      const oldValue = resource.marketValue || 1.0

      // Update price history
      const priceHistory = resource.priceHistory || []
      priceHistory.push({
        value: newValue,
        timestamp: new Date()
      })

      // Keep only last 100 price points
      const trimmedHistory = priceHistory.slice(-100)

      await this.payload.update({
        collection: 'resources',
        id: resourceId,
        data: {
          marketValue: newValue,
          priceHistory: trimmedHistory
        }
      })

      const changePercent = ((newValue - oldValue) / oldValue) * 100

      this.payload.logger.info(
        `Resource ${resourceId} market value: ${oldValue.toFixed(2)} → ${newValue.toFixed(2)} ` +
        `(${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to update market value: ${error}`)
    }
  }

  /**
   * Calculate market value based on supply/demand
   */
  async calculateMarketValue(resourceId: string): Promise<number> {
    try {
      const resource = await this.payload.findByID({
        collection: 'resources',
        id: resourceId
      })

      // Simple supply/demand calculation
      const totalProduction = Object.values(resource.productionRate || {}).reduce(
        (sum: number, val: any) => sum + val,
        0
      )
      const totalConsumption = Object.values(resource.consumptionRate || {}).reduce(
        (sum: number, val: any) => sum + val,
        0
      )

      // If consumption > production, price goes up
      // If production > consumption, price goes down
      const currentValue = resource.marketValue || 1.0
      const scarcity = resource.scarcity || 0.5

      let newValue = currentValue

      if (totalConsumption > totalProduction) {
        // High demand, increase price
        const demandRatio = totalConsumption / (totalProduction || 1)
        newValue = currentValue * (1 + (demandRatio - 1) * 0.1) // 10% adjustment
      } else if (totalProduction > totalConsumption) {
        // High supply, decrease price
        const supplyRatio = totalProduction / (totalConsumption || 1)
        newValue = currentValue * (1 - (supplyRatio - 1) * 0.05) // 5% adjustment
      }

      // Factor in scarcity
      newValue = newValue * (1 + scarcity * 0.2)

      // Clamp to reasonable bounds
      newValue = Math.max(0.1, Math.min(100, newValue))

      await this.updateMarketValue(resourceId, newValue)

      return newValue
    } catch (error) {
      this.payload.logger.error(`Failed to calculate market value: ${error}`)
      return 1.0
    }
  }

  /**
   * Get resource balance for an entity
   */
  getBalance(resourceId: string, entityId: string): number {
    const resourceMap = this.resourceBalances.get(resourceId)
    return resourceMap ? (resourceMap.get(entityId) || 0) : 0
  }

  /**
   * Set resource balance for an entity
   */
  private setBalance(resourceId: string, entityId: string, amount: number): void {
    let resourceMap = this.resourceBalances.get(resourceId)
    if (!resourceMap) {
      resourceMap = new Map()
      this.resourceBalances.set(resourceId, resourceMap)
    }
    resourceMap.set(entityId, amount)
  }

  /**
   * Get all resources
   */
  async getAllResources(): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'resources',
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get all resources: ${error}`)
      return []
    }
  }

  /**
   * Get resources by type
   */
  async getResourcesByType(
    type: 'attention' | 'memory' | 'compute' | 'creativity' | 'knowledge' | 'influence' | 'trust'
  ): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'resources',
        where: {
          type: {
            equals: type
          }
        },
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get resources by type: ${error}`)
      return []
    }
  }

  /**
   * Get resource statistics
   */
  async getResourceStats(resourceId: string): Promise<{
    totalSupply: number
    totalProduction: number
    totalConsumption: number
    marketValue: number
    scarcity: number
    topProducers: Array<{ id: string; amount: number }>
    topConsumers: Array<{ id: string; amount: number }>
  } | null> {
    try {
      const resource = await this.payload.findByID({
        collection: 'resources',
        id: resourceId
      })

      const totalProduction = Object.values(resource.productionRate || {}).reduce(
        (sum: number, val: any) => sum + val,
        0
      )
      const totalConsumption = Object.values(resource.consumptionRate || {}).reduce(
        (sum: number, val: any) => sum + val,
        0
      )

      // Get top producers
      const producerEntries = Object.entries(resource.productionRate || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([id, amount]) => ({ id, amount: amount as number }))

      // Get top consumers
      const consumerEntries = Object.entries(resource.consumptionRate || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([id, amount]) => ({ id, amount: amount as number }))

      return {
        totalSupply: resource.totalSupply || 0,
        totalProduction,
        totalConsumption,
        marketValue: resource.marketValue || 1.0,
        scarcity: resource.scarcity || 0.5,
        topProducers: producerEntries,
        topConsumers: consumerEntries
      }
    } catch (error) {
      this.payload.logger.error(`Failed to get resource stats: ${error}`)
      return null
    }
  }

  /**
   * Transfer resource between entities
   */
  async transferResource(
    resourceId: string,
    fromEntityId: string,
    toEntityId: string,
    amount: number
  ): Promise<boolean> {
    try {
      // Deduct from sender
      const success = await this.deductResource(resourceId, fromEntityId, amount)

      if (!success) {
        return false
      }

      // Add to receiver
      await this.allocateResource(resourceId, toEntityId, 'bot', amount)

      this.payload.logger.info(
        `Transferred ${amount} ${resourceId} from ${fromEntityId} to ${toEntityId}`
      )

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to transfer resource: ${error}`)
      return false
    }
  }
}

/**
 * Singleton instance
 */
let economicService: EconomicService | null = null

export function getEconomicService(payload: Payload): EconomicService {
  if (!economicService) {
    economicService = new EconomicService(payload)
  }
  return economicService
}
