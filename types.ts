
export enum AgentStatus {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  EXECUTING = 'EXECUTING',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR'
}

export interface GeneratedFile {
  name: string;
  type: 'code' | 'zip' | 'document';
  size?: string;
  path?: string; // E2B sandbox file path for download
}

export interface PlanStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  description?: string;
  toolUsed?: 'search' | 'browse' | 'terminal' | 'thinking';
  searchQuery?: string;
  toolInput?: {
    type: 'browsing' | 'typing' | 'terminal';
    value: string;
  };
  logs?: AgentLog[];
}

export interface AgentLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'tool';
  message: string;
  toolData?: any;
}

export interface GroundingMetadata {
  groundingChunks: {
    web?: {
      uri: string;
      title: string;
    };
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  groundingMetadata?: GroundingMetadata;
  steps?: PlanStep[];
  generatedFiles?: GeneratedFile[];
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  messages: ChatMessage[];
  timestamp: Date;
  iconType: 'search' | 'code' | 'globe' | 'file';
}

export interface WorkspaceState {
  view: 'browser' | 'terminal' | 'editor' | 'canvas';
  url?: string;
  content?: string;
  language?: string;
}
