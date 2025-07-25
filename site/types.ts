export interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string | null; // Can be null for voice messages
  audioUrl?: string; // URL for the audio file
  timestamp: number;
  isSentByMe: boolean;
}

export interface ApiMessage {
  sender: string;
  receiver: string;
  content: string | null; // Can be null for voice messages
  audio_url?: string | null; // URL path for the audio file
  timestamp: string; // ISO 8601 format from server
}

export interface ApiFile {
  file_id: string;
  filename: string;
  content_type: string;
}

export interface Contact {
  username: string;
  // public_key has been removed to match the new API
}

export interface Group {
  id: string;
  name: string;
  is_admin: boolean;
}

export interface ApiGroup {
    group_id: string;
    name: string;
    is_admin: boolean;
}

// The types below are no longer used with the new API
// but are kept for other parts of the app.

export interface UserFile {
  id: string; // from file_id
  name: string; // from filename
  contentType: string;
  content?: string; // For text file content
  url?: string; // For blob object URLs
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  description: string;
}

export interface ApiProfile {
    country?: string;
    city?: string;
    birth_date?: string; // YYYY-MM-DD
    gender?: string;
    languages?: string[];
    bio?: string;
    nickname?: string;
}