export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          group_description: string | null
          group_name: string | null
          id: string
          is_group_chat: boolean | null
          last_message: string | null
          last_message_at: string | null
          participants: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_description?: string | null
          group_name?: string | null
          id?: string
          is_group_chat?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          participants: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_description?: string | null
          group_name?: string | null
          id?: string
          is_group_chat?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          participants?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      fabric_connections: {
        Row: {
          access_token: string
          connected_at: string
          created_at: string
          fabric_user_id: string | null
          id: string
          last_synced_at: string | null
          metadata: Json | null
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          created_at?: string
          fabric_user_id?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          created_at?: string
          fabric_user_id?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_search_raw_threads: {
        Row: {
          asat: string | null
          content: string | null
          created_at: string
          data_subtype: string | null
          data_type: string | null
          details: Json | null
          fabric_item_id: string
          id: string
          interaction_type: string | null
          is_health_related: boolean | null
          is_pii: boolean | null
          is_pornographic: boolean | null
          payload: Json | null
          preview: string | null
          provider: string | null
          provider_connection_id: string | null
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          asat?: string | null
          content?: string | null
          created_at?: string
          data_subtype?: string | null
          data_type?: string | null
          details?: Json | null
          fabric_item_id: string
          id?: string
          interaction_type?: string | null
          is_health_related?: boolean | null
          is_pii?: boolean | null
          is_pornographic?: boolean | null
          payload?: Json | null
          preview?: string | null
          provider?: string | null
          provider_connection_id?: string | null
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          asat?: string | null
          content?: string | null
          created_at?: string
          data_subtype?: string | null
          data_type?: string | null
          details?: Json | null
          fabric_item_id?: string
          id?: string
          interaction_type?: string | null
          is_health_related?: boolean | null
          is_pii?: boolean | null
          is_pornographic?: boolean | null
          payload?: Json | null
          preview?: string | null
          provider?: string | null
          provider_connection_id?: string | null
          updated_at?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_search_raw_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      google_search_summaries: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          summary_content: string | null
          summary_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          summary_content?: string | null
          summary_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          summary_content?: string | null
          summary_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_search_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      instagram_general: {
        Row: {
          content: string | null
          created_at: string
          data_type: string | null
          id: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          data_type?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          data_type?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_general_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      instagram_interactions: {
        Row: {
          asat: string | null
          content: string | null
          created_at: string
          details: Json | null
          fabric_item_id: string
          id: string
          interaction_type: string | null
          payload: Json | null
          preview: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asat?: string | null
          content?: string | null
          created_at?: string
          details?: Json | null
          fabric_item_id: string
          id?: string
          interaction_type?: string | null
          payload?: Json | null
          preview?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asat?: string | null
          content?: string | null
          created_at?: string
          details?: Json | null
          fabric_item_id?: string
          id?: string
          interaction_type?: string | null
          payload?: Json | null
          preview?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      item_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itinerary_collaborators: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          itinerary_id: string
          permission: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          itinerary_id: string
          permission?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          itinerary_id?: string
          permission?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          friend_request_id: string | null
          id: string
          message: string
          read: boolean
          related_comment_id: string | null
          related_like_id: string | null
          related_post_id: string | null
          related_trip_id: string | null
          related_user_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          friend_request_id?: string | null
          id?: string
          message: string
          read?: boolean
          related_comment_id?: string | null
          related_like_id?: string | null
          related_post_id?: string | null
          related_trip_id?: string | null
          related_user_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          friend_request_id?: string | null
          id?: string
          message?: string
          read?: boolean
          related_comment_id?: string | null
          related_like_id?: string | null
          related_post_id?: string | null
          related_trip_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_friend_request_id_fkey"
            columns: ["friend_request_id"]
            isOneToOne: false
            referencedRelation: "friends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_comment_id_fkey"
            columns: ["related_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_like_id_fkey"
            columns: ["related_like_id"]
            isOneToOne: false
            referencedRelation: "post_likes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_post_id_fkey"
            columns: ["related_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_trip_id_fkey"
            columns: ["related_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_private: boolean
          likes_count: number
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_private?: boolean
          likes_count?: number
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_private?: boolean
          likes_count?: number
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          base_location: string | null
          bio: string | null
          default_currency: string | null
          followers_count: number
          following_count: number
          id: string
          is_public: boolean
          name: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar?: string | null
          base_location?: string | null
          bio?: string | null
          default_currency?: string | null
          followers_count?: number
          following_count?: number
          id?: string
          is_public?: boolean
          name?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          avatar?: string | null
          base_location?: string | null
          bio?: string | null
          default_currency?: string | null
          followers_count?: number
          following_count?: number
          id?: string
          is_public?: boolean
          name?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "item_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_itineraries: {
        Row: {
          budget: number | null
          created_at: string
          destination: string
          end_date: string | null
          friend_recommendations: Json | null
          id: string
          interests: string[] | null
          itinerary_content: string
          start_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          destination: string
          end_date?: string | null
          friend_recommendations?: Json | null
          id?: string
          interests?: string[] | null
          itinerary_content: string
          start_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          destination?: string
          end_date?: string | null
          friend_recommendations?: Json | null
          id?: string
          interests?: string[] | null
          itinerary_content?: string
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_itineraries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trip_tags: {
        Row: {
          created_at: string
          id: string
          tagged_user_id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tagged_user_id: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tagged_user_id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_tags_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          companions: string | null
          cost: string | null
          country_code: string | null
          created_at: string | null
          description: string | null
          destination: string | null
          distance: string | null
          duration: string | null
          end_date: string | null
          hashtags: string[] | null
          id: string
          images: string[] | null
          is_public: boolean | null
          overall_budget: string | null
          overall_caption: string | null
          photo_count: number | null
          photo_details: Json | null
          start_date: string | null
          stops: Json | null
          tagged_friends: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          companions?: string | null
          cost?: string | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          destination?: string | null
          distance?: string | null
          duration?: string | null
          end_date?: string | null
          hashtags?: string[] | null
          id?: string
          images?: string[] | null
          is_public?: boolean | null
          overall_budget?: string | null
          overall_caption?: string | null
          photo_count?: number | null
          photo_details?: Json | null
          start_date?: string | null
          stops?: Json | null
          tagged_friends?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          companions?: string | null
          cost?: string | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          destination?: string | null
          distance?: string | null
          duration?: string | null
          end_date?: string | null
          hashtags?: string[] | null
          id?: string
          images?: string[] | null
          is_public?: boolean | null
          overall_budget?: string | null
          overall_caption?: string | null
          photo_count?: number | null
          photo_details?: Json | null
          start_date?: string | null
          stops?: Json | null
          tagged_friends?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_id: { Args: never; Returns: string }
      get_unread_message_count: { Args: { user_uuid: string }; Returns: number }
      get_unread_notification_count: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_itinerary_permissions: {
        Args: { itinerary_uuid: string; user_uuid: string }
        Returns: {
          can_edit: boolean
          can_view: boolean
        }[]
      }
      save_user_itinerary: {
        Args: {
          p_budget: number
          p_destination: string
          p_end_date: string
          p_friend_recommendations: Json
          p_interests: string[]
          p_itinerary_content: string
          p_start_date: string
          p_title: string
        }
        Returns: string
      }
      validate_itinerary_exists: {
        Args: { itinerary_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
