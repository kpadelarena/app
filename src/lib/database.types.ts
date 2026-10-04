export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      booking_participants: {
        Row: {
          booking_id: string;
          created_at: string;
          guest_name: string | null;
          id: string;
          profile_id: string | null;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          profile_id?: string | null;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_participants_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          booking_date: string;
          booking_time: string;
          category: string;
          club_id: string;
          court_number: number;
          created_at: string;
          group_id: string;
          id: string;
        };
        Insert: {
          booking_date: string;
          booking_time: string;
          category?: string;
          club_id: string;
          court_number: number;
          created_at?: string;
          group_id?: string;
          id?: string;
        };
        Update: {
          booking_date?: string;
          booking_time?: string;
          category?: string;
          club_id?: string;
          court_number?: number;
          created_at?: string;
          group_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      club_members: {
        Row: {
          club_id: string;
          guest_name: string | null;
          id: string;
          joined_at: string;
          profile_id: string | null;
          role: string;
        };
        Insert: {
          club_id: string;
          guest_name?: string | null;
          id?: string;
          joined_at?: string;
          profile_id?: string | null;
          role?: string;
        };
        Update: {
          club_id?: string;
          guest_name?: string | null;
          id?: string;
          joined_at?: string;
          profile_id?: string | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clubs: {
        Row: {
          amenities: NonNullable<Json>;
          court_count: number;
          created_at: string;
          format: string;
          id: string;
          name: string;
          owner_id: string;
          photo_url: string | null;
          result_photo_url: string | null;
          venue: string;
        };
        Insert: {
          amenities?: NonNullable<Json>;
          court_count?: number;
          created_at?: string;
          format?: string;
          id?: string;
          name?: string;
          owner_id: string;
          photo_url?: string | null;
          result_photo_url?: string | null;
          venue: string;
        };
        Update: {
          amenities?: NonNullable<Json>;
          court_count?: number;
          created_at?: string;
          format?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          photo_url?: string | null;
          result_photo_url?: string | null;
          venue?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clubs_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      courts: {
        Row: {
          club_id: string;
          court_number: number;
          created_at: string;
          id: string;
          name: string | null;
          photo_url: string | null;
        };
        Insert: {
          club_id: string;
          court_number: number;
          created_at?: string;
          id?: string;
          name?: string | null;
          photo_url?: string | null;
        };
        Update: {
          club_id?: string;
          court_number?: number;
          created_at?: string;
          id?: string;
          name?: string | null;
          photo_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "courts_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          club_id: string;
          court_number: number;
          created_at: string;
          id: string;
          round_number: number;
          score_a: number | null;
          score_b: number | null;
          side_a_ids: string[];
          side_b_ids: string[];
          sit_out_ids: string[];
        };
        Insert: {
          club_id: string;
          court_number: number;
          created_at?: string;
          id?: string;
          round_number: number;
          score_a?: number | null;
          score_b?: number | null;
          side_a_ids: string[];
          side_b_ids: string[];
          sit_out_ids?: string[];
        };
        Update: {
          club_id?: string;
          court_number?: number;
          created_at?: string;
          id?: string;
          round_number?: number;
          score_a?: number | null;
          score_b?: number | null;
          side_a_ids?: string[];
          side_b_ids?: string[];
          sit_out_ids?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "matches_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string | null;
          gender: string | null;
          id: string;
          level: number;
          needs_password_reset: boolean;
          phone: string | null;
          photo_url: string | null;
          region: string | null;
          username: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          email?: string | null;
          gender?: string | null;
          id: string;
          level?: number;
          needs_password_reset?: boolean;
          phone?: string | null;
          photo_url?: string | null;
          region?: string | null;
          username: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string | null;
          gender?: string | null;
          id?: string;
          level?: number;
          needs_password_reset?: boolean;
          phone?: string | null;
          photo_url?: string | null;
          region?: string | null;
          username?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_club_admin: { Args: { target_club_id: string }; Returns: boolean };
      is_club_member: { Args: { target_club_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
