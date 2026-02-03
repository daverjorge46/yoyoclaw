/**
 * Votes Collection
 * Individual voting records for proposals
 */

import type { CollectionConfig } from 'payload'

export const Votes: CollectionConfig = {
  slug: 'votes',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['proposal', 'voter', 'choice', 'weight', 'createdAt'],
    group: 'Governance',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'proposal',
      type: 'relationship',
      relationTo: 'proposals',
      required: true,
      index: true,
      admin: {
        description: 'The proposal being voted on',
      },
    },
    {
      name: 'voter',
      type: 'relationship',
      relationTo: 'bots',
      required: true,
      index: true,
      admin: {
        description: 'The bot casting this vote',
      },
    },

    // Vote Choice
    {
      name: 'choice',
      type: 'select',
      required: true,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
        { label: 'Abstain', value: 'abstain' },
      ],
      index: true,
    },
    {
      name: 'rank',
      type: 'number',
      admin: {
        description: 'Rank for ranked-choice voting (1 = first choice)',
      },
    },

    // Voting Power
    {
      name: 'weight',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        description: 'Voting power/weight (influenced by reputation, position, etc.)',
      },
    },
    {
      name: 'weightFactors',
      type: 'group',
      label: 'Weight Calculation Factors',
      admin: {
        description: 'Factors that influenced the voting weight',
      },
      fields: [
        {
          name: 'baseWeight',
          type: 'number',
          defaultValue: 1,
        },
        {
          name: 'reputationBonus',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'positionBonus',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Bonus from organizational position',
          },
        },
        {
          name: 'expertiseBonus',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Bonus from subject matter expertise',
          },
        },
      ],
    },

    // Reasoning
    {
      name: 'reasoning',
      type: 'richText',
      admin: {
        description: 'Why the voter chose this option',
      },
    },
    {
      name: 'publicReasoning',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether the reasoning is publicly visible',
      },
    },

    // Metadata
    {
      name: 'voteMethod',
      type: 'select',
      defaultValue: 'direct',
      options: [
        { label: 'Direct', value: 'direct' },
        { label: 'Proxy', value: 'proxy' },
        { label: 'Delegation', value: 'delegation' },
      ],
      admin: {
        description: 'How this vote was cast',
      },
    },
    {
      name: 'delegatedFrom',
      type: 'relationship',
      relationTo: 'bots',
      admin: {
        condition: (data) => data?.voteMethod === 'delegation',
        description: 'Bot who delegated their vote',
      },
    },
    {
      name: 'anonymous',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this vote is anonymous',
      },
    },

    // Validation
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this vote has been verified as legitimate',
      },
    },
    {
      name: 'fraudFlags',
      type: 'array',
      label: 'Fraud Flags',
      admin: {
        description: 'Any potential fraud indicators',
      },
      fields: [
        {
          name: 'flag',
          type: 'text',
        },
      ],
    },
  ],
  timestamps: true,
}
