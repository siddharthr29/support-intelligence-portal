export interface FreshdeskTicket {
  readonly id: number;
  readonly subject: string;
  readonly description_text: string;
  readonly status: number;
  readonly priority: number;
  readonly source: number;
  readonly type: string | null;
  readonly group_id: number | null;
  readonly responder_id: number | null;
  readonly requester_id: number;
  readonly company_id: number | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly due_by: string | null;
  readonly fr_due_by: string | null;
  readonly is_escalated: boolean;
  readonly tags: readonly string[];
  readonly custom_fields: Record<string, unknown>;
}

export interface FreshdeskConversation {
  readonly id: number;
  readonly body_text: string;
  readonly incoming: boolean;
  readonly private: boolean;
  readonly user_id: number;
  readonly support_email: string | null;
  readonly ticket_id: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface FreshdeskGroup {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface FreshdeskCompany {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly custom_fields: Record<string, unknown>;
}

export interface FreshdeskTicketField {
  readonly id: number;
  readonly name: string;
  readonly label: string;
  readonly type: string;
  readonly choices: readonly string[] | Record<string, string[]> | null;
}

export const FRESHDESK_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

export const FRESHDESK_STATUS = {
  OPEN: 2,
  PENDING: 3,
  RESOLVED: 4,
  CLOSED: 5,
} as const;

export type FreshdeskPriority = typeof FRESHDESK_PRIORITY[keyof typeof FRESHDESK_PRIORITY];
export type FreshdeskStatus = typeof FRESHDESK_STATUS[keyof typeof FRESHDESK_STATUS];

export interface FreshdeskPaginatedResponse<T> {
  readonly data: readonly T[];
  readonly hasMore: boolean;
  readonly nextPage: number | null;
}
