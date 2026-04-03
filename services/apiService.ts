import { ConversationApiResponse, ConversationDetailApiResponse, AppUsageApiResponse } from "../types";

const BASE_URL = "http://192.168.1.201:5005";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const getHeaders = () => {
  const token = localStorage.getItem('console_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const fetchConversations = async (page: number = 1, per_page: number = 20): Promise<ConversationApiResponse> => {
  const response = await fetch(`${BASE_URL}/console/api/manus/conversations?page=${page}&per_page=${per_page}`, {
    headers: getHeaders()
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  return response.json();
};

export const deleteConversation = async (id: string): Promise<any> => {
  const response = await fetch(`${BASE_URL}/console/api/manus/conversations/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to delete conversation');
  }

  return response.json();
};

export const renameConversation = async (id: string, title: string): Promise<any> => {
  const response = await fetch(`${BASE_URL}/console/api/manus/conversations/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ title })
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to rename conversation');
  }

  return response.json();
};

export const fetchConversationDetail = async (id: string): Promise<ConversationDetailApiResponse> => {
  const response = await fetch(`${BASE_URL}/console/api/manus/conversations/${id}`, {
    headers: getHeaders()
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to fetch conversation details');
  }

  return response.json();
};

export const runThinkingMode = async (prompt: string, agentType: string, modelConfig: any, signal?: AbortSignal, fileIds?: string[], conversationId?: string): Promise<any> => {
  const body: any = {
      prompt,
      stream: true,
      agent_type: agentType,
      file_ids: fileIds || [],
      model_config: {
        ...modelConfig,
        max_tokens: 15000
      }
  };
  if (conversationId) body.conversation_id = conversationId;

  const response = await fetch(`${BASE_URL}/console/api/manus/run`, {
    method: 'POST',
    headers: getHeaders(),
    signal,
    body: JSON.stringify(body)
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to run thinking mode');
  }

  return response; // Assuming stream response
};

export const runPlanningMode = async (prompt: string, agents: string[], modelConfig: any, signal?: AbortSignal, fileIds?: string[], conversationId?: string): Promise<any> => {
  const body: any = {
      prompt,
      stream: true,
      agents,
      timeout: 3600,
      file_ids: fileIds || [],
      model_config: {
        ...modelConfig,
        max_tokens: 15000
      }
  };
  if (conversationId) body.conversation_id = conversationId;

  const response = await fetch(`${BASE_URL}/console/api/manus/run_flow`, {
    method: 'POST',
    headers: getHeaders(),
    signal,
    body: JSON.stringify(body)
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to run planning mode');
  }

  return response; // Assuming stream response
};

export const fetchAppsUsage = async (tenantId?: string, accountId?: string): Promise<AppUsageApiResponse> => {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenant_id', tenantId);
  if (accountId) params.append('account_id', accountId);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(`${BASE_URL}/console/api/explore/appsUsage${queryString}`, {
    headers: getHeaders()
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to fetch apps usage');
  }

  return response.json();
};

export const fetchModelTypes = async (usage: string = 'chat'): Promise<any> => {
  const response = await fetch(`${BASE_URL}/console/api/workspaces/current/models/model-types/llm?usage=${usage}`, {
    headers: getHeaders()
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to fetch model types');
  }

  return response.json();
};

export const fetchExploreApps = async (): Promise<any> => {
  const response = await fetch(`${BASE_URL}/console/api/explore/apps`, {
    headers: getHeaders()
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to fetch explore apps');
  }

  return response.json();
};

export const getFileUrl = async (filePath: string): Promise<string> => {
  const response = await fetch(`${BASE_URL}/console/api/manus/workspace/files/${filePath}`, {
    headers: getHeaders()
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to fetch file');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const uploadFile = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const headers = getHeaders();
  // @ts-ignore
  delete headers['Content-Type']; // Let browser set boundary

  const response = await fetch(`${BASE_URL}/console/api/files/upload`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
};
