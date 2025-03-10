// Database Models
export interface Production {
  id: number;
  name: string;
  access_code: string;
  created_at: string;
  changed_at: string;
  email_template?: string;
}

export interface Group {
  id: number;
  production_id: number;
  name: string;
  janus_room_id: number;
  created_at: string;
  changed_at: string;
  settings: GroupSettings;
  ui_settings: GroupUISettings;
  type: GroupType;
}

// Group Types
export enum GroupType {
  INTERCOM = 'intercom',
  PROGRAM = 'program'
}

// Activity Log
export interface ActivityLogEntry {
  id: number;
  action: 'created' | 'updated' | 'deleted';
  item_type: 'production' | 'group' | 'user';
  item_id: number;
  item_name: string;
  details?: string;
  production_id?: number;
  production_name?: string;
  timestamp: string;
}

// WebRTC and Janus Types
export interface JanodeHandle {
  handleId: string;
  plugin: string;
  groupId?: number;
}

export interface PeerConnection {
  pc: RTCPeerConnection;
  groupId: number;
  handleId: string;
  stream?: MediaStream;
  audioElement?: HTMLAudioElement;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface GroupMember {
  id: string;
  display_name: string;
  is_talking: boolean;
  last_active: string;
  is_publisher?: boolean;
}

// Socket Events
export enum SocketEvents {
  JOIN_PRODUCTION = 'join_production',
  LEAVE_PRODUCTION = 'leave_production',
  JOIN_GROUP = 'join_group',
  LEAVE_GROUP = 'leave_group',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USERS_LIST = 'users_list',
  TALKING_START = 'talking_start',
  TALKING_STOP = 'talking_stop',
  PUBLISHER_CHANGED = 'publisher_changed',
  PRODUCTION_UPDATED = 'production_updated',
  GROUP_UPDATED = 'group_updated',
  ERROR = 'error',
  USER_ID = 'user_id'
}

// Janus WebSocket Events
export enum JanusSocketEvents {
  CREATE_HANDLE = 'janus_create_handle',
  HANDLE_CREATED = 'janus_handle_created',
  SEND_MESSAGE = 'janus_message',
  MESSAGE_RESPONSE = 'janus_message_response',
  SEND_TRICKLE = 'janus_trickle',
  TRICKLE_RESPONSE = 'janus_trickle_response',
  ERROR = 'janus_error'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProductionWithGroups extends Production {
  groups: Group[];
}

// User Settings
export interface UserSettings {
  displayName: string;
  preferredAudioDevice?: string;
  preferredSpeakerDevice?: string;
  theme: 'light' | 'dark' | 'system';
  groupVolumes: Record<number, number>;
  audioSettings?: {
    noiseSuppression: boolean;
    echoCancellation: boolean;
    autoGainControl: boolean;
  };
}

// Group Settings
export interface GroupSettings {
  noise_suppression: boolean;
  echo_cancellation: boolean;
  auto_gain_control: boolean;
  audio_level_events: boolean;
  comfort_noise: boolean;
  muted_by_default: boolean;
}

// Group UI Settings
export interface GroupUISettings {
  button_style: 'round' | 'square';
  color: string;
}

// Email Template
export interface EmailTemplate {
  id: number;
  name: string;
  description: string;
  subject: string;
  content: string;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  changed_at: string;
}

// Default Group Settings
export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  noise_suppression: true,
  echo_cancellation: true,
  auto_gain_control: true,
  audio_level_events: false,
  comfort_noise: true,
  muted_by_default: true
};

// Default Group UI Settings
export const DEFAULT_GROUP_UI_SETTINGS: GroupUISettings = {
  button_style: 'round',
  color: '#3B82F6'
};

// Available Group Colors
export const GROUP_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Slate', value: '#64748B' }
];

// Default Email Subject
export const DEFAULT_EMAIL_SUBJECT = "Invitation to join {production_name} intercom";

// Default Email Template
export const DEFAULT_EMAIL_TEMPLATE = `Hello,

You've been invited to join the "{production_name}" intercom system.

Please use the following link to join:
{join_url}

Or enter this access code: {access_code}

Regards,
{sender_name}`;