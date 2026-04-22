import React from 'react';

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  isStreaming?: boolean;
  created_at?: string;
  thought?: string;
  answer?: string;
  logs?: LogEntry[];
  files?: string[];
  plan?: Plan;
}

export interface PlanStep {
  index: number;
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  agent_name?: string;
}

export interface Plan {
  plan_id: string;
  title: string;
  steps: PlanStep[];
}

export interface LogEntry {
  type: 'tool_call' | 'tool_output' | 'thought';
  message: string;
  status?: 'success' | 'error';
  args?: any;
}

export interface HistoryItem {
  id: string;
  title: string;
  agent_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationApiResponse {
  total: number;
  page: number;
  per_page: number;
  items: HistoryItem[];
}

export interface ConversationDetailApiResponse extends HistoryItem {
  messages: {
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    message_type: string;
    metadata: any;
    created_at: string;
  }[];
}

export interface AppShortcut {
  id: string;
  name: string;
  icon: React.ReactNode; // Changed from string to support SVG components
  color: string;
  description?: string;
  iconUrl?: string;
  url?: string;
  raw?: any;
}

export interface AppUsageItem {
  id: string;
  name: string;
  icon?: string;
  iconUrl?: string;
  color?: string;
  description?: string;
  usageCount?: number;
  lastUsed?: string;
}

export interface AppUsageApiResponse {
  items?: AppUsageItem[];
  data?: AppUsageItem[];
}

export interface WelcomeCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}