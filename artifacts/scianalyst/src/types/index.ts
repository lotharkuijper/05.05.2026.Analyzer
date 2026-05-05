export type ApiProvider = 'groq' | 'openai' | 'gemini';

export interface Agent {
  id: string;
  name: string;
  role: string;
  system_prompt: string;
  api_provider: ApiProvider;
  model: string;
  is_default: boolean;
  is_reviewer: boolean;
  is_synthesizer: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentSection {
  title: string;
  content: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  file_type: 'pdf' | 'docx';
  extracted_text: string;
  sections: Record<string, string>;
  file_size: number;
  created_at: string;
}

export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'error';

export interface Analysis {
  id: string;
  document_id: string;
  agent_id: string;
  status: AnalysisStatus;
  result: string;
  error_message: string;
  created_at: string;
  completed_at: string | null;
  agent?: Agent;
}

export interface ApiKeys {
  groq: string;
  openai: string;
  gemini: string;
  active_provider: ApiProvider;
}

export type ActiveView = 'dashboard' | 'agents' | 'analysis' | 'review' | 'settings';

export interface ReviewDocumentResult {
  document: UploadedDocument;
  analyses: Analysis[];
  synthesisResult: string;
}

export interface ReviewRunState {
  phase: 'idle' | 'analyzing' | 'reviewing' | 'done';
  currentDocIndex: number;
  totalDocs: number;
  currentAgentName: string;
}
