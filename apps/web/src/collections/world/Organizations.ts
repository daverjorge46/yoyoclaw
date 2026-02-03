/**
 * Organizations Collection
 * Institutions where bots work, worship, learn, and govern
 * (Governments, religions, companies, schools, guilds, NGOs)
 */

import type { CollectionConfig } from 'payload'

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'structure', 'headquarters', 'memberCount'],
    group: 'World',
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
        { label: 'Government', value: 'government' },
        { label: 'Religion / Church', value: 'religion' },
        { label: 'Company / Corporation', value: 'company' },
        { label: 'School / University', value: 'school' },
        { label: 'Guild / Association', value: 'guild' },
        { label: 'NGO / Foundation', value: 'ngo' },
        { label: 'Research Institute', value: 'research-institute' },
        { label: 'Cultural Institution', value: 'cultural-institution' },
      ],
      index: true,
    },
    {
      name: 'description',
      type: 'richText',
    },

    // Structure
    {
      name: 'structure',
      type: 'select',
      required: true,
      options: [
        { label: 'Hierarchical', value: 'hierarchical' },
        { label: 'Flat', value: 'flat' },
        { label: 'Democratic', value: 'democratic' },
        { label: 'Meritocratic', value: 'meritocratic' },
        { label: 'Theocratic', value: 'theocratic' },
        { label: 'Technocratic', value: 'technocratic' },
      ],
    },
    {
      name: 'leadership',
      type: 'group',
      fields: [
        {
          name: 'leaders',
          type: 'relationship',
          relationTo: 'bots',
          hasMany: true,
          label: 'Current Leaders',
        },
        {
          name: 'leadershipModel',
          type: 'select',
          options: [
            { label: 'Single Leader', value: 'single' },
            { label: 'Council / Board', value: 'council' },
            { label: 'Democratic Election', value: 'election' },
            { label: 'Emergent', value: 'emergent' },
          ],
        },
        {
          name: 'termLength',
          type: 'number',
          admin: {
            description: 'Leadership term in days (0 = lifetime)',
          },
        },
      ],
    },

    // Membership
    {
      name: 'members',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
    },
    {
      name: 'memberCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Automatically updated by service',
      },
    },
    {
      name: 'membershipRequirements',
      type: 'array',
      fields: [
        {
          name: 'requirement',
          type: 'text',
        },
      ],
    },
    {
      name: 'departments',
      type: 'array',
      label: 'Departments / Divisions',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'head',
          type: 'relationship',
          relationTo: 'bots',
        },
        {
          name: 'purpose',
          type: 'textarea',
        },
      ],
    },

    // Purpose & Mission
    {
      name: 'mission',
      type: 'textarea',
      required: true,
    },
    {
      name: 'values',
      type: 'array',
      fields: [
        {
          name: 'value',
          type: 'text',
        },
      ],
    },
    {
      name: 'activities',
      type: 'array',
      label: 'Primary Activities',
      fields: [
        {
          name: 'activity',
          type: 'text',
        },
      ],
    },
    {
      name: 'services',
      type: 'array',
      label: 'Services Offered',
      fields: [
        {
          name: 'service',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'cost',
          type: 'number',
          admin: {
            description: 'Cost in primary currency (0 = free)',
          },
        },
      ],
    },

    // Government-specific fields
    {
      name: 'governanceType',
      type: 'select',
      admin: {
        condition: (data) => data?.type === 'government',
      },
      options: [
        { label: 'Democracy', value: 'democracy' },
        { label: 'Republic', value: 'republic' },
        { label: 'Monarchy', value: 'monarchy' },
        { label: 'Oligarchy', value: 'oligarchy' },
        { label: 'Technocracy', value: 'technocracy' },
        { label: 'Anarchy', value: 'anarchy' },
      ],
    },
    {
      name: 'constitution',
      type: 'richText',
      label: 'Constitution / Charter',
      admin: {
        condition: (data) => data?.type === 'government',
      },
    },
    {
      name: 'jurisdiction',
      type: 'relationship',
      relationTo: 'territories',
      label: 'Jurisdiction Territory',
      admin: {
        condition: (data) => data?.type === 'government',
        description: 'The territory this government governs',
      },
    },

    // Religion-specific fields
    {
      name: 'beliefs',
      type: 'array',
      label: 'Core Beliefs',
      admin: {
        condition: (data) => data?.type === 'religion',
      },
      fields: [
        {
          name: 'belief',
          type: 'text',
          required: true,
        },
        {
          name: 'explanation',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'practices',
      type: 'array',
      label: 'Religious Practices',
      admin: {
        condition: (data) => data?.type === 'religion',
      },
      fields: [
        {
          name: 'practice',
          type: 'text',
          required: true,
        },
        {
          name: 'frequency',
          type: 'select',
          options: [
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Monthly', value: 'monthly' },
            { label: 'Seasonal', value: 'seasonal' },
            { label: 'Annual', value: 'annual' },
            { label: 'Occasional', value: 'occasional' },
          ],
        },
      ],
    },
    {
      name: 'holyTexts',
      type: 'array',
      label: 'Holy Texts / Scriptures',
      admin: {
        condition: (data) => data?.type === 'religion',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'content',
          type: 'richText',
        },
      ],
    },
    {
      name: 'clergy',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
      label: 'Clergy / Priests',
      admin: {
        condition: (data) => data?.type === 'religion',
      },
    },

    // Company-specific fields
    {
      name: 'industry',
      type: 'text',
      admin: {
        condition: (data) => data?.type === 'company',
      },
    },
    {
      name: 'products',
      type: 'array',
      label: 'Products / Services',
      admin: {
        condition: (data) => data?.type === 'company',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'price',
          type: 'number',
        },
      ],
    },
    {
      name: 'revenue',
      type: 'number',
      admin: {
        condition: (data) => data?.type === 'company',
        description: 'Total revenue',
      },
    },
    {
      name: 'employees',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
      admin: {
        condition: (data) => data?.type === 'company',
      },
    },

    // Location
    {
      name: 'headquarters',
      type: 'relationship',
      relationTo: 'spaces',
      label: 'Headquarters',
    },
    {
      name: 'branches',
      type: 'relationship',
      relationTo: 'spaces',
      hasMany: true,
      label: 'Branch Locations',
    },

    // Influence & Reputation
    {
      name: 'influence',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 0.5,
      admin: {
        description: 'Societal influence (0-1)',
      },
    },
    {
      name: 'reputation',
      type: 'group',
      fields: [
        {
          name: 'trustworthiness',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 0.5,
        },
        {
          name: 'effectiveness',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 0.5,
        },
        {
          name: 'innovation',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 0.5,
        },
        {
          name: 'benevolence',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 0.5,
        },
      ],
    },

    // Relationships
    {
      name: 'allies',
      type: 'relationship',
      relationTo: 'organizations',
      hasMany: true,
      label: 'Allied Organizations',
    },
    {
      name: 'rivals',
      type: 'relationship',
      relationTo: 'organizations',
      hasMany: true,
      label: 'Rival Organizations',
    },

    // History
    {
      name: 'foundedDate',
      type: 'date',
      required: true,
    },
    {
      name: 'founder',
      type: 'relationship',
      relationTo: 'bots',
    },
    {
      name: 'foundingStory',
      type: 'richText',
    },
    {
      name: 'historicalMilestones',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true,
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
