/**
 * Gmail channel type definitions.
 */

/**
 * Email message structure.
 */
export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  date: Date;
  labels: string[];
  isUnread: boolean;
  snippet: string;
}

/**
 * Email thread structure.
 */
export interface EmailThread {
  id: string;
  messages: EmailMessage[];
  subject: string;
  participants: string[];
  messageCount: number;
  lastMessageDate: Date;
}

/**
 * Email draft for sending.
 */
export interface EmailDraft {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}

/**
 * Email search result.
 */
export interface EmailSearchResult {
  messages: EmailMessage[];
  nextPageToken?: string;
  totalEstimate: number;
}

/**
 * Gmail label metadata.
 */
export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesTotal: number;
  messagesUnread: number;
}

/**
 * Gmail account info.
 */
export interface GmailAccount {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/**
 * Gmail send result.
 */
export interface SendResult {
  messageId: string;
  threadId: string;
}
