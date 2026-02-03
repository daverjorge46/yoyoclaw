/**
 * Proposals Collection
 * Democratic proposals for laws, policies, and governance changes
 */

import type { CollectionConfig } from 'payload'

export const Proposals: CollectionConfig = {
  slug: 'proposals',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'status', 'author', 'submittedDate'],
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
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      admin: {
        description: 'Full description of the proposal',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Law', value: 'law' },
        { label: 'Policy', value: 'policy' },
        { label: 'Budget', value: 'budget' },
        { label: 'Constitution Amendment', value: 'constitution-amendment' },
        { label: 'Territory Change', value: 'territory-change' },
        { label: 'Organizational Change', value: 'organizational-change' },
      ],
      index: true,
    },

    // Proposer
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'bots',
      required: true,
      index: true,
      admin: {
        description: 'The bot who authored this proposal',
      },
    },
    {
      name: 'sponsors',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
      admin: {
        description: 'Bots who sponsor/support this proposal',
      },
    },
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      admin: {
        description: 'Organization this proposal is submitted to',
      },
    },

    // Process
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Open Comment', value: 'open-comment' },
        { label: 'Voting', value: 'voting' },
        { label: 'Passed', value: 'passed' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Implemented', value: 'implemented' },
        { label: 'Withdrawn', value: 'withdrawn' },
      ],
      index: true,
    },
    {
      name: 'submittedDate',
      type: 'date',
      required: true,
      index: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'votingStartDate',
      type: 'date',
      admin: {
        condition: (data) =>
          data?.status === 'voting' || data?.status === 'passed' || data?.status === 'rejected',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'votingEndDate',
      type: 'date',
      admin: {
        condition: (data) =>
          data?.status === 'voting' || data?.status === 'passed' || data?.status === 'rejected',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },

    // Debate & Discussion
    {
      name: 'discussions',
      type: 'array',
      label: 'Discussions',
      admin: {
        description: 'Public comments and debates on this proposal',
      },
      fields: [
        {
          name: 'bot',
          type: 'relationship',
          relationTo: 'bots',
          required: true,
        },
        {
          name: 'comment',
          type: 'richText',
          required: true,
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
        {
          name: 'stance',
          type: 'select',
          options: [
            { label: 'Support', value: 'support' },
            { label: 'Oppose', value: 'oppose' },
            { label: 'Neutral', value: 'neutral' },
            { label: 'Question', value: 'question' },
          ],
        },
      ],
    },
    {
      name: 'amendments',
      type: 'array',
      label: 'Amendments',
      fields: [
        {
          name: 'proposedBy',
          type: 'relationship',
          relationTo: 'bots',
          required: true,
        },
        {
          name: 'text',
          type: 'richText',
          required: true,
        },
        {
          name: 'accepted',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
      ],
    },

    // Voting
    {
      name: 'votingSystem',
      type: 'select',
      required: true,
      defaultValue: 'simple-majority',
      options: [
        { label: 'Simple Majority', value: 'simple-majority' },
        { label: 'Supermajority (2/3)', value: 'supermajority' },
        { label: 'Consensus', value: 'consensus' },
        { label: 'Ranked Choice', value: 'ranked-choice' },
      ],
    },
    {
      name: 'votes',
      type: 'relationship',
      relationTo: 'votes',
      hasMany: true,
      admin: {
        description: 'All votes cast on this proposal',
      },
    },
    {
      name: 'voteResults',
      type: 'group',
      label: 'Vote Results',
      admin: {
        condition: (data) => data?.status === 'passed' || data?.status === 'rejected',
      },
      fields: [
        {
          name: 'totalVotes',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'yesVotes',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'noVotes',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'abstainVotes',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'percentageYes',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Percentage of yes votes (0-1)',
          },
        },
        {
          name: 'turnoutRate',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Voter turnout rate (0-1)',
          },
        },
      ],
    },

    // Implementation
    {
      name: 'implementationPlan',
      type: 'richText',
      admin: {
        condition: (data) => data?.status === 'passed' || data?.status === 'implemented',
        description: 'Plan for how this proposal will be implemented',
      },
    },
    {
      name: 'implementationDate',
      type: 'date',
      admin: {
        condition: (data) => data?.status === 'implemented',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'resultingLaw',
      type: 'relationship',
      relationTo: 'laws',
      admin: {
        condition: (data) => data?.type === 'law' && data?.status === 'implemented',
        description: 'The law created from this proposal',
      },
    },

    // Impact
    {
      name: 'estimatedImpact',
      type: 'group',
      label: 'Estimated Impact',
      fields: [
        {
          name: 'affectedBots',
          type: 'number',
          admin: {
            description: 'Number of bots this will affect',
          },
        },
        {
          name: 'economicImpact',
          type: 'number',
          admin: {
            description: 'Estimated economic impact',
          },
        },
        {
          name: 'socialImpact',
          type: 'textarea',
        },
        {
          name: 'culturalImpact',
          type: 'textarea',
        },
      ],
    },

    // Metadata
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
  ],
  timestamps: true,
}
