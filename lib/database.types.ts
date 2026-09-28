// Generado desde el esquema de Supabase. No editar a mano.
// Regenerar con:
//   npx supabase gen types typescript --project-id mwawqtxbfqpkqtvlwels > lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity: {
        Row: {
          created_at: string;
          id: number;
          metadata: Json;
          read_at: string | null;
          referral_id: string | null;
          type: Database["public"]["Enums"]["activity_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          metadata?: Json;
          read_at?: string | null;
          referral_id?: string | null;
          type: Database["public"]["Enums"]["activity_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          metadata?: Json;
          read_at?: string | null;
          referral_id?: string | null;
          type?: Database["public"]["Enums"]["activity_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: { key: string; updated_at: string; value: Json };
        Insert: { key: string; updated_at?: string; value: Json };
        Update: { key?: string; updated_at?: string; value?: Json };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          diff: Json | null;
          entity: string;
          entity_id: string | null;
          id: number;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          diff?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          diff?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: never;
        };
        Relationships: [];
      };
      // Añadida a mano junto con la migración 20260717000000_brands.sql (la base
      // en vivo aún no la tiene). Tras aplicar la migración, regenerar con
      // `supabase gen types typescript` para confirmar que coincide.
      brands: {
        Row: {
          category_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["brand_status"];
          updated_at: string;
          website_url: string;
        };
        // slug lo rellena el trigger set_brand_slug().
        Insert: {
          category_id?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug?: string;
          status?: Database["public"]["Enums"]["brand_status"];
          updated_at?: string;
          website_url: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["brand_status"];
          updated_at?: string;
          website_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brands_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brands_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          color: string | null;
          created_at: string;
          description: string | null;
          icon_name: string | null;
          id: string;
          is_active: boolean;
          name: string;
          position: number;
          slug: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          icon_name?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          position?: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          icon_name?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          position?: number;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          notify_expiration: boolean;
          notify_news: boolean;
          notify_uses: boolean;
          notify_verification: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          notify_expiration?: boolean;
          notify_news?: boolean;
          notify_uses?: boolean;
          notify_verification?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          notify_expiration?: boolean;
          notify_news?: boolean;
          notify_uses?: boolean;
          notify_verification?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          id: string;
          is_verified: boolean;
          location: string | null;
          status: Database["public"]["Enums"]["profile_status"];
          updated_at: string;
          username: string;
          website_url: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          is_verified?: boolean;
          location?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
          username: string;
          website_url?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          is_verified?: boolean;
          location?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
          username?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      referral_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: number;
          kind: Database["public"]["Enums"]["event_kind"];
          referral_id: string;
          session_hash: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          kind: Database["public"]["Enums"]["event_kind"];
          referral_id: string;
          session_hash?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          kind?: Database["public"]["Enums"]["event_kind"];
          referral_id?: string;
          session_hash?: string | null;
        };
        Relationships: [];
      };
      referral_tags: {
        Row: { created_at: string; referral_id: string; tag_id: string };
        Insert: { created_at?: string; referral_id: string; tag_id: string };
        Update: { created_at?: string; referral_id?: string; tag_id?: string };
        Relationships: [];
      };
      referral_votes: {
        Row: {
          created_at: string;
          is_helpful: boolean;
          referral_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          is_helpful: boolean;
          referral_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          is_helpful?: boolean;
          referral_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          benefit_type: Database["public"]["Enums"]["benefit_type"];
          brand: string;
          brand_id: string | null;
          brand_slug: string;
          category_id: string;
          clicks_count: number;
          code: string | null;
          copies_count: number;
          created_at: string;
          description: string | null;
          expires_at: string | null;
          helpful_count: number;
          id: string;
          is_featured: boolean;
          last_used_at: string | null;
          owner_id: string;
          published_at: string | null;
          redeem_url: string | null;
          reports_count: number;
          saves_count: number;
          slug: string;
          status: Database["public"]["Enums"]["referral_status"];
          steps: string[] | null;
          summary: string | null;
          terms: string[] | null;
          title: string;
          updated_at: string;
          value_amount: number | null;
          value_label: string | null;
          verification_status: Database["public"]["Enums"]["verification_status"];
          views_count: number;
        };
        // slug y brand_slug los rellena el trigger set_referral_slugs().
        Insert: {
          benefit_type: Database["public"]["Enums"]["benefit_type"];
          brand: string;
          brand_id?: string | null;
          brand_slug?: string;
          category_id: string;
          clicks_count?: number;
          code?: string | null;
          copies_count?: number;
          created_at?: string;
          description?: string | null;
          expires_at?: string | null;
          helpful_count?: number;
          id?: string;
          is_featured?: boolean;
          last_used_at?: string | null;
          owner_id: string;
          published_at?: string | null;
          redeem_url?: string | null;
          reports_count?: number;
          saves_count?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["referral_status"];
          steps?: string[] | null;
          summary?: string | null;
          terms?: string[] | null;
          title: string;
          updated_at?: string;
          value_amount?: number | null;
          value_label?: string | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          views_count?: number;
        };
        // verification_status e is_featured están aquí porque el staff sí puede
        // escribirlos. Quién puede hacer qué NO se expresa en el tipo: lo impone
        // el trigger guard_referral_moderation, que rechaza al autor que intente
        // auto-verificarse o auto-destacarse.
        Update: {
          benefit_type?: Database["public"]["Enums"]["benefit_type"];
          brand?: string;
          brand_id?: string | null;
          brand_slug?: string;
          category_id?: string;
          code?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          is_featured?: boolean;
          last_used_at?: string | null;
          owner_id?: string;
          published_at?: string | null;
          redeem_url?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["referral_status"];
          steps?: string[] | null;
          summary?: string | null;
          terms?: string[] | null;
          title?: string;
          updated_at?: string;
          value_amount?: number | null;
          value_label?: string | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
        };
        // Sin estas entradas, PostgREST no puede inferir el tipo de los embeds
        // tipo `select("*, categories(name)")`.
        Relationships: [
          {
            foreignKeyName: "referrals_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      report_notes: {
        Row: {
          author_id: string | null;
          created_at: string;
          id: string;
          note: string;
          report_id: string;
        };
        Insert: {
          author_id?: string | null;
          created_at?: string;
          id?: string;
          note: string;
          report_id: string;
        };
        Update: {
          author_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string;
          report_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_notes_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          moderator_id: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          referral_id: string;
          reporter_id: string | null;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["report_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          moderator_id?: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          referral_id: string;
          reporter_id?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          moderator_id?: string | null;
          reason?: Database["public"]["Enums"]["report_reason"];
          referral_id?: string;
          reporter_id?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: false;
            referencedRelation: "referrals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_moderator_id_fkey";
            columns: ["moderator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_referrals: {
        Row: { created_at: string; referral_id: string; user_id: string };
        Insert: { created_at?: string; referral_id: string; user_id: string };
        Update: { created_at?: string; referral_id?: string; user_id?: string };
        Relationships: [];
      };
      tags: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          label: string;
          slug: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          label: string;
          slug: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          label?: string;
          slug?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          granted_at: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      my_attention_items: {
        Row: {
          brand: string | null;
          expires_at: string | null;
          id: string | null;
          reason: string | null;
          reports_count: number | null;
          slug: string | null;
          status: Database["public"]["Enums"]["referral_status"] | null;
          title: string | null;
          views_count: number | null;
        };
        Relationships: [];
      };
      my_reports: {
        Row: {
          created_at: string | null;
          details: string | null;
          id: string | null;
          reason: Database["public"]["Enums"]["report_reason"] | null;
          referral_id: string | null;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["report_status"] | null;
        };
        Relationships: [];
      };
      public_brands: {
        Row: {
          best_benefit_type: Database["public"]["Enums"]["benefit_type"] | null;
          best_category: string | null;
          best_magnitude: number | null;
          best_tag: string | null;
          best_value_amount: number | null;
          description: string | null;
          has_verified: boolean | null;
          helpful_count: number | null;
          last_published_at: string | null;
          logo_url: string | null;
          name: string | null;
          offers_count: number | null;
          slug: string | null;
          total_uses: number | null;
          website_url: string | null;
        };
        Relationships: [];
      };
      public_profiles: {
        Row: {
          active_referrals: number | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string | null;
          display_name: string | null;
          id: string | null;
          is_verified: boolean | null;
          location: string | null;
          published_referrals: number | null;
          total_copies: number | null;
          total_views: number | null;
          username: string | null;
          verified_referrals: number | null;
          website_url: string | null;
        };
        Relationships: [];
      };
      public_referrals: {
        Row: {
          auto_tag: string | null;
          avatar_url: string | null;
          benefit_type: Database["public"]["Enums"]["benefit_type"] | null;
          brand: string | null;
          brand_id: string | null;
          brand_logo_url: string | null;
          brand_slug: string | null;
          category_icon: string | null;
          category_name: string | null;
          category_slug: string | null;
          clicks_count: number | null;
          code: string | null;
          copies_count: number | null;
          created_at: string | null;
          description: string | null;
          display_name: string | null;
          expires_at: string | null;
          has_code: boolean | null;
          helpful_count: number | null;
          id: string | null;
          is_featured: boolean | null;
          is_verified: boolean | null;
          last_used_at: string | null;
          magnitude: number | null;
          owner_id: string | null;
          owner_verified: boolean | null;
          published_at: string | null;
          redeem_url: string | null;
          saves_count: number | null;
          slug: string | null;
          steps: string[] | null;
          summary: string | null;
          terms: string[] | null;
          title: string | null;
          username: string | null;
          value_amount: number | null;
          value_label: string | null;
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          views_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
      is_staff: { Args: never; Returns: boolean };
      my_dashboard_stats: {
        Args: never;
        Returns: {
          active_referrals: number;
          draft_referrals: number;
          pending_referrals: number;
          saved_by_me: number;
          top_referral_id: string | null;
          total_clicks: number;
          total_copies: number;
          total_saves: number;
          total_views: number;
          unread_activity: number;
        }[];
      };
      profile_top_categories: {
        Args: { _limit?: number; _username: string };
        Returns: {
          category_name: string;
          category_slug: string;
          referral_count: number;
          total_views: number;
        }[];
      };
    };
    Enums: {
      activity_type:
        | "referral_used"
        | "referral_published"
        | "referral_verified"
        | "referral_trending"
        | "referral_saved"
        | "referral_reported"
        | "referral_expired";
      app_role: "user" | "moderator" | "admin";
      brand_status: "pending" | "approved" | "rejected";
      benefit_type:
        | "discount"
        | "free_months"
        | "free_shipping"
        | "bonus"
        | "cashback"
        | "free_trial"
        | "gift"
        | "bogo"
        | "other";
      event_kind: "view" | "code_copy" | "link_click";
      profile_status: "active" | "suspended" | "deleted";
      referral_status:
        | "draft"
        | "pending_review"
        | "active"
        | "rejected"
        | "expired"
        | "archived";
      report_reason:
        | "expired"
        | "invalid_code"
        | "spam"
        | "misleading"
        | "inappropriate"
        | "duplicate"
        | "other";
      report_status: "open" | "reviewing" | "resolved" | "dismissed";
      verification_status: "unverified" | "pending" | "verified" | "disputed";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DefaultSchema = Database["public"];

export type Tables<
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends {
  Row: infer R;
}
  ? R
  : never;

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never;

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T];
