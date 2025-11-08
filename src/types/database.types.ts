export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          skill: string | null;
          purpose: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          skill?: string | null;
          purpose?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          skill?: string | null;
          purpose?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string;
          description: string;
          max_participants: number | null;
          current_participants: number;
          status: 'draft' | 'published' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category: string;
          description: string;
          max_participants?: number | null;
          current_participants?: number;
          status?: 'draft' | 'published' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          category?: string;
          description?: string;
          max_participants?: number | null;
          current_participants?: number;
          status?: 'draft' | 'published' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      chat_rooms: {
        Row: {
          id: string;
          name: string;
          type: 'match' | 'project';
          post_id: string | null;
          match_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'match' | 'project';
          post_id?: string | null;
          match_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'match' | 'project';
          post_id?: string | null;
          match_id?: string | null;
          created_at?: string;
        };
      };
      chat_participants: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
    };
  };
}
