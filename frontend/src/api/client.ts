// DocuFlow AI — Axios API Client
import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes for large file operations
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: inject auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
          useAuthStore.getState().setTokens(data.access_token, refreshToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }
          return apiClient(originalRequest);
        } catch {
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ─── Upload with progress ─────────────────────────────────────────────────────
export const uploadWithProgress = (
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
) => {
  const token = useAuthStore.getState().accessToken;
  return axios.post(`${API_BASE}${url}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
    timeout: 300000, // 5 minutes for uploads
  });
};

// ─── Server-Sent Events (SSE) Stream Reader ──────────────────────────────────
export async function streamSSE(
  endpoint: string,
  body: any,
  onToken: (token: string) => void,
  onDone?: (data: any) => void
): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`SSE streaming failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response stream is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          if (parsed.token) {
            onToken(parsed.token);
          }
          if (parsed.done && onDone) {
            onDone(parsed);
          }
        } catch {
          // Ignore partial or unparseable SSE line
        }
      }
    }
  }
}

// ─── User-Friendly Error Formatter ────────────────────────────────────────────
export function getUserFriendlyErrorMessage(err: unknown): string {
  const response = (err as AxiosError<{ detail?: string | Array<{ msg: string }> }>)?.response;
  if (!response) {
    return 'Unable to connect to the server. Please check your connection.';
  }
  const detail = response.data?.detail;
  if (typeof detail === 'string') {
    if (detail.includes('File not found')) return 'Requested file could not be found.';
    if (detail.includes('Empty file')) return 'Please select a valid, non-empty file.';
    if (detail.includes('too large') || detail.includes('exceeded')) return 'This file exceeds the maximum size limit.';
    if (detail.includes('Unsupported') || detail.includes('format')) return 'This file type is not supported.';
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
    return detail[0].msg;
  }
  if (response.status === 413) {
    return 'The file size is too large. Please upload a smaller file.';
  }
  if (response.status >= 500) {
    return 'Something went wrong while processing your file. Please try again.';
  }
  return 'Processing failed. Please check your file and try again.';
}
