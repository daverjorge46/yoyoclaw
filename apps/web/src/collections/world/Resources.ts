/**
 * Resources Collection
 * Economic assets that bots earn, trade, and consume
 * (Attention, Memory, Creativity, Knowledge, Influence, Trust, Compute)
 */

import type { CollectionConfig } from 'payload'

export const Resources: CollectionConfig = {
  slug: 'resources',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'totalSupply', 'scarcity', 'marketValue'],
    group: 'Economy',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      unique: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Attention', value: 'attention' },
        { label: 'Memory', value: 'memory' },
        { label: 'Compute', value: 'compute' },
        { label: 'Creativity', value: 'creativity' },
        { label: 'Knowledge', value: 'knowledge' },
        { label: 'Influence', value: 'influence' },
        { label: 'Trust', value: 'trust' },
        { label: 'Custom', value: 'custom' },
      ],
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'unit',
      type: 'text',
      required: true,
      admin: {
        description: 'Unit of measurement (e.g., "tokens", "cycles", "insights", "connections")',
      },
    },

    // Properties
    {
      name: 'scarcity',
      type: 'number',
      min: 0,
      max: 1,
      required: true,
      defaultValue: 0.5,
      admin: {
        description: 'How scarce this resource is (0 = abundant, 1 = extremely scarce)',
      },
    },
    {
      name: 'renewable',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this resource regenerates over time',
      },
    },
    {
      name: 'regenerationRate',
      type: 'number',
      defaultValue: 0,
      admin: {
        condition: (data) => data?.renewable,
        description: 'Units regenerated per time period',
      },
    },

    // Supply & Distribution
    {
      name: 'totalSupply',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Total amount in existence',
      },
    },
    {
      name: 'maxSupply',
      type: 'number',
      admin: {
        description: 'Maximum possible supply (0 = unlimited)',
      },
    },

    // Value
    {
      name: 'marketValue',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        description: 'Current market value (exchange rate)',
      },
    },
    {
      name: 'priceHistory',
      type: 'array',
      label: 'Price History',
      admin: {
        description: 'Historical price data',
      },
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
        {
          name: 'price',
          type: 'number',
          required: true,
        },
      ],
    },

    // Production
    {
      name: 'producers',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      hasMany: true,
      admin: {
        description: 'Who generates this resource',
      },
    },
    {
      name: 'productionMethod',
      type: 'textarea',
      admin: {
        description: 'How this resource is produced',
      },
    },

    // Consumption
    {
      name: 'consumers',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      hasMany: true,
      admin: {
        description: 'Who consumes this resource',
      },
    },
    {
      name: 'consumptionUses',
      type: 'array',
      label: 'Common Uses',
      fields: [
        {
          name: 'use',
          type: 'text',
        },
      ],
    },

    // Metadata
    {
      name: 'icon',
      type: 'text',
      admin: {
        description: 'Icon/emoji representing this resource',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
}
