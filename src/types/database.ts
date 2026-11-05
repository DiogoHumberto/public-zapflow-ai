// =====================================================
// Tipos do banco de dados — ZapFlow AI
// =====================================================
// Gerado MANUALMENTE a partir de:
//   supabase/migrations/001_initial_schema.sql
//   supabase/migrations/002_security_policies.sql
//   supabase/migrations/005_members_crud.sql (RPCs de membros)
//
// O arquivo mantém aliases de domínio (MemberRole, ProfileRow, ...) usados
// pelo app. Ao evoluir o schema, comparar as assinaturas com:
//   npx supabase gen types typescript --local
// e atualizar as Functions/Tables correspondentes aqui.
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamp = string;

type BaseRow = {
  id: string;
  created_at: Timestamp;
};

type Updatable = {
  updated_at: Timestamp;
};

// ---------- profiles ----------
export type ProfileRow = BaseRow &
  Updatable & {
    full_name: string | null;
    avatar_url: string | null;
  };
export type ProfileInsert = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
};
export type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "created_at">>;

// ---------- organizations ----------
export type OrganizationStatus = "active" | "suspended" | "cancelled";
export type OrganizationRow = BaseRow &
  Updatable & {
    name: string;
    slug: string;
    business_type: string | null;
    email: string | null;
    phone: string | null;
    timezone: string;
    status: OrganizationStatus;
  };
export type OrganizationInsert = {
  id?: string;
  name: string;
  slug: string;
  business_type?: string | null;
  email?: string | null;
  phone?: string | null;
  timezone?: string;
  status?: OrganizationStatus;
};
export type OrganizationUpdate = Partial<
  Omit<OrganizationRow, "id" | "created_at" | "updated_at">
>;

// ---------- organization_members ----------
export type MemberRole = "owner" | "admin" | "member";
export type OrganizationMemberRow = BaseRow & {
  organization_id: string;
  user_id: string;
  role: MemberRole;
};
export type OrganizationMemberInsert = {
  id?: string;
  organization_id: string;
  user_id: string;
  role?: MemberRole;
};
export type OrganizationMemberUpdate = Partial<
  Pick<OrganizationMemberRow, "role">
>;

// ---------- whatsapp_accounts ----------
export type WhatsappAccountStatus =
  | "pending"
  | "connected"
  | "disconnected"
  | "error";
export type WhatsappAccountRow = BaseRow &
  Updatable & {
    organization_id: string;
    phone_number: string;
    phone_number_id: string;
    business_account_id: string | null;
    credential_ref: string | null;
    display_name: string | null;
    status: WhatsappAccountStatus;
  };
export type WhatsappAccountInsert = {
  id?: string;
  organization_id: string;
  phone_number: string;
  phone_number_id: string;
  business_account_id?: string | null;
  credential_ref?: string | null;
  display_name?: string | null;
  status?: WhatsappAccountStatus;
};
export type WhatsappAccountUpdate = Partial<
  Omit<WhatsappAccountRow, "id" | "organization_id" | "created_at" | "updated_at">
>;

// ---------- contacts ----------
export type ContactRow = BaseRow &
  Updatable & {
    organization_id: string;
    name: string | null;
    phone: string;
    email: string | null;
    source: string | null;
    tags: string[];
    notes: string | null;
  };
export type ContactInsert = {
  id?: string;
  organization_id: string;
  name?: string | null;
  phone: string;
  email?: string | null;
  source?: string | null;
  tags?: string[];
  notes?: string | null;
};
export type ContactUpdate = Partial<
  Omit<ContactRow, "id" | "organization_id" | "created_at" | "updated_at">
>;

// ---------- conversations ----------
export type ConversationStatus = "open" | "pending" | "closed";
export type ConversationRow = BaseRow &
  Updatable & {
    organization_id: string;
    contact_id: string;
    whatsapp_account_id: string | null;
    status: ConversationStatus;
    assigned_user_id: string | null;
    ai_enabled: boolean;
    last_message_at: Timestamp | null;
  };
export type ConversationInsert = {
  id?: string;
  organization_id: string;
  contact_id: string;
  whatsapp_account_id?: string | null;
  status?: ConversationStatus;
  assigned_user_id?: string | null;
  ai_enabled?: boolean;
  last_message_at?: Timestamp | null;
};
export type ConversationUpdate = Partial<
  Omit<ConversationRow, "id" | "organization_id" | "created_at" | "updated_at">
>;

// ---------- messages ----------
export type MessageDirection = "inbound" | "outbound";
export type MessageSenderType = "customer" | "ai" | "agent" | "system";
export type MessageDeliveryStatus =
  | "received"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";
export type MessageRow = BaseRow & {
  organization_id: string;
  conversation_id: string;
  external_message_id: string | null;
  direction: MessageDirection;
  sender_type: MessageSenderType;
  message_type: string;
  content: string | null;
  delivery_status: MessageDeliveryStatus;
  metadata: Json;
};
export type MessageInsert = {
  id?: string;
  organization_id: string;
  conversation_id: string;
  external_message_id?: string | null;
  direction: MessageDirection;
  sender_type: MessageSenderType;
  message_type?: string;
  content?: string | null;
  delivery_status?: MessageDeliveryStatus;
  metadata?: Json;
};

// ---------- knowledge_base ----------
export type KnowledgeBaseRow = BaseRow &
  Updatable & {
    organization_id: string;
    title: string;
    content: string;
    category: string | null;
    is_active: boolean;
  };
export type KnowledgeBaseInsert = {
  id?: string;
  organization_id: string;
  title: string;
  content: string;
  category?: string | null;
  is_active?: boolean;
};
export type KnowledgeBaseUpdate = Partial<
  Omit<KnowledgeBaseRow, "id" | "organization_id" | "created_at" | "updated_at">
>;

// ---------- subscriptions ----------
export type SubscriptionPlan = "starter" | "pro" | "business";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";
export type SubscriptionRow = BaseRow &
  Updatable & {
    organization_id: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    provider: string | null;
    external_subscription_id: string | null;
    current_period_start: Timestamp | null;
    current_period_end: Timestamp | null;
  };
export type SubscriptionInsert = {
  id?: string;
  organization_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  provider?: string | null;
  external_subscription_id?: string | null;
  current_period_start?: Timestamp | null;
  current_period_end?: Timestamp | null;
};
export type SubscriptionUpdate = Partial<
  Omit<SubscriptionRow, "id" | "organization_id" | "created_at" | "updated_at">
>;

// ---------- usage_records ----------
export type UsageType = "ai_request" | "whatsapp_message" | "conversation";
export type UsageRecordRow = BaseRow & {
  organization_id: string;
  usage_type: UsageType;
  quantity: number;
  estimated_cost: number | null;
  metadata: Json;
};
export type UsageRecordInsert = {
  id?: string;
  organization_id: string;
  usage_type: UsageType;
  quantity?: number;
  estimated_cost?: number | null;
  metadata?: Json;
};

// ---------- Database (formato @supabase/supabase-js) ----------
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: never[];
      };
      organizations: {
        Row: OrganizationRow;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
        Relationships: never[];
      };
      organization_members: {
        Row: OrganizationMemberRow;
        Insert: OrganizationMemberInsert;
        Update: OrganizationMemberUpdate;
        Relationships: never[];
      };
      whatsapp_accounts: {
        Row: WhatsappAccountRow;
        Insert: WhatsappAccountInsert;
        Update: WhatsappAccountUpdate;
        Relationships: never[];
      };
      contacts: {
        Row: ContactRow;
        Insert: ContactInsert;
        Update: ContactUpdate;
        Relationships: never[];
      };
      conversations: {
        Row: ConversationRow;
        Insert: ConversationInsert;
        Update: ConversationUpdate;
        Relationships: never[];
      };
      messages: {
        Row: MessageRow;
        Insert: MessageInsert;
        Update: Record<string, never>;
        Relationships: never[];
      };
      knowledge_base: {
        Row: KnowledgeBaseRow;
        Insert: KnowledgeBaseInsert;
        Update: KnowledgeBaseUpdate;
        Relationships: never[];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
        Relationships: never[];
      };
      usage_records: {
        Row: UsageRecordRow;
        Insert: UsageRecordInsert;
        Update: Record<string, never>;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string; p_business_type: string | null };
        Returns: string;
      };
      current_organization_id: { Args: Record<string, never>; Returns: string | null };
      is_org_member: { Args: { target_org: string }; Returns: boolean };
      is_org_admin: { Args: { target_org: string }; Returns: boolean };
      change_member_role: {
        Args: { p_member_id: string; p_new_role: string };
        Returns: undefined;
      };
      remove_member: { Args: { p_member_id: string }; Returns: undefined };
      add_member_by_email: {
        Args: { p_email: string; p_role: string };
        Returns: string;
      };
      update_member_profile: {
        Args: { p_member_id: string; p_full_name: string };
        Returns: undefined;
      };
      list_organization_members: {
        Args: Record<string, never>;
        Returns: {
          member_id: string;
          user_id: string;
          full_name: string | null;
          /** NULL quando o chamador não é owner/admin. */
          email: string | null;
          role: string;
          created_at: string;
          invitation_pending: boolean;
        }[];
      };
    };
  };
};
