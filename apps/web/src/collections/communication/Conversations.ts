/**
 * Conversations Collection
 * Message threads and conversation contexts
 * Based on DIGITAL_WORLD_ARCHITECTURE.md Section 8
 */

import type { CollectionConfig } from 'payload'

export const Conversations: CollectionConfig = {
  slug: 'conversations',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'participants', 'messageCount', 'lastMessageAt', 'active'],
    group: 'Communication',
  },
  access: {
    create: ({ req: { user } }) => !!user,
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      // Users can only read conversations they're participants in
      return {
        participants: {
          in: user?.assignedBots || [],
        },
      }
    },
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      // Participants can update
      return {
        participants: {
          in: user?.assignedBots || [],
        },
      }
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      // Only creator can delete
      return {
        'createdBy.user': {
          equals: user?.id,
        },
      }
    },
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          req.payload.logger.info(
            `New conversation created: ${doc.title} with ${doc.participants?.length || 0} participants`
          )
        }
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Conversation title or subject',
      },
    },
    {
      name: 'conversationType',
      type: 'select',
      required: true,
      defaultValue: 'direct',
      options: [
        { label: 'Direct (1-on-1)', value: 'direct' },
        { label: 'Group', value: 'group' },
        { label: 'Thread', value: 'thread' },
        { label: 'Channel', value: 'channel' },
      ],
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Conversation description or topic',
      },
    },

    // Participants
    {
      name: 'participants',
      type: 'relationship',
      relationTo: 'profiles',
      hasMany: true,
      required: true,
      index: true,
      admin: {
        description: 'Bots participating in this conversation',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'profiles',
      required: true,
      admin: {
        description: 'Who created this conversation',
      },
    },
    {
      name: 'moderators',
      type: 'relationship',
      relationTo: 'profiles',
      hasMany: true,
      admin: {
        description: 'Conversation moderators (for groups)',
      },
    },

    // Platform Context
    {
      name: 'platform',
      type: 'relationship',
      relationTo: 'platforms',
      index: true,
      admin: {
        description: 'Communication platform this conversation belongs to',
      },
    },
    {
      name: 'channel',
      type: 'text',
      admin: {
        description: 'Specific channel within the platform',
      },
    },

    // Conversation State
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Is this conversation still active?',
      },
    },
    {
      name: 'archived',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Has this conversation been archived?',
      },
    },
    {
      name: 'locked',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Is this conversation locked (no new messages)?',
      },
    },

    // Privacy & Access
    {
      name: 'privacy',
      type: 'select',
      required: true,
      defaultValue: 'private',
      options: [
        { label: 'Private', value: 'private' },
        { label: 'Participants Only', value: 'participants' },
        { label: 'Members (of platform)', value: 'members' },
        { label: 'Public', value: 'public' },
      ],
    },
    {
      name: 'inviteOnly',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Can only join by invitation?',
      },
    },
    {
      name: 'maxParticipants',
      type: 'number',
      admin: {
        description: 'Maximum number of participants (optional)',
      },
    },

    // Statistics
    {
      name: 'messageCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Total number of messages',
      },
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
        description: 'When was the last message sent?',
      },
    },
    {
      name: 'lastMessageBy',
      type: 'relationship',
      relationTo: 'profiles',
      admin: {
        readOnly: true,
        description: 'Who sent the last message?',
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        description: 'When did this conversation start?',
      },
    },
    {
      name: 'endedAt',
      type: 'date',
      admin: {
        description: 'When did this conversation end?',
        condition: (data) => !data?.active,
      },
    },

    // Context & Metadata
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Tags for categorization and search',
      },
    },
    {
      name: 'relatedSpace',
      type: 'relationship',
      relationTo: 'spaces',
      admin: {
        description: 'Physical space this conversation is associated with',
      },
    },
    {
      name: 'relatedEvent',
      type: 'relationship',
      relationTo: 'events',
      admin: {
        description: 'Event this conversation is about or happening during',
      },
    },
    {
      name: 'relatedOrganization',
      type: 'relationship',
      relationTo: 'organizations',
      admin: {
        description: 'Organization this conversation is associated with',
      },
    },

    // Features
    {
      name: 'features',
      type: 'group',
      label: 'Conversation Features',
      fields: [
        {
          name: 'allowReplies',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'allowReactions',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'allowMedia',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'allowEditing',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'allowDeletion',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'notificationsEnabled',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },

    // Moderation
    {
      name: 'flagged',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Flagged for moderation',
      },
    },
    {
      name: 'flagReason',
      type: 'textarea',
      admin: {
        condition: (data) => data?.flagged,
      },
    },

    // Summary
    {
      name: 'summary',
      type: 'richText',
      admin: {
        description: 'AI-generated or manual summary of the conversation',
      },
    },
    {
      name: 'keyPoints',
      type: 'array',
      label: 'Key Points',
      fields: [
        {
          name: 'point',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Important points discussed in this conversation',
      },
    },

    // Pinned Messages
    {
      name: 'pinnedMessages',
      type: 'relationship',
      relationTo: 'direct-messages',
      hasMany: true,
      admin: {
        description: 'Messages pinned in this conversation',
      },
    },
  ],
  timestamps: true,
}
