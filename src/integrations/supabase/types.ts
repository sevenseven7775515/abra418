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
      books: {
        Row: {
          author: string | null
          category: string
          cover_url: string | null
          created_at: string
          id: string
          learnings: string | null
          notes: string | null
          rating: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          learnings?: string | null
          notes?: string | null
          rating?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          learnings?: string | null
          notes?: string | null
          rating?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brain_notes: {
        Row: {
          area: string
          content: string | null
          created_at: string
          id: string
          links: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string
          content?: string | null
          created_at?: string
          id?: string
          links?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          content?: string | null
          created_at?: string
          id?: string
          links?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_projects: {
        Row: {
          company_id: string | null
          created_at: string
          deadline: string | null
          id: string
          name: string
          objective: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          name: string
          objective?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          name?: string
          objective?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      captures: {
        Row: {
          captured_at: string
          created_at: string
          id: string
          linked_deal_id: string | null
          linked_journal_id: string | null
          parsed: Json
          raw_text: string
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          id?: string
          linked_deal_id?: string | null
          linked_journal_id?: string | null
          parsed?: Json
          raw_text: string
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          id?: string
          linked_deal_id?: string | null
          linked_journal_id?: string | null
          parsed?: Json
          raw_text?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captures_linked_journal_id_fkey"
            columns: ["linked_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string | null
          contact: string | null
          created_at: string
          history: string | null
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          contact?: string | null
          created_at?: string
          history?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          contact?: string | null
          created_at?: string
          history?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          contacts: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          segment: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contacts?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          segment?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contacts?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          segment?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          channel: string | null
          client_id: string | null
          company_id: string | null
          created_at: string
          handle: string | null
          id: string
          last_touch_at: string | null
          name: string
          notes: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          last_touch_at?: string | null
          name: string
          notes?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          last_touch_at?: string | null
          name?: string
          notes?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_events: {
        Row: {
          content: string
          created_at: string
          deal_id: string
          id: string
          kind: string
          occurred_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deal_id: string
          id?: string
          kind?: string
          occurred_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
          kind?: string
          occurred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          client_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          expected_close: string | null
          id: string
          last_touch_at: string | null
          lost_reason: string | null
          next_step: string | null
          next_step_date: string | null
          notes: string | null
          probability: number | null
          source: string | null
          stage: string
          title: string
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          expected_close?: string | null
          id?: string
          last_touch_at?: string | null
          lost_reason?: string | null
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          title: string
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          expected_close?: string | null
          id?: string
          last_touch_at?: string | null
          lost_reason?: string | null
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          title?: string
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tags?: string[]
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
      events: {
        Row: {
          category: string
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          priority: string
          reminder_minutes: number | null
          start_time: string | null
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          priority?: string
          reminder_minutes?: number | null
          start_time?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          priority?: string
          reminder_minutes?: number | null
          start_time?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          kind: string
          paid: boolean
          recurrence: string
          scope: string
          tx_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          kind?: string
          paid?: boolean
          recurrence?: string
          scope?: string
          tx_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          kind?: string
          paid?: boolean
          recurrence?: string
          scope?: string
          tx_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hermes_briefs: {
        Row: {
          content: Json
          created_at: string
          feedback: string | null
          id: string
          kind: string
          ref_date: string
          sources: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          feedback?: string | null
          id?: string
          kind?: string
          ref_date?: string
          sources?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          feedback?: string | null
          id?: string
          kind?: string
          ref_date?: string
          sources?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hermes_suggestions: {
        Row: {
          acted_at: string | null
          brief_id: string | null
          created_at: string
          deal_id: string | null
          domain: string
          evidence: Json
          id: string
          rationale: string | null
          score: number
          status: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acted_at?: string | null
          brief_id?: string | null
          created_at?: string
          deal_id?: string | null
          domain?: string
          evidence?: Json
          id?: string
          rationale?: string | null
          score?: number
          status?: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acted_at?: string | null
          brief_id?: string | null
          created_at?: string
          deal_id?: string | null
          domain?: string
          evidence?: Json
          id?: string
          rationale?: string | null
          score?: number
          status?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hermes_suggestions_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "hermes_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hermes_suggestions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hermes_suggestions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_backups: {
        Row: {
          created_at: string
          entry_date: string | null
          id: string
          journal_id: string
          raw_content: string | null
          source_file: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string | null
          id?: string
          journal_id: string
          raw_content?: string | null
          source_file?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string | null
          id?: string
          journal_id?: string
          raw_content?: string | null
          source_file?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_backups_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          achievements: string | null
          content: string | null
          created_at: string
          energy: number | null
          entry_date: string
          gratitude: string | null
          highlights: string | null
          id: string
          imported: boolean
          insights: string | null
          learnings: string | null
          main_activities: string | null
          mood: string | null
          pending: string | null
          processed: boolean
          reorganized: boolean
          reorganized_at: string | null
          source_file: string | null
          summary: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: string | null
          content?: string | null
          created_at?: string
          energy?: number | null
          entry_date?: string
          gratitude?: string | null
          highlights?: string | null
          id?: string
          imported?: boolean
          insights?: string | null
          learnings?: string | null
          main_activities?: string | null
          mood?: string | null
          pending?: string | null
          processed?: boolean
          reorganized?: boolean
          reorganized_at?: string | null
          source_file?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: string | null
          content?: string | null
          created_at?: string
          energy?: number | null
          entry_date?: string
          gratitude?: string | null
          highlights?: string | null
          id?: string
          imported?: boolean
          insights?: string | null
          learnings?: string | null
          main_activities?: string | null
          mood?: string | null
          pending?: string | null
          processed?: boolean
          reorganized?: boolean
          reorganized_at?: string | null
          source_file?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_events: {
        Row: {
          category: string
          created_at: string
          description: string
          event_time: string | null
          id: string
          journal_id: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          event_time?: string | null
          id?: string
          journal_id: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          event_time?: string | null
          id?: string
          journal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_events_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_insights: {
        Row: {
          books: string[]
          created_at: string
          energy: number | null
          habits: string[]
          id: string
          journal_id: string
          learnings: string | null
          mood: string | null
          patterns: string | null
          practices: string[]
          tags: string[]
          user_id: string
        }
        Insert: {
          books?: string[]
          created_at?: string
          energy?: number | null
          habits?: string[]
          id?: string
          journal_id: string
          learnings?: string | null
          mood?: string | null
          patterns?: string | null
          practices?: string[]
          tags?: string[]
          user_id: string
        }
        Update: {
          books?: string[]
          created_at?: string
          energy?: number | null
          habits?: string[]
          id?: string
          journal_id?: string
          learnings?: string | null
          mood?: string | null
          patterns?: string | null
          practices?: string[]
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_insights_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_signals: {
        Row: {
          amount: number | null
          created_at: string
          description: string
          due_date: string | null
          entry_date: string
          id: string
          journal_id: string
          kind: string
          resolved: boolean
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description: string
          due_date?: string | null
          entry_date: string
          id?: string
          journal_id: string
          kind: string
          resolved?: boolean
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string
          due_date?: string | null
          entry_date?: string
          id?: string
          journal_id?: string
          kind?: string
          resolved?: boolean
          user_id?: string
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
      practice_history: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          journal_id: string | null
          name: string
          notes: string | null
          practice_date: string
          practice_id: string | null
          practice_time: string | null
          source_file: string | null
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          journal_id?: string | null
          name: string
          notes?: string | null
          practice_date: string
          practice_id?: string | null
          practice_time?: string | null
          source_file?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          journal_id?: string | null
          name?: string
          notes?: string | null
          practice_date?: string
          practice_id?: string | null
          practice_time?: string | null
          source_file?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_history_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_history_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          practice_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          practice_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          practice_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_logs_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practices: {
        Row: {
          active: boolean
          category: string
          created_at: string
          frequency: string
          id: string
          name: string
          objective: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          frequency?: string
          id?: string
          name: string
          objective?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          frequency?: string
          id?: string
          name?: string
          objective?: string | null
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
      shopping_items: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          price: number | null
          priority: string
          purchased_at: string | null
          quantity: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          price?: number | null
          priority?: string
          purchased_at?: string | null
          quantity?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          price?: number | null
          priority?: string
          purchased_at?: string | null
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string
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
          origin: string | null
          origin_id: string | null
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
          origin?: string | null
          origin_id?: string | null
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
          origin?: string | null
          origin_id?: string | null
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
      timeline_events: {
        Row: {
          category: string
          created_at: string
          description: string
          event_date: string
          event_time: string | null
          id: string
          journal_id: string | null
          source: string
          source_file: string | null
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          event_date: string
          event_time?: string | null
          id?: string
          journal_id?: string | null
          source?: string
          source_file?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          event_date?: string
          event_time?: string | null
          id?: string
          journal_id?: string | null
          source?: string
          source_file?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          location: string | null
          notifications: Json
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          location?: string | null
          notifications?: Json
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          location?: string | null
          notifications?: Json
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
