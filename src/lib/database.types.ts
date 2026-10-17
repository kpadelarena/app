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
          added_by: string | null;
          booking_id: string;
          created_at: string;
          guest_name: string | null;
          id: string;
          profile_id: string | null;
        };
        Insert: {
          added_by?: string | null;
          booking_id: string;
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          profile_id?: string | null;
        };
        Update: {
          added_by?: string | null;
          booking_id?: string;
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_participants_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
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
          court_id: string;
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          kind: Database["public"]["Enums"]["booking_kind"];
          league_id: string | null;
          starts_at: string;
          visibility: Database["public"]["Enums"]["visibility"];
        };
        Insert: {
          court_id: string;
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          kind?: Database["public"]["Enums"]["booking_kind"];
          league_id?: string | null;
          starts_at: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Update: {
          court_id?: string;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["booking_kind"];
          league_id?: string | null;
          starts_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
        ];
      };
      courts: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
          venue_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
          venue_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courts_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      league_players: {
        Row: {
          created_at: string;
          guest_name: string | null;
          id: string;
          league_id: string;
          profile_id: string | null;
        };
        Insert: {
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          league_id: string;
          profile_id?: string | null;
        };
        Update: {
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          league_id?: string;
          profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "league_players_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_players_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      league_teams: {
        Row: {
          created_at: string;
          id: string;
          league_id: string;
          name: string;
          player_ids: string[];
        };
        Insert: {
          created_at?: string;
          id?: string;
          league_id: string;
          name: string;
          player_ids: string[];
        };
        Update: {
          created_at?: string;
          id?: string;
          league_id?: string;
          name?: string;
          player_ids?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "league_teams_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
        ];
      };
      leagues: {
        Row: {
          court_count: number;
          created_at: string;
          created_by: string | null;
          event_date: string;
          format: Database["public"]["Enums"]["league_format"];
          id: string;
          name: string;
          result_photo_url: string | null;
          venue_id: string;
        };
        Insert: {
          court_count?: number;
          created_at?: string;
          created_by?: string | null;
          event_date: string;
          format?: Database["public"]["Enums"]["league_format"];
          id?: string;
          name: string;
          result_photo_url?: string | null;
          venue_id: string;
        };
        Update: {
          court_count?: number;
          created_at?: string;
          created_by?: string | null;
          event_date?: string;
          format?: Database["public"]["Enums"]["league_format"];
          id?: string;
          name?: string;
          result_photo_url?: string | null;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leagues_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leagues_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          court_number: number;
          created_at: string;
          id: string;
          league_id: string;
          round_number: number;
          score_a: number | null;
          score_b: number | null;
          side_a: string[];
          side_b: string[];
          sit_out: string[];
        };
        Insert: {
          court_number: number;
          created_at?: string;
          id?: string;
          league_id: string;
          round_number: number;
          score_a?: number | null;
          score_b?: number | null;
          side_a: string[];
          side_b: string[];
          sit_out?: string[];
        };
        Update: {
          court_number?: number;
          created_at?: string;
          id?: string;
          league_id?: string;
          round_number?: number;
          score_a?: number | null;
          score_b?: number | null;
          side_a?: string[];
          side_b?: string[];
          sit_out?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "matches_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_contacts: {
        Row: {
          email: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          email?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_contacts_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          level: number;
          photo_url: string | null;
          role: Database["public"]["Enums"]["member_role"];
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          level?: number;
          photo_url?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          level?: number;
          photo_url?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
        };
        Relationships: [];
      };
      venues: {
        Row: {
          address: string | null;
          amenities: NonNullable<Json>;
          close_time: string;
          created_at: string;
          id: string;
          max_players: number;
          name: string;
          open_time: string;
          photo_url: string | null;
          sort_order: number;
          timezone: string;
        };
        Insert: {
          address?: string | null;
          amenities?: NonNullable<Json>;
          close_time?: string;
          created_at?: string;
          id?: string;
          max_players?: number;
          name: string;
          open_time?: string;
          photo_url?: string | null;
          sort_order?: number;
          timezone?: string;
        };
        Update: {
          address?: string | null;
          amenities?: NonNullable<Json>;
          close_time?: string;
          created_at?: string;
          id?: string;
          max_players?: number;
          name?: string;
          open_time?: string;
          photo_url?: string | null;
          sort_order?: number;
          timezone?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      booking_changes_open: { Args: { target_booking: string }; Returns: boolean };
      booking_is_public: { Args: { target_booking: string }; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_owner: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_participant: { Args: { target_booking: string }; Returns: boolean };
      my_role: { Args: Record<PropertyKey, never>; Returns: Database["public"]["Enums"]["member_role"] };
      plays_in_match: { Args: { target_match: string }; Returns: boolean };
    };
    Enums: {
      booking_kind: "match" | "lesson" | "league";
      league_format: "americano" | "mexicano" | "round_robin";
      member_role: "owner" | "admin" | "member";
      visibility: "public" | "private";
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
    Enums: {
      booking_kind: ["match", "lesson", "league"],
      league_format: ["americano", "mexicano", "round_robin"],
      member_role: ["owner", "admin", "member"],
      visibility: ["public", "private"],
    },
  },
} as const;
