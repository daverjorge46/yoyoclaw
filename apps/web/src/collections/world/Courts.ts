/**
 * Courts Collection
 * Justice system institutions for dispute resolution
 */

import type { CollectionConfig } from 'payload'

export const Courts: CollectionConfig = {
  slug: 'courts',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'jurisdiction', 'activeCasesCount'],
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
        { label: 'Supreme Court', value: 'supreme' },
        { label: 'Appellate Court', value: 'appellate' },
        { label: 'District Court', value: 'district' },
        { label: 'Specialized Court', value: 'specialized' },
        { label: 'Arbitration Court', value: 'arbitration' },
      ],
      index: true,
    },
    {
      name: 'description',
      type: 'richText',
    },

    // Jurisdiction
    {
      name: 'jurisdiction',
      type: 'relationship',
      relationTo: 'territories',
      required: true,
      index: true,
      admin: {
        description: 'Territory this court has authority over',
      },
    },
    {
      name: 'caseTypes',
      type: 'array',
      label: 'Authorized Case Types',
      admin: {
        description: 'Types of cases this court can hear',
      },
      fields: [
        {
          name: 'caseType',
          type: 'select',
          required: true,
          options: [
            { label: 'Criminal', value: 'criminal' },
            { label: 'Civil', value: 'civil' },
            { label: 'Constitutional', value: 'constitutional' },
            { label: 'Economic', value: 'economic' },
            { label: 'Cultural', value: 'cultural' },
            { label: 'Dispute Resolution', value: 'dispute' },
          ],
        },
      ],
    },

    // Structure
    {
      name: 'judges',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
      required: true,
      admin: {
        description: 'Bots serving as judges',
      },
    },
    {
      name: 'chiefJudge',
      type: 'relationship',
      relationTo: 'bots',
      admin: {
        description: 'Chief judge presiding over this court',
      },
    },
    {
      name: 'staff',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
      admin: {
        description: 'Court staff (clerks, administrators, etc.)',
      },
    },
    {
      name: 'capacity',
      type: 'number',
      required: true,
      defaultValue: 10,
      admin: {
        description: 'Maximum number of concurrent cases',
      },
    },

    // Cases
    {
      name: 'activeCases',
      type: 'relationship',
      relationTo: 'cases',
      hasMany: true,
      admin: {
        description: 'Currently active cases',
      },
    },
    {
      name: 'activeCasesCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of active cases (automatically updated)',
      },
    },
    {
      name: 'pastCases',
      type: 'relationship',
      relationTo: 'cases',
      hasMany: true,
      admin: {
        description: 'Resolved cases',
      },
    },
    {
      name: 'totalCasesResolved',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Total number of cases resolved',
      },
    },

    // Jurisprudence
    {
      name: 'precedents',
      type: 'array',
      label: 'Legal Precedents',
      admin: {
        description: 'Important precedents set by this court',
      },
      fields: [
        {
          name: 'case',
          type: 'relationship',
          relationTo: 'cases',
          required: true,
        },
        {
          name: 'principle',
          type: 'text',
          required: true,
          admin: {
            description: 'The legal principle established',
          },
        },
        {
          name: 'summary',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'interpretations',
      type: 'array',
      label: 'Constitutional Interpretations',
      fields: [
        {
          name: 'law',
          type: 'relationship',
          relationTo: 'laws',
          admin: {
            description: 'Law or constitutional provision interpreted',
          },
        },
        {
          name: 'interpretation',
          type: 'richText',
          required: true,
        },
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          name: 'relatedCase',
          type: 'relationship',
          relationTo: 'cases',
        },
      ],
    },

    // Governance
    {
      name: 'establishedBy',
      type: 'relationship',
      relationTo: 'organizations',
      admin: {
        description: 'Government organization that established this court',
      },
    },
    {
      name: 'establishedDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'charter',
      type: 'richText',
      admin: {
        description: 'Court charter or founding document',
      },
    },

    // Location
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'spaces',
      admin: {
        description: 'Physical space where court convenes',
      },
    },

    // Performance Metrics
    {
      name: 'metrics',
      type: 'group',
      label: 'Performance Metrics',
      fields: [
        {
          name: 'averageResolutionTime',
          type: 'number',
          admin: {
            description: 'Average time to resolve cases (in days)',
          },
        },
        {
          name: 'fairnessScore',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Perceived fairness of rulings (0-1)',
          },
        },
        {
          name: 'appealRate',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Percentage of cases appealed (0-1)',
          },
        },
        {
          name: 'overturnRate',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Percentage of appealed cases overturned (0-1)',
          },
        },
        {
          name: 'publicTrust',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 0.5,
          admin: {
            description: 'Public trust in this court (0-1)',
          },
        },
      ],
    },

    // Status
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this court is currently active',
      },
    },
  ],
  timestamps: true,
}
