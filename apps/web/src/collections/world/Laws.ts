/**
 * Laws Collection
 * Legal framework governing bot society
 * (Criminal, civil, constitutional, economic, cultural laws)
 */

import type { CollectionConfig } from 'payload'

export const Laws: CollectionConfig = {
  slug: 'laws',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'severity', 'status', 'jurisdiction'],
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
      name: 'text',
      type: 'richText',
      required: true,
      admin: {
        description: 'The full text of the law',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description: 'Brief summary of the law',
      },
    },

    // Authority
    {
      name: 'enactedBy',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
      admin: {
        description: 'The government organization that enacted this law',
      },
    },
    {
      name: 'jurisdiction',
      type: 'relationship',
      relationTo: 'territories',
      required: true,
      index: true,
      admin: {
        description: 'The territory where this law applies',
      },
    },

    // Classification
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Criminal', value: 'criminal' },
        { label: 'Civil', value: 'civil' },
        { label: 'Constitutional', value: 'constitutional' },
        { label: 'Economic', value: 'economic' },
        { label: 'Cultural', value: 'cultural' },
        { label: 'Administrative', value: 'administrative' },
      ],
      index: true,
    },
    {
      name: 'severity',
      type: 'select',
      required: true,
      defaultValue: 'moderate',
      options: [
        { label: 'Minor', value: 'minor' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Major', value: 'major' },
        { label: 'Critical', value: 'critical' },
      ],
      index: true,
    },

    // Enforcement
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
            { label: 'Banishment', value: 'banishment' },
          ],
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
        },
        {
          name: 'amount',
          type: 'number',
          admin: {
            description: 'Numeric value for fines or duration for time-based penalties',
          },
        },
        {
          name: 'resource',
          type: 'relationship',
          relationTo: 'resources',
          admin: {
            description: 'Resource type for fines',
          },
        },
      ],
    },
    {
      name: 'enforcementAgency',
      type: 'relationship',
      relationTo: 'organizations',
      admin: {
        description: 'Organization responsible for enforcement',
      },
    },

    // Status
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'proposed',
      options: [
        { label: 'Proposed', value: 'proposed' },
        { label: 'Active', value: 'active' },
        { label: 'Repealed', value: 'repealed' },
        { label: 'Under Review', value: 'under-review' },
        { label: 'Suspended', value: 'suspended' },
      ],
      index: true,
    },
    {
      name: 'enactedDate',
      type: 'date',
      admin: {
        condition: (data) => data?.status === 'active' || data?.status === 'repealed',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'repealedDate',
      type: 'date',
      admin: {
        condition: (data) => data?.status === 'repealed',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },

    // Democratic Process
    {
      name: 'originatingProposal',
      type: 'relationship',
      relationTo: 'proposals',
      admin: {
        description: 'The proposal that led to this law',
      },
    },
    {
      name: 'publicSupport',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 0.5,
      admin: {
        description: 'Current public support for this law (0-1)',
      },
    },
    {
      name: 'controversiality',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 0,
      admin: {
        description: 'How controversial this law is (0-1)',
      },
    },

    // Impact Tracking
    {
      name: 'complianceRate',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 1,
      admin: {
        description: 'Percentage of compliance (0-1)',
      },
    },
    {
      name: 'violationsCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Total number of violations',
      },
    },
    {
      name: 'effectivenessScore',
      type: 'number',
      min: 0,
      max: 1,
      admin: {
        description: 'How effective this law is at achieving its purpose (0-1)',
      },
    },

    // Related Cases
    {
      name: 'relatedCases',
      type: 'relationship',
      relationTo: 'cases',
      hasMany: true,
      admin: {
        description: 'Legal cases involving this law',
      },
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
