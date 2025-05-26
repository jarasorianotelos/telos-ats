export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          password: string | null
          username: string
          role: string
          created_at: string
          updated_at: string | null
          deleted_at: string | null
          linkedin_profile: string | null
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          email: string
          password?: string | null
          username: string
          role: string
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
          linkedin_profile?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          password?: string | null
          username?: string
          role?: string
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
          linkedin_profile?: string | null
        }
      }
      applicants: {
        Row: {
          id: string
          author_id: string
          created_at: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          location: string | null
          cv_link: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          author_id: string
          created_at?: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          location?: string | null
          cv_link?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          author_id?: string
          created_at?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          location?: string | null
          cv_link?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      joborder_applicant: {
        Row: {
          id: string
          joborder_id: string
          client_id: string
          author_id: string
          created_at: string
          updated_at: string | null
          interview_notes: string | null
          asking_salary: number | null
          application_stage: string
          application_status: string
          client_feedback: string | null
          candidate_start_date: string | null
        }
        Insert: {
          id?: string
          joborder_id: string
          client_id: string
          author_id: string
          created_at?: string
          updated_at?: string | null
          interview_notes?: string | null
          asking_salary?: number | null
          application_stage: string
          application_status: string
          client_feedback?: string | null
          candidate_start_date?: string | null
        }
        Update: {
          id?: string
          joborder_id?: string
          client_id?: string
          author_id?: string
          created_at?: string
          updated_at?: string | null
          interview_notes?: string | null
          asking_salary?: number | null
          application_stage?: string
          application_status?: string
          client_feedback?: string | null
          candidate_start_date?: string | null
        }
      }
      joborder: {
        Row: {
          id: string
          job_title: string
          client_id: string
          author_id: string
          created_at: string
          updated_at: string | null
          schedule: string | null
          status: string
          priority: string | null
          responsibilities_requirements: string | null
          client_budget: string | null
          archived: boolean
          sourcing_preference: string
        }
        Insert: {
          id?: string
          job_title: string
          client_id: string
          author_id: string
          created_at?: string
          updated_at?: string | null
          schedule?: string | null
          status: string
          priority?: string | null
          responsibilities_requirements?: string | null
          client_budget?: string | null
          archived?: boolean
          sourcing_preference?: string
        }
        Update: {
          id?: string
          job_title?: string
          client_id?: string
          author_id?: string
          created_at?: string
          updated_at?: string | null
          schedule?: string | null
          status?: string
          priority?: string | null
          responsibilities_requirements?: string | null
          client_budget?: string | null
          archived?: boolean
          sourcing_preference?: string
        }
      }
      clients: {
        Row: {
          id: string
          author_id: string
          created_at: string
          first_name: string
          last_name: string
          position: string
          email: string
          phone: string | null
          location: string | null
          company: string
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          author_id: string
          created_at?: string
          first_name: string
          last_name: string
          position: string
          email: string
          phone?: string | null
          location?: string | null
          company: string
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          author_id?: string
          created_at?: string
          first_name?: string
          last_name?: string
          position?: string
          email?: string
          phone?: string | null
          location?: string | null
          company?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      joborder_commission: {
        Row: {
          id: string
          joborder_applicant_id: string
          current_commission: number
          received_commission: number
          commission_details: string
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          joborder_applicant_id: string
          current_commission: number
          received_commission: number
          commission_details?: string
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          joborder_applicant_id?: string
          current_commission?: number
          received_commission?: number
          commission_details?: string
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      system_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      log_access_control: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
  }
}
