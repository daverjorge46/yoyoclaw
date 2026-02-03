/**
 * Market Service
 * Manages market dynamics and trading
 * - Transaction processing
 * - Price calculation
 * - Liquidity management
 * - Market statistics
 */

import type { Payload } from 'payload'
import { getEconomicService } from './economic-service'

export interface Trade {
  marketId: string
  sellerId: string
  buyerId: string
  resourceId: string
  amount: number
  price: number
  totalValue: number
  timestamp: Date
}

export interface MarketListing {
  id: string
  marketId: string
  sellerId: string
  resourceId: string
  amount: number
  pricePerUnit: number
  listingDate: Date
  expiryDate?: Date
  status: 'active' | 'sold' | 'cancelled' | 'expired'
}

export interface MarketStats {
  marketId: string
  volume: number // Total transaction value
  transactionCount: number
  liquidity: number // 0-1, how easy to trade
  priceStability: number // 0-1, how stable prices are
  activeListings: number
  activeBuyers: number
  activeSellers: number
}

export class MarketService {
  private payload: Payload
  private activeListings: Map<string, MarketListing[]> // marketId -> listings

  constructor(payload: Payload) {
    this.payload = payload
    this.activeListings = new Map()
  }

  /**
   * Execute a trade between two parties
   */
  async executeTrade(
    marketId: string,
    sellerId: string,
    buyerId: string,
    resourceId: string,
    amount: number,
    pricePerUnit: number
  ): Promise<boolean> {
    try {
      const totalValue = amount * pricePerUnit
      const economicService = getEconomicService(this.payload)

      // Check if buyer has enough currency/resources to pay
      // Simplified: assume they have a "currency" resource
      const currencyId = 'trust-credits' // Default currency

      const buyerBalance = economicService.getBalance(currencyId, buyerId)
      if (buyerBalance < totalValue) {
        this.payload.logger.warn(
          `Buyer ${buyerId} has insufficient funds: ${buyerBalance} < ${totalValue}`
        )
        return false
      }

      // Check if seller has the resource
      const sellerBalance = economicService.getBalance(resourceId, sellerId)
      if (sellerBalance < amount) {
        this.payload.logger.warn(
          `Seller ${sellerId} has insufficient resource: ${sellerBalance} < ${amount}`
        )
        return false
      }

      // Execute the trade
      // 1. Transfer resource from seller to buyer
      await economicService.transferResource(resourceId, sellerId, buyerId, amount)

      // 2. Transfer currency from buyer to seller
      await economicService.transferResource(currencyId, buyerId, sellerId, totalValue)

      // 3. Record transaction
      await this.payload.create({
        collection: 'transactions',
        data: {
          type: 'trade',
          from: sellerId,
          to: buyerId,
          resourcesOffered: {
            [resourceId]: amount
          },
          resourcesReceived: {
            [currencyId]: totalValue
          },
          timestamp: new Date(),
          status: 'completed',
          market: marketId
        }
      })

      // 4. Update market statistics
      await this.updateMarketStats(marketId)

      this.payload.logger.info(
        `Trade executed in market ${marketId}: ` +
        `${sellerId} sold ${amount} ${resourceId} to ${buyerId} ` +
        `for ${totalValue} (${pricePerUnit} per unit)`
      )

      return true
    } catch (error) {
      this.payload.logger.error(`Failed to execute trade: ${error}`)
      return false
    }
  }

  /**
   * Calculate market price for a resource based on supply/demand
   */
  async calculatePrice(marketId: string, resourceId: string): Promise<number> {
    try {
      const market = await this.payload.findByID({
        collection: 'markets',
        id: marketId
      })

      // Get recent transactions for this resource in this market
      const recentTransactions = await this.payload.find({
        collection: 'transactions',
        where: {
          market: {
            equals: marketId
          },
          status: {
            equals: 'completed'
          },
          timestamp: {
            greater_than: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        limit: 100
      })

      if (recentTransactions.totalDocs === 0) {
        // No recent transactions, use base market value
        const resource = await this.payload.findByID({
          collection: 'resources',
          id: resourceId
        })
        return resource.marketValue || 1.0
      }

      // Calculate average price from recent transactions
      let totalValue = 0
      let totalAmount = 0

      for (const tx of recentTransactions.docs) {
        if (tx.resourcesOffered && tx.resourcesOffered[resourceId]) {
          const amount = tx.resourcesOffered[resourceId]
          totalAmount += amount

          // Get the currency paid
          if (tx.resourcesReceived) {
            const value = Object.values(tx.resourcesReceived).reduce(
              (sum: number, val: any) => sum + (typeof val === 'number' ? val : 0),
              0
            )
            totalValue += value
          }
        }
      }

      const averagePrice = totalAmount > 0 ? totalValue / totalAmount : 1.0

      this.payload.logger.debug(
        `Market ${marketId} price for ${resourceId}: ${averagePrice.toFixed(2)} ` +
        `(based on ${recentTransactions.totalDocs} transactions)`
      )

      return averagePrice
    } catch (error) {
      this.payload.logger.error(`Failed to calculate price: ${error}`)
      return 1.0
    }
  }

  /**
   * Update market liquidity score
   */
  async updateLiquidity(marketId: string): Promise<void> {
    try {
      const market = await this.payload.findByID({
        collection: 'markets',
        id: marketId
      })

      // Get active listings
      const listings = this.activeListings.get(marketId) || []
      const activeListingsCount = listings.filter(l => l.status === 'active').length

      // Get recent transaction volume
      const recentTransactions = await this.payload.find({
        collection: 'transactions',
        where: {
          market: {
            equals: marketId
          },
          timestamp: {
            greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        limit: 1000
      })

      // Liquidity = (active listings * 0.4) + (transaction volume * 0.6)
      const listingScore = Math.min(1, activeListingsCount / 20)
      const volumeScore = Math.min(1, recentTransactions.totalDocs / 50)
      const liquidity = listingScore * 0.4 + volumeScore * 0.6

      await this.payload.update({
        collection: 'markets',
        id: marketId,
        data: {
          liquidity
        }
      })

      this.payload.logger.debug(
        `Market ${marketId} liquidity: ${liquidity.toFixed(2)} ` +
        `(listings: ${activeListingsCount}, volume: ${recentTransactions.totalDocs})`
      )
    } catch (error) {
      this.payload.logger.error(`Failed to update liquidity: ${error}`)
    }
  }

  /**
   * Get comprehensive market statistics
   */
  async getMarketStats(marketId: string): Promise<MarketStats | null> {
    try {
      const market = await this.payload.findByID({
        collection: 'markets',
        id: marketId
      })

      // Get recent transactions
      const recentTransactions = await this.payload.find({
        collection: 'transactions',
        where: {
          market: {
            equals: marketId
          },
          timestamp: {
            greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        limit: 1000
      })

      // Calculate total volume
      let totalVolume = 0
      const buyers = new Set<string>()
      const sellers = new Set<string>()

      for (const tx of recentTransactions.docs) {
        if (tx.resourcesReceived) {
          const value = Object.values(tx.resourcesReceived).reduce(
            (sum: number, val: any) => sum + (typeof val === 'number' ? val : 0),
            0
          )
          totalVolume += value
        }

        if (tx.from) sellers.add(tx.from)
        if (tx.to) buyers.add(tx.to)
      }

      // Get active listings
      const listings = this.activeListings.get(marketId) || []
      const activeListingsCount = listings.filter(l => l.status === 'active').length

      // Calculate price stability (based on price variance)
      const priceStability = 0.7 // Simplified, would calculate actual variance

      return {
        marketId,
        volume: totalVolume,
        transactionCount: recentTransactions.totalDocs,
        liquidity: market.liquidity || 0,
        priceStability,
        activeListings: activeListingsCount,
        activeBuyers: buyers.size,
        activeSellers: sellers.size
      }
    } catch (error) {
      this.payload.logger.error(`Failed to get market stats: ${error}`)
      return null
    }
  }

  /**
   * Update market statistics
   */
  private async updateMarketStats(marketId: string): Promise<void> {
    try {
      const stats = await this.getMarketStats(marketId)
      if (!stats) return

      await this.payload.update({
        collection: 'markets',
        id: marketId,
        data: {
          volume: stats.volume,
          liquidity: stats.liquidity,
          priceStability: stats.priceStability
        }
      })

      await this.updateLiquidity(marketId)
    } catch (error) {
      this.payload.logger.error(`Failed to update market stats: ${error}`)
    }
  }

  /**
   * Create a market listing
   */
  async createListing(
    marketId: string,
    sellerId: string,
    resourceId: string,
    amount: number,
    pricePerUnit: number,
    expiryDate?: Date
  ): Promise<string> {
    try {
      const listing: MarketListing = {
        id: `listing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        marketId,
        sellerId,
        resourceId,
        amount,
        pricePerUnit,
        listingDate: new Date(),
        expiryDate,
        status: 'active'
      }

      // Add to active listings
      const marketListings = this.activeListings.get(marketId) || []
      marketListings.push(listing)
      this.activeListings.set(marketId, marketListings)

      this.payload.logger.info(
        `Listing created in market ${marketId}: ` +
        `${sellerId} selling ${amount} ${resourceId} @ ${pricePerUnit} per unit`
      )

      return listing.id
    } catch (error) {
      this.payload.logger.error(`Failed to create listing: ${error}`)
      throw error
    }
  }

  /**
   * Cancel a listing
   */
  async cancelListing(listingId: string): Promise<void> {
    try {
      for (const [marketId, listings] of this.activeListings.entries()) {
        const listing = listings.find(l => l.id === listingId)
        if (listing) {
          listing.status = 'cancelled'
          this.payload.logger.info(`Listing ${listingId} cancelled`)
          return
        }
      }

      this.payload.logger.warn(`Listing ${listingId} not found`)
    } catch (error) {
      this.payload.logger.error(`Failed to cancel listing: ${error}`)
    }
  }

  /**
   * Get active listings in a market
   */
  getActiveListings(marketId: string): MarketListing[] {
    const listings = this.activeListings.get(marketId) || []
    return listings.filter(l => l.status === 'active')
  }

  /**
   * Get listings for a specific resource
   */
  getListingsByResource(marketId: string, resourceId: string): MarketListing[] {
    const listings = this.getActiveListings(marketId)
    return listings.filter(l => l.resourceId === resourceId)
  }

  /**
   * Get all markets
   */
  async getAllMarkets(): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'markets',
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get all markets: ${error}`)
      return []
    }
  }

  /**
   * Get markets by type
   */
  async getMarketsByType(
    type: 'goods' | 'services' | 'knowledge' | 'attention' | 'mixed'
  ): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'markets',
        where: {
          type: {
            equals: type
          }
        },
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get markets by type: ${error}`)
      return []
    }
  }

  /**
   * Get markets in a location
   */
  async getMarketsInLocation(locationId: string): Promise<any[]> {
    try {
      const result = await this.payload.find({
        collection: 'markets',
        where: {
          location: {
            equals: locationId
          }
        },
        limit: 100
      })

      return result.docs
    } catch (error) {
      this.payload.logger.error(`Failed to get markets in location: ${error}`)
      return []
    }
  }

  /**
   * Match buyer with best listing
   */
  async findBestListing(
    marketId: string,
    resourceId: string,
    desiredAmount: number,
    maxPricePerUnit?: number
  ): Promise<MarketListing | null> {
    try {
      const listings = this.getListingsByResource(marketId, resourceId)

      // Filter by price if specified
      let filteredListings = listings
      if (maxPricePerUnit) {
        filteredListings = listings.filter(l => l.pricePerUnit <= maxPricePerUnit)
      }

      // Filter by amount
      filteredListings = filteredListings.filter(l => l.amount >= desiredAmount)

      if (filteredListings.length === 0) {
        return null
      }

      // Sort by price (ascending) and return best
      filteredListings.sort((a, b) => a.pricePerUnit - b.pricePerUnit)

      return filteredListings[0]
    } catch (error) {
      this.payload.logger.error(`Failed to find best listing: ${error}`)
      return null
    }
  }

  /**
   * Clean up expired listings
   */
  async cleanupExpiredListings(): Promise<void> {
    try {
      const now = new Date()

      for (const [marketId, listings] of this.activeListings.entries()) {
        listings.forEach(listing => {
          if (
            listing.status === 'active' &&
            listing.expiryDate &&
            listing.expiryDate < now
          ) {
            listing.status = 'expired'
            this.payload.logger.debug(`Listing ${listing.id} expired`)
          }
        })
      }
    } catch (error) {
      this.payload.logger.error(`Failed to cleanup expired listings: ${error}`)
    }
  }
}

/**
 * Singleton instance
 */
let marketService: MarketService | null = null

export function getMarketService(payload: Payload): MarketService {
  if (!marketService) {
    marketService = new MarketService(payload)
  }
  return marketService
}
