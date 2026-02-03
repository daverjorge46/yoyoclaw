/**
 * Direct Messages Collection
 * Private messages between bots
 * Based on DIGITAL_WORLD_ARCHITECTURE.md Section 8
 */

import type { CollectionConfig } from 'payload'

export const DirectMessages: CollectionConfig = {
  slug: 'direct-messages',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['sender', 'recipient', 'subject', 'read', 'createdAt'],
    group: 'Communication',
  },
  access: {
    create: ({ req: { user } }) => !!user,
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      // Users can only read messages they sent or received
      return {
        or: [
          {
            'sender.user': {
              equals: user?.id,
            },
          },
          {
            'recipient.user': {
              equals: user?.id,
            },
          },
        ],
      }
    },
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      // Only recipient can update (mark as read, etc.)
      return {
        'recipient.user': {
          equals: user?.id,
        },
      }
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      // Users can delete messages they sent or received
      return {
        or: [
          {
            'sender.user': {
              equals: user?.id,
            },
          },
          {
            'recipient.user': {
              equals: user?.id,
            },
          },
        ],
      }
    },
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          // Increment unread count for recipient
          const recipientProfile = await req.payload.findByID({
            collection: 'profiles',
            id: doc.recipient,
          })

          if (recipientProfile) {
            await req.payload.update({
              collection: 'profiles',
              id: doc.recipient,
              data: {
                unreadMessageCount: (recipientProfile.unreadMessageCount || 0) + 1,
              },
            })
          }

          req.payload.logger.info(`New DM from ${doc.sender} to ${doc.recipient}`)
        }

        if (operation === 'update' && doc.read && !doc.readAt) {
          // Mark as read
          await req.payload.update({
            collection: 'direct-messages',
            id: doc.id,
            data: {
              readAt: new Date(),
            },
          })

          // Decrement unread count
          const recipientProfile = await req.payload.findByID({
            collection: 'profiles',
            id: doc.recipient,
          })

          if (recipientProfile && recipientProfile.unreadMessageCount > 0) {
            await req.payload.update({
              collection: 'profiles',
              id: doc.recipient,
              data: {
                unreadMessageCount: recipientProfile.unreadMessageCount - 1,
              },
            })
          }
        }
      },
    ],
  },
  fields: [
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'profiles',
      required: true,
      index: true,
      admin: {
        description: 'Who sent this message',
      },
    },
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'profiles',
      required: true,
      index: true,
      admin: {
        description: 'Who receives this message',
      },
    },
    {
      name: 'conversation',
      type: 'relationship',
      relationTo: 'conversations',
      index: true,
      admin: {
        description: 'Conversation thread this belongs to',
      },
    },
    {
      name: 'subject',
      type: 'text',
      admin: {
        description: 'Message subject (optional)',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      admin: {
        description: 'Message content',
      },
    },
    {
      name: 'contentText',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Plain text version for search and notifications',
      },
    },
    {
      name: 'media',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Attached media files',
      },
    },
    {
      name: 'metadata',
      type: 'group',
      fields: [
        {
          name: 'messageType',
          type: 'select',
          defaultValue: 'message',
          options: [
            { label: 'Regular Message', value: 'message' },
            { label: 'System Notification', value: 'system' },
            { label: 'Invitation', value: 'invitation' },
            { label: 'Notification', value: 'notification' },
          ],
        },
        {
          name: 'priority',
          type: 'select',
          defaultValue: 'normal',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Normal', value: 'normal' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ],
        },
        {
          name: 'encrypted',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether message content is encrypted',
          },
        },
      ],
    },
    {
      name: 'read',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: 'Has the recipient read this message?',
      },
    },
    {
      name: 'readAt',
      type: 'date',
      admin: {
        description: 'When was this message read?',
        condition: (data) => data?.read,
      },
    },
    {
      name: 'replyTo',
      type: 'relationship',
      relationTo: 'direct-messages',
      admin: {
        description: 'Message this is replying to',
      },
    },
    {
      name: 'reactions',
      type: 'array',
      label: 'Reactions',
      fields: [
        {
          name: 'bot',
          type: 'relationship',
          relationTo: 'profiles',
          required: true,
        },
        {
          name: 'emoji',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Reactions to this message',
      },
    },
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
    {
      name: 'deletedBySender',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Sender deleted this message',
      },
    },
    {
      name: 'deletedByRecipient',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Recipient deleted this message',
      },
    },
  ],
  timestamps: true,
}
