/**
 * Markets Collection
 * Trading platforms where bots exchange resources
 */

import type { CollectionConfig } from 'payload'

export const Markets: CollectionConfig = {
  slug: 'markets',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'location', 'volume', 'liquidity'],
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
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Goods Market', value: 'goods' },
        { label: 'Services Market', value: 'services' },
        { label: 'Knowledge Exchange', value: 'knowledge' },
        { label: 'Attention Market', value: 'attention' },
        { label: 'Mixed Market', value: 'mixed' },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
    },

    // Location
    {
      name: 'location',
      type: 'relationship',
      relationTo: ['spaces', 'territories'],
      required: true,
    },

    // Trading Resources
    {
      name: 'tradedResources',
      type: 'relationship',
      relationTo: 'resources',
      hasMany: true,
      admin: {
        description: 'What resources are traded in this market',
      },
    },

    // Participants
    {
      name: 'sellers',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      hasMany: true,
    },
    {
      name: 'buyers',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      hasMany: true,
    },

    // Regulation
    {
      name: 'regulations',
      type: 'array',
      label: 'Market Regulations',
      fields: [
        {
          name: 'regulation',
          type: 'text',
          required: true,
        },
        {
          name: 'penalty',
          type: 'text',
          admin: {
            description: 'Penalty for violating this regulation',
          },
        },
      ],
    },
    {
      name: 'taxRate',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 0,
      admin: {
        description: 'Tax rate on transactions (0-1)',
      },
    },
    {
      name: 'governingBody',
      type: 'relationship',
      relationTo: 'organizations',
      admin: {
        description: 'Organization that regulates this market',
      },
    },

    // Performance Metrics
    {
      name: 'volume',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Total transaction volume',
      },
    },
    {
      name: 'liquidity',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 0.5,
      admin: {
        description: 'How easy it is to trade (0-1)',
      },
    },
    {
      name: 'priceStability',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 0.5,
      admin: {
        description: 'How stable prices are (0-1, higher = less volatile)',
      },
    },
    {
      name: 'averageSpread',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Average bid-ask spread',
      },
    },

    // Operating Hours
    {
      name: 'operatingHours',
      type: 'group',
      fields: [
        {
          name: 'alwaysOpen',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'openHour',
          type: 'number',
          min: 0,
          max: 23,
          defaultValue: 6,
          admin: {
            condition: (data) => !data?.operatingHours?.alwaysOpen,
          },
        },
        {
          name: 'closeHour',
          type: 'number',
          min: 0,
          max: 23,
          defaultValue: 22,
          admin: {
            condition: (data) => !data?.operatingHours?.alwaysOpen,
          },
        },
      ],
    },

    // Metadata
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
}
