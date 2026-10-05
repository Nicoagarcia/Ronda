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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      age_from_birthdate: { Args: { birthdate: string }; Returns: number }
      can_see_group: { Args: { p_group: string }; Returns: boolean }
      cancel_request: { Args: { p_group: string }; Returns: undefined }
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
      decide_request: {
        Args: { p_accept: boolean; p_group: string; p_user: string }
        Returns: undefined
      }
      delete_group: {
        Args: { p_confirm_name: string; p_group: string }
        Returns: undefined
      }
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
      get_group: { Args: { p_group: string }; Returns: Json }
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
      join_group: { Args: { p_group: string }; Returns: string }
      leave_group: { Args: { p_group: string }; Returns: undefined }
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
      normalize_text: { Args: { t: string }; Returns: string }
      owns_group_folder: { Args: { p_folder: string }; Returns: boolean }
      remove_member: {
        Args: { p_group: string; p_user: string }
        Returns: undefined
      }
      set_my_birthdate: { Args: { p_birthdate: string }; Returns: undefined }
      set_my_interests: {
        Args: { p_interest_ids: number[] }
        Returns: undefined
      }
      shares_context: { Args: { a: string; b: string }; Returns: boolean }
      today_ar: { Args: never; Returns: string }
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
    }
    Enums: {
      group_access: "open" | "approval"
      group_role: "owner" | "member"
      member_status: "pending" | "active" | "rejected" | "banned"
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
    },
  },
} as const

