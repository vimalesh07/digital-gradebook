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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      annotations: {
        Row: {
          created_at: string
          data: Json
          evaluation_id: string
          id: string
          page_no: number
        }
        Insert: {
          created_at?: string
          data: Json
          evaluation_id: string
          id?: string
          page_no?: number
        }
        Update: {
          created_at?: string
          data?: Json
          evaluation_id?: string
          id?: string
          page_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "annotations_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_sheets: {
        Row: {
          assigned_faculty: string | null
          created_at: string
          exam_date: string
          file_path: string
          file_type: string
          id: string
          register_no: string
          semester: number
          status: Database["public"]["Enums"]["sheet_status"]
          student_name: string | null
          subject_code: string
          subject_id: string | null
          subject_name: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          assigned_faculty?: string | null
          created_at?: string
          exam_date: string
          file_path: string
          file_type: string
          id?: string
          register_no: string
          semester: number
          status?: Database["public"]["Enums"]["sheet_status"]
          student_name?: string | null
          subject_code: string
          subject_id?: string | null
          subject_name: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          assigned_faculty?: string | null
          created_at?: string
          exam_date?: string
          file_path?: string
          file_type?: string
          id?: string
          register_no?: string
          semester?: number
          status?: Database["public"]["Enums"]["sheet_status"]
          student_name?: string | null
          subject_code?: string
          subject_id?: string | null
          subject_name?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_sheets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          max_marks: number
          sheet_id: string
          started_at: string
          status: Database["public"]["Enums"]["eval_status"]
          submitted_at: string | null
          time_taken_seconds: number | null
          total_marks: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          max_marks?: number
          sheet_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["eval_status"]
          submitted_at?: string | null
          time_taken_seconds?: number | null
          total_marks?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          max_marks?: number
          sheet_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["eval_status"]
          submitted_at?: string | null
          time_taken_seconds?: number | null
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: true
            referencedRelation: "answer_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_subjects: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          subject_id: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_marks: {
        Row: {
          created_at: string
          evaluation_id: string
          id: string
          max_marks: number
          obtained_marks: number
          question_no: string
          section: string | null
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          id?: string
          max_marks: number
          obtained_marks?: number
          question_no: string
          section?: string | null
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          id?: string
          max_marks?: number
          obtained_marks?: number
          question_no?: string
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_marks_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          department: string | null
          id: string
          name: string
          register_no: string
          semester: number | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          name: string
          register_no: string
          semester?: number | null
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          name?: string
          register_no?: string
          semester?: number | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          department: string | null
          id: string
          semester: number
          subject_code: string
          subject_name: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          semester: number
          subject_code: string
          subject_name: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          semester?: number
          subject_code?: string
          subject_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "faculty"
      eval_status: "draft" | "submitted"
      sheet_status: "uploaded" | "assigned" | "in_progress" | "submitted"
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
    Enums: {
      app_role: ["admin", "faculty"],
      eval_status: ["draft", "submitted"],
      sheet_status: ["uploaded", "assigned", "in_progress", "submitted"],
    },
  },
} as const
