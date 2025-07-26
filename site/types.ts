export interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string | null;
  audioUrl?: string;
  audioFileId?: string;
  file?: {
    id: string;
    name: string;
  };
  timestamp: number;
  isSentByMe: boolean;
}

export interface ApiMessage {
  sender: string;
  receiver: string;
  content: string | null;
  audio_url?: string | null;
  file_id?: string;
  filename?: string;
  file_url?: string;
  timestamp: string;
  groupId?: string;
}

export interface ApiFile {
  file_id: string;
  filename: string;
  content_type: string;
}

export interface Contact {
  username: string;
}

export interface Group {
  id: string;
  name: string;
  is_admin: boolean;
  inviteKey: string;
}

export interface ApiGroup {
    id: string;
    name: string;
    admin: string;
    invite_key: string;
}

export interface UserFile {
  id: string;
  name: string;
  contentType: string;
  content?: string;
  url?: string;
}

export interface CalendarEvent {
  id:string;
  date: string;
  title: string;
  description: string;
}

export interface ApiProfile {
    first_name?: string;
    last_name?: string;
    gender?: 'male' | 'female' | 'other' | string;
    city?: string;
    country?: string;
    birth_date?: string;
    bio?: string;
    avatar_url?: string | null;
}