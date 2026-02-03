/**
 * Transactions Collection
 * Record of all economic exchanges between bots
 */

import type { CollectionConfig } from 'payload'

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['type', 'from', 'to', 'status', 'createdAt'],
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
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Trade', value: 'trade' },
        { label: 'Payment', value: 'payment' },
        { label: 'Gift', value: 'gift' },
        { label: 'Investment', value: 'investment' },
        { label: 'Loan', value: 'loan' },
        { label: 'Tax', value: 'tax' },
        { label: 'Donation', value: 'donation' },
      ],
      index: true,
    },

    // Parties
    {
      name: 'from',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      required: true,
      index: true,
    },
    {
      name: 'to',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      required: true,
      index: true,
    },

    // Exchange Details
    {
      name: 'resourcesOffered',
      type: 'array',
      label: 'Resources Offered',
      required: true,
      fields: [
        {
          name: 'resource',
          type: 'relationship',
          relationTo: 'resources',
          required: true,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
        },
      ],
    },
    {
      name: 'resourcesReceived',
      type: 'array',
      label: 'Resources Received',
      fields: [
        {
          name: 'resource',
          type: 'relationship',
          relationTo: 'resources',
          required: true,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
        },
      ],
    },

    // Context
    {
      name: 'reason',
      type: 'textarea',
      admin: {
        description: 'Why this transaction occurred',
      },
    },
    {
      name: 'market',
      type: 'relationship',
      relationTo: 'markets',
      admin: {
        description: 'Which market this transaction occurred in',
      },
    },
    {
      name: 'contract',
      type: 'richText',
      admin: {
        description: 'Formal agreement or terms',
      },
    },

    // Execution
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Disputed', value: 'disputed' },
        { label: 'Resolved', value: 'resolved' },
      ],
      index: true,
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },

    // Impact & Feedback
    {
      name: 'satisfactionScore',
      type: 'number',
      min: 0,
      max: 1,
      admin: {
        description: 'How satisfied both parties were (0-1)',
      },
    },
    {
      name: 'fromFeedback',
      type: 'textarea',
      admin: {
        description: 'Feedback from the offering party',
      },
    },
    {
      name: 'toFeedback',
      type: 'textarea',
      admin: {
        description: 'Feedback from the receiving party',
      },
    },

    // Reputation Impact
    {
      name: 'reputationChange',
      type: 'group',
      label: 'Reputation Changes',
      fields: [
        {
          name: 'fromChange',
          type: 'number',
          admin: {
            description: 'Reputation change for offering party',
          },
        },
        {
          name: 'toChange',
          type: 'number',
          admin: {
            description: 'Reputation change for receiving party',
          },
        },
      ],
    },

    // Dispute Resolution
    {
      name: 'dispute',
      type: 'group',
      admin: {
        condition: (data) => data?.status === 'disputed' || data?.status === 'resolved',
      },
      fields: [
        {
          name: 'reason',
          type: 'textarea',
        },
        {
          name: 'mediator',
          type: 'relationship',
          relationTo: ['bots', 'organizations'],
          admin: {
            description: 'Who mediated the dispute',
          },
        },
        {
          name: 'resolution',
          type: 'textarea',
        },
        {
          name: 'resolvedAt',
          type: 'date',
        },
      ],
    },
  ],
  timestamps: true,
}
