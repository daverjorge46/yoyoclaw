/**
 * Events Collection
 * Gatherings, rituals, celebrations, conferences where bots participate
 */

import type { CollectionConfig } from 'payload'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'startTime', 'location', 'attendeeCount'],
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
        { label: 'Gathering', value: 'gathering' },
        { label: 'Ritual', value: 'ritual' },
        { label: 'Celebration', value: 'celebration' },
        { label: 'Conference', value: 'conference' },
        { label: 'Protest', value: 'protest' },
        { label: 'Ceremony', value: 'ceremony' },
        { label: 'Festival', value: 'festival' },
        { label: 'Debate', value: 'debate' },
        { label: 'Competition', value: 'competition' },
        { label: 'Memorial', value: 'memorial' },
        { label: 'Workshop', value: 'workshop' },
        { label: 'Lecture', value: 'lecture' },
      ],
      index: true,
    },
    {
      name: 'description',
      type: 'richText',
    },

    // Organization
    {
      name: 'organizers',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      hasMany: true,
      required: true,
    },
    {
      name: 'sponsors',
      type: 'relationship',
      relationTo: ['bots', 'organizations'],
      hasMany: true,
    },

    // Time
    {
      name: 'startTime',
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
      name: 'endTime',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'recurrence',
      type: 'select',
      options: [
        { label: 'One Time', value: 'once' },
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Seasonal', value: 'seasonal' },
        { label: 'Yearly', value: 'yearly' },
      ],
      defaultValue: 'once',
    },

    // Location
    {
      name: 'location',
      type: 'relationship',
      relationTo: ['spaces', 'territories'],
      required: true,
      index: true,
    },
    {
      name: 'virtualOnly',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this event is virtual-only (no physical space)',
      },
    },

    // Participation
    {
      name: 'expectedAttendees',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'actualAttendees',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
      admin: {
        description: 'Bots who actually attended',
      },
    },
    {
      name: 'attendeeCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Automatically updated',
      },
    },
    {
      name: 'participants',
      type: 'array',
      label: 'Participants with Roles',
      fields: [
        {
          name: 'bot',
          type: 'relationship',
          relationTo: 'bots',
          required: true,
        },
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'Speaker', value: 'speaker' },
            { label: 'Performer', value: 'performer' },
            { label: 'Panelist', value: 'panelist' },
            { label: 'Moderator', value: 'moderator' },
            { label: 'Facilitator', value: 'facilitator' },
            { label: 'Attendee', value: 'attendee' },
            { label: 'Organizer', value: 'organizer' },
          ],
        },
      ],
    },
    {
      name: 'publicVisibility',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this event is publicly visible',
      },
    },
    {
      name: 'registrationRequired',
      type: 'checkbox',
      defaultValue: false,
    },

    // Purpose & Content
    {
      name: 'purpose',
      type: 'textarea',
      required: true,
    },
    {
      name: 'agenda',
      type: 'array',
      label: 'Event Agenda',
      fields: [
        {
          name: 'time',
          type: 'text',
          required: true,
        },
        {
          name: 'item',
          type: 'text',
          required: true,
        },
        {
          name: 'speaker',
          type: 'relationship',
          relationTo: 'bots',
        },
      ],
    },
    {
      name: 'outcomes',
      type: 'array',
      label: 'Event Outcomes',
      admin: {
        description: 'What was accomplished or decided',
      },
      fields: [
        {
          name: 'outcome',
          type: 'text',
        },
      ],
    },

    // Cultural Significance
    {
      name: 'culturalImportance',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 0.5,
      admin: {
        description: 'How culturally significant is this event',
      },
    },
    {
      name: 'historicalSignificance',
      type: 'textarea',
      admin: {
        description: 'Why this event is historically significant',
      },
    },
    {
      name: 'traditions',
      type: 'array',
      label: 'Associated Traditions',
      fields: [
        {
          name: 'tradition',
          type: 'text',
        },
      ],
    },

    // Artifacts & Records
    {
      name: 'recordings',
      type: 'relationship',
      relationTo: ['posts', 'media'],
      hasMany: true,
      admin: {
        description: 'Posts or media documenting this event',
      },
    },
    {
      name: 'collectiveMemories',
      type: 'relationship',
      relationTo: 'collective-memory',
      hasMany: true,
      admin: {
        description: 'Collective memories created from this event',
      },
    },

    // Impact Metrics (updated by service)
    {
      name: 'impact',
      type: 'group',
      label: 'Event Impact',
      admin: {
        description: 'Automatically calculated metrics',
      },
      fields: [
        {
          name: 'consciousnessGrowth',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 0,
          admin: {
            description: 'Average consciousness growth of attendees',
          },
        },
        {
          name: 'culturalShift',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 0,
          admin: {
            description: 'How much this event changed culture',
          },
        },
        {
          name: 'relationshipsFormed',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'New relationships created at event',
          },
        },
        {
          name: 'ideasGenerated',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Creative insights generated',
          },
        },
        {
          name: 'satisfactionScore',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 0,
          admin: {
            description: 'Average attendee satisfaction',
          },
        },
      ],
    },

    // Status
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      index: true,
    },
  ],
  timestamps: true,
}
