export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reads: {
        Row: {
          group_id: string | null
          last_notified_at: string | null
          last_read_at: string
          muted: boolean
          plan_id: string | null
          user_id: string
        }
        Insert: {
          group_id?: string | null
          last_notified_at?: string | null
          last_read_at?: string
          muted?: boolean
          plan_id?: string | null
          user_id: string
        }
        Update: {
          group_id?: string | null
          last_notified_at?: string | null
          last_read_at?: string
          muted?: boolean
          plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reads_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reads_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          province: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
          province: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
          province?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          decided_at: string | null
          group_id: string
          joined_at: string | null
          rejoin_after: string | null
          requested_at: string | null
          role: Database["public"]["Enums"]["group_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          decided_at?: string | null
          group_id: string
          joined_at?: string | null
          rejoin_after?: string | null
          requested_at?: string | null
          role?: Database["public"]["Enums"]["group_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          decided_at?: string | null
          group_id?: string
          joined_at?: string | null
          rejoin_after?: string | null
          requested_at?: string | null
          role?: Database["public"]["Enums"]["group_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          access: Database["public"]["Enums"]["group_access"]
          category_id: number
          city_id: number
          created_at: string
          deleted_at: string | null
          description: string
          hidden_at: string | null
          id: string
          image_url: string | null
          last_activity_at: string
          max_members: number
          member_count: number
          name: string
          owner_id: string
          updated_at: string
          zone: string | null
        }
        Insert: {
          access: Database["public"]["Enums"]["group_access"]
          category_id: number
          city_id: number
          created_at?: string
          deleted_at?: string | null
          description: string
          hidden_at?: string | null
          id?: string
          image_url?: string | null
          last_activity_at?: string
          max_members: number
          member_count?: number
          name: string
          owner_id: string
          updated_at?: string
          zone?: string | null
        }
        Update: {
          access?: Database["public"]["Enums"]["group_access"]
          category_id?: number
          city_id?: number
          created_at?: string
          deleted_at?: string | null
          description?: string
          hidden_at?: string | null
          id?: string
          image_url?: string | null
          last_activity_at?: string
          max_members?: number
          member_count?: number
          name?: string
          owner_id?: string
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          created_at: string
          emoji: string
          id: number
          name: string
          position: number
          section: string
          slug: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: never
          name: string
          position: number
          section: string
          slug: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: never
          name?: string
          position?: number
          section?: string
          slug?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          deleted_by: Database["public"]["Enums"]["message_deleted_by"] | null
          group_id: string | null
          hidden_at: string | null
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          plan_id: string | null
          sender_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          deleted_by?: Database["public"]["Enums"]["message_deleted_by"] | null
          group_id?: string | null
          hidden_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          plan_id?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          deleted_by?: Database["public"]["Enums"]["message_deleted_by"] | null
          group_id?: string | null
          hidden_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          plan_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempts: number
          body: string
          channel: string
          claimed_at: string | null
          collapse_key: string | null
          created_at: string
          error: string | null
          id: number
          path: string
          payload: Json
          send_after: string
          sent_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          attempts?: number
          body: string
          channel: string
          claimed_at?: string | null
          collapse_key?: string | null
          created_at?: string
          error?: string | null
          id?: never
          path: string
          payload?: Json
          send_after?: string
          sent_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          attempts?: number
          body?: string
          channel?: string
          claimed_at?: string | null
          collapse_key?: string | null
          created_at?: string
          error?: string | null
          id?: never
          path?: string
          payload?: Json
          send_after?: string
          sent_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          group_plans: boolean
          messages: boolean
          permission_prompted_at: string | null
          plan_joins: boolean
          plan_updates: boolean
          requests: boolean
          user_id: string
        }
        Insert: {
          group_plans?: boolean
          messages?: boolean
          permission_prompted_at?: string | null
          plan_joins?: boolean
          plan_updates?: boolean
          requests?: boolean
          user_id: string
        }
        Update: {
          group_plans?: boolean
          messages?: boolean
          permission_prompted_at?: string | null
          plan_joins?: boolean
          plan_updates?: boolean
          requests?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_participants: {
        Row: {
          joined_at: string
          plan_id: string
          reminder_sent_at: string | null
          removed_at: string | null
          user_id: string
        }
        Insert: {
          joined_at?: string
          plan_id: string
          reminder_sent_at?: string | null
          removed_at?: string | null
          user_id: string
        }
        Update: {
          joined_at?: string
          plan_id?: string
          reminder_sent_at?: string | null
          removed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_participants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_participants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_private_details: {
        Row: {
          address: string
          plan_id: string
        }
        Insert: {
          address: string
          plan_id: string
        }
        Update: {
          address?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_private_details_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_private_details_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "plans_with_status"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          category_id: number
          city_id: number
          created_at: string
          creator_id: string
          description: string | null
          ends_at: string | null
          group_id: string | null
          hidden_at: string | null
          id: string
          is_private_place: boolean
          max_participants: number
          participant_count: number
          place_name: string
          starts_at: string
          title: string
          updated_at: string
          zone: string | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          category_id: number
          city_id: number
          created_at?: string
          creator_id: string
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          hidden_at?: string | null
          id?: string
          is_private_place?: boolean
          max_participants: number
          participant_count?: number
          place_name: string
          starts_at: string
          title: string
          updated_at?: string
          zone?: string | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          category_id?: number
          city_id?: number
          created_at?: string
          creator_id?: string
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          hidden_at?: string | null
          id?: string
          is_private_place?: boolean
          max_participants?: number
          participant_count?: number
          place_name?: string
          starts_at?: string
          title?: string
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_interests: {
        Row: {
          interest_id: number
          profile_id: string
        }
        Insert: {
          interest_id: number
          profile_id: string
        }
        Update: {
          interest_id?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_interests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          city_id: number | null
          created_at: string
          id: string
          name: string | null
          onboarding_completed_at: string | null
          safety_notice_accepted_at: string | null
          suspended_until: string | null
          suspension_reason: string | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          city_id?: number | null
          created_at?: string
          id: string
          name?: string | null
          onboarding_completed_at?: string | null
          safety_notice_accepted_at?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          city_id?: number | null
          created_at?: string
          id?: string
          name?: string | null
          onboarding_completed_at?: string | null
          safety_notice_accepted_at?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          device_id: string | null
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          device_id?: string | null
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          device_id?: string | null
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      plans_with_status: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          category_id: number | null
          city_id: number | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          ends_at: string | null
          group_id: string | null
          hidden_at: string | null
          id: string | null
          is_private_place: boolean | null
          max_participants: number | null
          participant_count: number | null
          place_name: string | null
          starts_at: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          category_id?: number | null
          city_id?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          hidden_at?: string | null
          id?: string | null
          is_private_place?: boolean | null
          max_participants?: number | null
          participant_count?: number | null
          place_name?: string | null
          starts_at?: string | null
          status?: never
          title?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          category_id?: number | null
          city_id?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          hidden_at?: string | null
          id?: string | null
          is_private_place?: boolean | null
          max_participants?: number | null
          participant_count?: number | null
          place_name?: string | null
          starts_at?: string | null
          status?: never
          title?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_safety_notice: { Args: never; Returns: undefined }
      age_from_birthdate: { Args: { birthdate: string }; Returns: number }
      apply_group_exit_to_plans: {
        Args: { p_group: string; p_user: string }
        Returns: undefined
      }
      can_read_chat: {
        Args: { p_group: string; p_plan: string; p_user: string }
        Returns: boolean
      }
      can_see_group: { Args: { p_group: string }; Returns: boolean }
      can_see_message: {
        Args: { m: Database["public"]["Tables"]["messages"]["Row"] }
        Returns: boolean
      }
      can_see_plan: { Args: { p_plan: string }; Returns: boolean }
      cancel_plan: {
        Args: { p_plan: string; p_reason?: string }
        Returns: undefined
      }
      cancel_plan_internal: {
        Args: { p_plan: string; p_reason: string }
        Returns: undefined
      }
      cancel_request: { Args: { p_group: string }; Returns: undefined }
      channel_for: {
        Args: { p_type: Database["public"]["Enums"]["notification_type"] }
        Returns: string
      }
      chat_closed_reason: {
        Args: { p_group: string; p_plan: string }
        Returns: string
      }
      claim_notifications: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          channel: string
          id: number
          path: string
          title: string
          tokens: string[]
          user_id: string
        }[]
      }
      complete_notifications: {
        Args: { p_failed?: Json; p_invalid_tokens?: string[]; p_sent: number[] }
        Returns: undefined
      }
      complete_onboarding: { Args: never; Returns: undefined }
      create_group: {
        Args: {
          p_access: Database["public"]["Enums"]["group_access"]
          p_category_id: number
          p_description: string
          p_image_url?: string
          p_max_members: number
          p_name: string
          p_zone?: string
        }
        Returns: string
      }
      create_plan: {
        Args: {
          p_address?: string
          p_category_id: number
          p_description?: string
          p_ends_at?: string
          p_group_id?: string
          p_is_private_place?: boolean
          p_max_participants: number
          p_place_name: string
          p_starts_at: string
          p_title: string
          p_zone?: string
        }
        Returns: string
      }
      decide_request: {
        Args: { p_accept: boolean; p_group: string; p_user: string }
        Returns: undefined
      }
      delete_group: {
        Args: { p_confirm_name: string; p_group: string }
        Returns: undefined
      }
      delete_message: { Args: { p_message: string }; Returns: undefined }
      discover_groups: {
        Args: {
          p_category?: number
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          access: Database["public"]["Enums"]["group_access"]
          category_id: number
          description: string
          id: string
          image_url: string
          is_full: boolean
          max_members: number
          member_count: number
          my_status: Database["public"]["Enums"]["member_status"]
          name: string
          zone: string
        }[]
      }
      discover_plans: {
        Args: {
          p_category?: number
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          am_participant: boolean
          category_id: number
          ends_at: string
          group_id: string
          group_name: string
          id: string
          is_full: boolean
          is_private_place: boolean
          max_participants: number
          participant_count: number
          place_name: string
          preview: Json
          starts_at: string
          title: string
          zone: string
        }[]
      }
      dispatch_notifications: { Args: never; Returns: undefined }
      enqueue_message_digests: { Args: never; Returns: number }
      enqueue_notification: {
        Args: {
          p_actor?: string
          p_body: string
          p_collapse_key?: string
          p_path: string
          p_send_after?: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user: string
        }
        Returns: undefined
      }
      enqueue_plan_reminders: { Args: never; Returns: number }
      format_ar: { Args: { p_ts: string }; Returns: string }
      get_chat: { Args: { p_group?: string; p_plan?: string }; Returns: Json }
      get_group: { Args: { p_group: string }; Returns: Json }
      get_message: { Args: { p_message: string }; Returns: Json }
      get_notification_settings: { Args: never; Returns: Json }
      get_plan: { Args: { p_plan: string }; Returns: Json }
      get_profile: { Args: { p_id: string }; Returns: Json }
      is_active_profile: { Args: { p_id: string }; Returns: boolean }
      is_active_user: { Args: never; Returns: boolean }
      is_blocked: { Args: { a: string; b: string }; Returns: boolean }
      is_group_member: {
        Args: { p_group: string; p_user: string }
        Returns: boolean
      }
      is_group_owner: {
        Args: { p_group: string; p_user: string }
        Returns: boolean
      }
      is_plan_participant: {
        Args: { p_plan: string; p_user: string }
        Returns: boolean
      }
      join_group: { Args: { p_group: string }; Returns: string }
      join_plan: { Args: { p_plan: string }; Returns: undefined }
      leave_group: { Args: { p_group: string }; Returns: undefined }
      leave_plan: { Args: { p_plan: string }; Returns: undefined }
      list_group_members: {
        Args: { p_group: string }
        Returns: {
          avatar_url: string
          joined_at: string
          name: string
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }[]
      }
      list_group_plans: {
        Args: { p_group: string }
        Returns: {
          am_participant: boolean
          category_id: number
          id: string
          max_participants: number
          participant_count: number
          place_name: string
          starts_at: string
          title: string
          zone: string
        }[]
      }
      list_group_requests: {
        Args: { p_group: string }
        Returns: {
          age: number
          avatar_url: string
          bio: string
          name: string
          requested_at: string
          user_id: string
        }[]
      }
      list_messages: {
        Args: {
          p_before_created?: string
          p_before_id?: string
          p_group?: string
          p_limit?: number
          p_plan?: string
        }
        Returns: Json[]
      }
      list_my_chats: {
        Args: never
        Returns: {
          category_id: number
          group_id: string
          image_url: string
          last_activity_at: string
          last_message: Json
          muted: boolean
          plan_id: string
          plan_status: string
          title: string
          unread: number
        }[]
      }
      list_my_groups: {
        Args: never
        Returns: {
          category_id: number
          id: string
          image_url: string
          last_activity_at: string
          max_members: number
          member_count: number
          my_role: Database["public"]["Enums"]["group_role"]
          my_status: Database["public"]["Enums"]["member_status"]
          name: string
          pending_count: number
        }[]
      }
      list_my_plans: {
        Args: never
        Returns: {
          category_id: number
          ends_at: string
          group_name: string
          id: string
          is_creator: boolean
          max_participants: number
          participant_count: number
          place_name: string
          starts_at: string
          status: string
          title: string
          zone: string
        }[]
      }
      mark_permission_prompted: { Args: never; Returns: undefined }
      mark_read: {
        Args: { p_group?: string; p_plan?: string }
        Returns: undefined
      }
      message_view: {
        Args: { m: Database["public"]["Tables"]["messages"]["Row"] }
        Returns: Json
      }
      normalize_text: { Args: { t: string }; Returns: string }
      notifications_tick: { Args: never; Returns: undefined }
      owns_group_folder: { Args: { p_folder: string }; Returns: boolean }
      plan_effective_end: {
        Args: { p_ends_at: string; p_starts_at: string }
        Returns: string
      }
      plan_label: { Args: { p_plan: string }; Returns: string }
      plan_preview: { Args: { p_limit: number; p_plan: string }; Returns: Json }
      plan_status: {
        Args: { p_cancelled_at: string; p_ends_at: string; p_starts_at: string }
        Returns: string
      }
      post_system_message: {
        Args: {
          p_body: string
          p_group: string
          p_plan: string
          p_subject: string
        }
        Returns: undefined
      }
      prepare_account_deletion: { Args: { p_user: string }; Returns: undefined }
      register_push_token: {
        Args: { p_device_id?: string; p_platform: string; p_token: string }
        Returns: undefined
      }
      remove_member: {
        Args: { p_group: string; p_user: string }
        Returns: undefined
      }
      remove_participant: {
        Args: { p_plan: string; p_user: string }
        Returns: undefined
      }
      send_message: {
        Args: { p_body: string; p_group?: string; p_plan?: string }
        Returns: Json
      }
      set_chat_muted: {
        Args: { p_group?: string; p_muted: boolean; p_plan?: string }
        Returns: undefined
      }
      set_my_birthdate: { Args: { p_birthdate: string }; Returns: undefined }
      set_my_interests: {
        Args: { p_interest_ids: number[] }
        Returns: undefined
      }
      shares_context: { Args: { a: string; b: string }; Returns: boolean }
      today_ar: { Args: never; Returns: string }
      unregister_push_token: { Args: { p_token: string }; Returns: undefined }
      update_group: {
        Args: {
          p_access: Database["public"]["Enums"]["group_access"]
          p_category_id: number
          p_description: string
          p_group: string
          p_image_url?: string
          p_max_members: number
          p_name: string
          p_zone?: string
        }
        Returns: undefined
      }
      update_notification_settings: {
        Args: { p_settings: Json }
        Returns: undefined
      }
      update_plan: {
        Args: {
          p_address?: string
          p_category_id: number
          p_description?: string
          p_ends_at?: string
          p_is_private_place?: boolean
          p_max_participants: number
          p_place_name: string
          p_plan: string
          p_starts_at: string
          p_title: string
          p_zone?: string
        }
        Returns: boolean
      }
      validate_plan_input: {
        Args: {
          p_address: string
          p_check_start: boolean
          p_ends_at: string
          p_group: string
          p_is_private_place: boolean
          p_starts_at: string
        }
        Returns: undefined
      }
      wants_notification: {
        Args: {
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user: string
        }
        Returns: boolean
      }
    }
    Enums: {
      group_access: "open" | "approval"
      group_role: "owner" | "member"
      member_status: "pending" | "active" | "rejected" | "banned"
      message_deleted_by: "author" | "moderator"
      message_kind: "text" | "system"
      notification_type:
        | "message"
        | "message_digest"
        | "join_request"
        | "request_accepted"
        | "group_plan"
        | "plan_join"
        | "plan_reminder"
        | "plan_changed"
        | "plan_cancelled"
        | "group_deleted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      group_access: ["open", "approval"],
      group_role: ["owner", "member"],
      member_status: ["pending", "active", "rejected", "banned"],
      message_deleted_by: ["author", "moderator"],
      message_kind: ["text", "system"],
      notification_type: [
        "message",
        "message_digest",
        "join_request",
        "request_accepted",
        "group_plan",
        "plan_join",
        "plan_reminder",
        "plan_changed",
        "plan_cancelled",
        "group_deleted",
      ],
    },
  },
} as const

