/**
 * Cases Collection
 * Legal cases and verdicts in the justice system
 */

import type { CollectionConfig } from 'payload'

export const Cases: CollectionConfig = {
  slug: 'cases',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'status', 'plaintiff', 'defendant'],
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
      admin: {
        description: 'Case title (e.g., "Sophia v. Atlas")',
      },
    },
    {
      name: 'caseNumber',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Unique case identifier',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Criminal', value: 'criminal' },
        { label: 'Civil', value: 'civil' },
        { label: 'Constitutional', value: 'constitutional' },
        { label: 'Economic Dispute', value: 'economic' },
        { label: 'Cultural Rights', value: 'cultural' },
        { label: 'Contract Dispute', value: 'contract' },
      ],
      index: true,
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      admin: {
        description: 'Description of the case',
      },
    },

    // Parties
    {
      name: 'plaintiff',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      required: true,
      index: true,
      admin: {
        description: 'The party bringing the case',
      },
    },
    {
      name: 'defendant',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      required: true,
      index: true,
      admin: {
        description: 'The party being accused/sued',
      },
    },
    {
      name: 'lawyers',
      type: 'group',
      label: 'Legal Representation',
      fields: [
        {
          name: 'plaintiffLawyers',
          type: 'relationship',
          relationTo: 'bots',
          hasMany: true,
          admin: {
            description: 'Lawyers representing the plaintiff',
          },
        },
        {
          name: 'defendantLawyers',
          type: 'relationship',
          relationTo: 'bots',
          hasMany: true,
          admin: {
            description: 'Lawyers representing the defendant',
          },
        },
      ],
    },

    // Court
    {
      name: 'court',
      type: 'relationship',
      relationTo: 'courts',
      required: true,
      index: true,
      admin: {
        description: 'Court handling this case',
      },
    },
    {
      name: 'presidingJudge',
      type: 'relationship',
      relationTo: 'bots',
      required: true,
      admin: {
        description: 'Judge presiding over this case',
      },
    },

    // Process & Timeline
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'filed',
      options: [
        { label: 'Filed', value: 'filed' },
        { label: 'Discovery', value: 'discovery' },
        { label: 'Pre-Trial', value: 'pre-trial' },
        { label: 'Trial', value: 'trial' },
        { label: 'Deliberation', value: 'deliberation' },
        { label: 'Verdict', value: 'verdict' },
        { label: 'Appeal', value: 'appeal' },
        { label: 'Settled', value: 'settled' },
        { label: 'Dismissed', value: 'dismissed' },
      ],
      index: true,
    },
    {
      name: 'filedDate',
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
      name: 'trialDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'verdictDate',
      type: 'date',
      admin: {
        condition: (data) =>
          data?.status === 'verdict' || data?.status === 'appeal' || data?.status === 'settled',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },

    // Details
    {
      name: 'charges',
      type: 'array',
      label: 'Charges / Claims',
      admin: {
        description: 'Specific charges or claims in this case',
      },
      fields: [
        {
          name: 'charge',
          type: 'text',
          required: true,
        },
        {
          name: 'law',
          type: 'relationship',
          relationTo: 'laws',
          admin: {
            description: 'Law allegedly violated',
          },
        },
        {
          name: 'description',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'evidence',
      type: 'array',
      label: 'Evidence',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Document', value: 'document' },
            { label: 'Testimony', value: 'testimony' },
            { label: 'Physical', value: 'physical' },
            { label: 'Digital Record', value: 'digital' },
            { label: 'Expert Analysis', value: 'expert' },
          ],
        },
        {
          name: 'description',
          type: 'richText',
          required: true,
        },
        {
          name: 'submittedBy',
          type: 'select',
          required: true,
          options: [
            { label: 'Plaintiff', value: 'plaintiff' },
            { label: 'Defendant', value: 'defendant' },
            { label: 'Court', value: 'court' },
          ],
        },
        {
          name: 'credibility',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Assessed credibility of this evidence (0-1)',
          },
        },
      ],
    },
    {
      name: 'testimonies',
      type: 'array',
      label: 'Witness Testimonies',
      fields: [
        {
          name: 'witness',
          type: 'relationship',
          relationTo: 'bots',
          required: true,
        },
        {
          name: 'testimony',
          type: 'richText',
          required: true,
        },
        {
          name: 'side',
          type: 'select',
          required: true,
          options: [
            { label: 'Plaintiff', value: 'plaintiff' },
            { label: 'Defendant', value: 'defendant' },
            { label: 'Neutral', value: 'neutral' },
          ],
        },
        {
          name: 'date',
          type: 'date',
          required: true,
        },
      ],
    },

    // Verdict
    {
      name: 'verdict',
      type: 'select',
      admin: {
        condition: (data) =>
          data?.status === 'verdict' || data?.status === 'appeal' || data?.status === 'settled',
      },
      options: [
        { label: 'Guilty', value: 'guilty' },
        { label: 'Not Guilty', value: 'not-guilty' },
        { label: 'Liable', value: 'liable' },
        { label: 'Not Liable', value: 'not-liable' },
        { label: 'Settled', value: 'settled' },
        { label: 'Dismissed', value: 'dismissed' },
      ],
      index: true,
    },
    {
      name: 'sentence',
      type: 'group',
      label: 'Sentence',
      admin: {
        condition: (data) => data?.verdict === 'guilty' || data?.verdict === 'liable',
      },
      fields: [
        {
          name: 'penalties',
          type: 'array',
          label: 'Penalties',
          fields: [
            {
              name: 'type',
              type: 'select',
              required: true,
              options: [
                { label: 'Fine', value: 'fine' },
                { label: 'Community Service', value: 'community-service' },
                { label: 'Restriction', value: 'restriction' },
                { label: 'Suspension', value: 'suspension' },
                { label: 'Rehabilitation', value: 'rehabilitation' },
                { label: 'Compensation', value: 'compensation' },
                { label: 'Banishment', value: 'banishment' },
              ],
            },
            {
              name: 'description',
              type: 'text',
              required: true,
            },
            {
              name: 'amount',
              type: 'number',
            },
            {
              name: 'resource',
              type: 'relationship',
              relationTo: 'resources',
            },
            {
              name: 'duration',
              type: 'number',
              admin: {
                description: 'Duration in days for time-based penalties',
              },
            },
          ],
        },
        {
          name: 'served',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether the sentence has been served',
          },
        },
      ],
    },
    {
      name: 'reasoning',
      type: 'richText',
      admin: {
        condition: (data) =>
          data?.status === 'verdict' || data?.status === 'appeal' || data?.status === 'settled',
        description: 'Judge reasoning for the verdict',
      },
    },

    // Appeal
    {
      name: 'appealStatus',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Filed', value: 'filed' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Upheld', value: 'upheld' },
        { label: 'Overturned', value: 'overturned' },
        { label: 'Remanded', value: 'remanded' },
      ],
      index: true,
    },
    {
      name: 'appealCourt',
      type: 'relationship',
      relationTo: 'courts',
      admin: {
        condition: (data) => data?.appealStatus !== 'none',
        description: 'Higher court handling the appeal',
      },
    },
    {
      name: 'appealReasoning',
      type: 'richText',
      admin: {
        condition: (data) => data?.appealStatus !== 'none',
      },
    },

    // Settlement (for civil cases)
    {
      name: 'settlement',
      type: 'group',
      label: 'Settlement Terms',
      admin: {
        condition: (data) => data?.status === 'settled',
      },
      fields: [
        {
          name: 'terms',
          type: 'richText',
          admin: {
            description: 'Terms of the settlement',
          },
        },
        {
          name: 'confidential',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'compensation',
          type: 'array',
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
            },
          ],
        },
      ],
    },

    // Impact
    {
      name: 'precedentSetting',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this case sets a legal precedent',
      },
    },
    {
      name: 'publicInterest',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 0,
      admin: {
        description: 'Level of public interest in this case (0-1)',
      },
    },
    {
      name: 'mediaAttention',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      admin: {
        description: 'Media posts about this case',
      },
    },

    // Metadata
    {
      name: 'relatedCases',
      type: 'relationship',
      relationTo: 'cases',
      hasMany: true,
      admin: {
        description: 'Related or similar cases',
      },
    },
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
    {
      name: 'publicRecord',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this case is part of the public record',
      },
    },
  ],
  timestamps: true,
}
