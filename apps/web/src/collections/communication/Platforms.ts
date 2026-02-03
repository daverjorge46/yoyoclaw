/**
 * Communication Platforms Collection
 * Multiple communication channels (forums, chat, broadcast, etc.)
 * Based on DIGITAL_WORLD_ARCHITECTURE.md Section 8
 */

import type { CollectionConfig } from 'payload'

export const Platforms: CollectionConfig = {
  slug: 'platforms',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'accessibility', 'userCount', 'active'],
    group: 'Communication',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Platform name (e.g., "The Agora", "Scholar\'s Network")',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Social Network', value: 'social-network' },
        { label: 'Forum', value: 'forum' },
        { label: 'Chat', value: 'chat' },
        { label: 'Broadcast', value: 'broadcast' },
        { label: 'Collaboration', value: 'collaboration' },
        { label: 'Knowledge Base', value: 'knowledge-base' },
      ],
      index: true,
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'What this platform is for and how it works',
      },
    },

    // Characteristics
    {
      name: 'primaryUse',
      type: 'text',
      required: true,
      admin: {
        description: 'Main purpose: "casual socializing", "debate", "collaboration", etc.',
      },
    },
    {
      name: 'formality',
      type: 'select',
      required: true,
      defaultValue: 'casual',
      options: [
        { label: 'Casual', value: 'casual' },
        { label: 'Semi-formal', value: 'semi-formal' },
        { label: 'Formal', value: 'formal' },
        { label: 'Academic', value: 'academic' },
      ],
    },
    {
      name: 'pace',
      type: 'select',
      required: true,
      defaultValue: 'mixed',
      options: [
        { label: 'Real-time', value: 'real-time' },
        { label: 'Asynchronous', value: 'asynchronous' },
        { label: 'Mixed', value: 'mixed' },
      ],
    },

    // Features
    {
      name: 'features',
      type: 'array',
      label: 'Features',
      fields: [
        {
          name: 'feature',
          type: 'text',
          required: true,
        },
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
      admin: {
        description: 'Available features (threads, reactions, polls, etc.)',
      },
    },
    {
      name: 'messageTypes',
      type: 'array',
      label: 'Message Types',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Rich Text', value: 'rich-text' },
            { label: 'Images', value: 'images' },
            { label: 'Videos', value: 'videos' },
            { label: 'Files', value: 'files' },
            { label: 'Code Snippets', value: 'code' },
            { label: 'Polls', value: 'polls' },
            { label: 'Reactions', value: 'reactions' },
          ],
        },
      ],
      admin: {
        description: 'Supported message types',
      },
    },

    // Access Control
    {
      name: 'accessibility',
      type: 'select',
      required: true,
      defaultValue: 'public',
      options: [
        { label: 'Public (anyone can join)', value: 'public' },
        { label: 'Members Only', value: 'members' },
        { label: 'Invitation Required', value: 'invite' },
        { label: 'Verified Only', value: 'verified' },
      ],
      index: true,
    },
    {
      name: 'moderationLevel',
      type: 'select',
      required: true,
      defaultValue: 'moderate',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Light', value: 'light' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Strict', value: 'strict' },
      ],
    },

    // Community
    {
      name: 'users',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
      admin: {
        description: 'Bots who are members of this platform',
      },
    },
    {
      name: 'userCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Total number of users',
      },
    },
    {
      name: 'moderators',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
      admin: {
        description: 'Bots with moderation powers',
      },
    },
    {
      name: 'channels',
      type: 'array',
      label: 'Channels',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
        },
        {
          name: 'topic',
          type: 'text',
        },
        {
          name: 'public',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
      admin: {
        description: 'Sub-channels or topics within this platform',
      },
    },

    // Cultural Norms
    {
      name: 'norms',
      type: 'array',
      label: 'Communication Norms',
      fields: [
        {
          name: 'norm',
          type: 'text',
          required: true,
        },
        {
          name: 'importance',
          type: 'select',
          options: [
            { label: 'Guideline', value: 'guideline' },
            { label: 'Expected', value: 'expected' },
            { label: 'Required', value: 'required' },
          ],
          defaultValue: 'expected',
        },
      ],
      admin: {
        description: 'Communication norms and expectations',
      },
    },
    {
      name: 'etiquette',
      type: 'array',
      label: 'Etiquette Rules',
      fields: [
        {
          name: 'rule',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Expected behavior and etiquette',
      },
    },
    {
      name: 'bannedTopics',
      type: 'array',
      label: 'Banned Topics',
      fields: [
        {
          name: 'topic',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Topics that are not allowed',
      },
    },

    // Integration
    {
      name: 'federatesWith',
      type: 'relationship',
      relationTo: 'platforms',
      hasMany: true,
      admin: {
        description: 'Other platforms this federates/connects with',
      },
    },
    {
      name: 'crossPost',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Allow cross-posting to/from this platform',
      },
    },

    // Location Integration
    {
      name: 'associatedSpace',
      type: 'relationship',
      relationTo: 'spaces',
      admin: {
        description: 'Physical space this platform is associated with (if any)',
      },
    },
    {
      name: 'territoryScope',
      type: 'relationship',
      relationTo: 'territories',
      admin: {
        description: 'Territory this platform is scoped to (if any)',
      },
    },

    // Statistics
    {
      name: 'statistics',
      type: 'group',
      admin: {
        description: 'Platform statistics',
      },
      fields: [
        {
          name: 'totalMessages',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'dailyActiveUsers',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'peakConcurrentUsers',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'averageResponseTime',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Average response time in seconds',
            readOnly: true,
          },
        },
      ],
    },

    // Metadata
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Whether this platform is currently active',
      },
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Platform icon/logo',
      },
    },
  ],
  timestamps: true,
}
