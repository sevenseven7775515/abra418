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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      astronomical_events: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          kind: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          kind?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          kind?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enneagram_profile: {
        Row: {
          challenges: string | null
          created_at: string
          desires: string | null
          development_level: string | null
          fears: string | null
          instinct: string | null
          main_type: string | null
          strengths: string | null
          updated_at: string
          user_id: string
          virtues: string | null
          wing: string | null
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          desires?: string | null
          development_level?: string | null
          fears?: string | null
          instinct?: string | null
          main_type?: string | null
          strengths?: string | null
          updated_at?: string
          user_id: string
          virtues?: string | null
          wing?: string | null
        }
        Update: {
          challenges?: string | null
          created_at?: string
          desires?: string | null
          development_level?: string | null
          fears?: string | null
          instinct?: string | null
          main_type?: string | null
          strengths?: string | null
          updated_at?: string
          user_id?: string
          virtues?: string | null
          wing?: string | null
        }
        Relationships: []
      }
      life_goals: {
        Row: {
          created_at: string
          description: string | null
          horizon: string
          id: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          horizon?: string
          id?: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          horizon?: string
          id?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mbti_profile: {
        Row: {
          characteristics: string | null
          communication: string | null
          created_at: string
          decision_making: string | null
          mbti_type: string
          strengths: string | null
          updated_at: string
          user_id: string
          watchouts: string | null
        }
        Insert: {
          characteristics?: string | null
          communication?: string | null
          created_at?: string
          decision_making?: string | null
          mbti_type?: string
          strengths?: string | null
          updated_at?: string
          user_id: string
          watchouts?: string | null
        }
        Update: {
          characteristics?: string | null
          communication?: string | null
          created_at?: string
          decision_making?: string | null
          mbti_type?: string
          strengths?: string | null
          updated_at?: string
          user_id?: string
          watchouts?: string | null
        }
        Relationships: []
      }
      missions: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          name: string
          objective: string | null
          status: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          name: string
          objective?: string | null
          status?: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          name?: string
          objective?: string | null
          status?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_values: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          rank: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rank?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rank?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      self_profile: {
        Row: {
          created_at: string
          headline: string | null
          mission: string | null
          principles: string | null
          rules: string | null
          updated_at: string
          user_id: string
          vision: string | null
        }
        Insert: {
          created_at?: string
          headline?: string | null
          mission?: string | null
          principles?: string | null
          rules?: string | null
          updated_at?: string
          user_id: string
          vision?: string | null
        }
        Update: {
          created_at?: string
          headline?: string | null
          mission?: string | null
          principles?: string | null
          rules?: string | null
          updated_at?: string
          user_id?: string
          vision?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          area: string
          category: string | null
          checklist: Json
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string
          category?: string | null
          checklist?: Json
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          category?: string | null
          checklist?: Json
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thelema_authors: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thelema_journal: {
        Row: {
          created_at: string
          dreams: string | null
          entry_date: string
          experiences: string | null
          id: string
          mental_state: string | null
          observations: string | null
          practice: string | null
          results: string | null
          study: string | null
          symbols: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dreams?: string | null
          entry_date?: string
          experiences?: string | null
          id?: string
          mental_state?: string | null
          observations?: string | null
          practice?: string | null
          results?: string | null
          study?: string | null
          symbols?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dreams?: string | null
          entry_date?: string
          experiences?: string | null
          id?: string
          mental_state?: string | null
          observations?: string | null
          practice?: string | null
          results?: string | null
          study?: string | null
          symbols?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thelema_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          text_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          text_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          text_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thelema_notes_text_id_fkey"
            columns: ["text_id"]
            isOneToOne: false
            referencedRelation: "thelema_texts"
            referencedColumns: ["id"]
          },
        ]
      }
      thelema_texts: {
        Row: {
          author: string
          created_at: string
          favorite: boolean
          id: string
          last_read_at: string | null
          notes: string | null
          original_language: string
          source_url: string | null
          status: string
          study_minutes: number
          title_original: string
          title_pt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string
          created_at?: string
          favorite?: boolean
          id?: string
          last_read_at?: string | null
          notes?: string | null
          original_language?: string
          source_url?: string | null
          status?: string
          study_minutes?: number
          title_original: string
          title_pt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          created_at?: string
          favorite?: boolean
          id?: string
          last_read_at?: string | null
          notes?: string | null
          original_language?: string
          source_url?: string | null
          status?: string
          study_minutes?: number
          title_original?: string
          title_pt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thelema_translations: {
        Row: {
          created_at: string
          id: string
          publisher: string | null
          source_url: string | null
          text_id: string
          title_pt: string
          translator: string | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          publisher?: string | null
          source_url?: string | null
          text_id: string
          title_pt: string
          translator?: string | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          publisher?: string | null
          source_url?: string | null
          text_id?: string
          title_pt?: string
          translator?: string | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "thelema_translations_text_id_fkey"
            columns: ["text_id"]
            isOneToOne: false
            referencedRelation: "thelema_texts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
