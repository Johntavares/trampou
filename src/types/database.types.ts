export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'client' | 'professional' | 'admin'
export type RequestStatus = 'pending' | 'quoted' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon_name: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon_name?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon_name?: string | null
          active?: boolean
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          role: UserRole
          phone_whatsapp: string | null
          avatar_url: string | null
          neighborhood: string | null
          city: string
          state: string
          bio: string | null
          is_verified: boolean
          rating_average: number
          rating_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: UserRole
          phone_whatsapp?: string | null
          avatar_url?: string | null
          neighborhood?: string | null
          city?: string
          state?: string
          bio?: string | null
          is_verified?: boolean
          rating_average?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: UserRole
          phone_whatsapp?: string | null
          avatar_url?: string | null
          neighborhood?: string | null
          city?: string
          state?: string
          bio?: string | null
          is_verified?: boolean
          rating_average?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      professional_profiles: {
        Row: {
          id: string
          profile_id: string
          category_id: string | null
          skills: string[]
          years_experience: number
          price_estimate_type: string
          min_price: number | null
          served_neighborhoods: string[]
          service_modality: string
          available_now: boolean
          document_cpf_cnpj: string | null
          pix_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          category_id?: string | null
          skills?: string[]
          years_experience?: number
          price_estimate_type?: string
          min_price?: number | null
          served_neighborhoods?: string[]
          service_modality?: string
          available_now?: boolean
          document_cpf_cnpj?: string | null
          pix_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          category_id?: string | null
          skills?: string[]
          years_experience?: number
          price_estimate_type?: string
          min_price?: number | null
          served_neighborhoods?: string[]
          service_modality?: string
          available_now?: boolean
          document_cpf_cnpj?: string | null
          pix_key?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      portfolio_items: {
        Row: {
          id: string
          professional_id: string
          title: string
          description: string | null
          image_url: string
          created_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          title: string
          description?: string | null
          image_url: string
          created_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          title?: string
          description?: string | null
          image_url?: string
          created_at?: string
        }
      }
      service_requests: {
        Row: {
          id: string
          client_id: string
          professional_id: string | null
          category_id: string
          title: string
          description: string
          neighborhood: string
          reference_address: string | null
          status: RequestStatus
          budget_limit: number | null
          preferred_date: string | null
          photos: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          professional_id?: string | null
          category_id: string
          title: string
          description: string
          neighborhood: string
          reference_address?: string | null
          status?: RequestStatus
          budget_limit?: number | null
          preferred_date?: string | null
          photos?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          professional_id?: string | null
          category_id?: string
          title?: string
          description?: string
          neighborhood?: string
          reference_address?: string | null
          status?: RequestStatus
          budget_limit?: number | null
          preferred_date?: string | null
          photos?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          service_request_id: string | null
          client_id: string
          professional_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_request_id?: string | null
          client_id: string
          professional_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service_request_id?: string | null
          client_id?: string
          professional_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
      }
    }
  }
}
