// DocuFlow AI — Social Media API Service Client
import apiClient from './client';
import {
  SocialMediaMetadata,
  SocialMediaDownloadRecord,
} from '@/types';

export interface ValidateUrlResponse {
  valid: boolean;
  platform: string;
  message: string;
}

export interface DownloadMediaResponse {
  download_id: string;
  download_url: string;
  filename: string;
  file_size: number;
  expires_at?: string;
  status: string;
  message?: string;
}

export const socialApi = {
  validateUrl: async (url: string): Promise<ValidateUrlResponse> => {
    const res = await apiClient.post<ValidateUrlResponse>('/social/validate', { url });
    return res.data;
  },

  analyzeUrl: async (url: string, platform?: string): Promise<SocialMediaMetadata> => {
    const res = await apiClient.post<SocialMediaMetadata>('/social/analyze', { url, platform });
    return res.data;
  },

  getMediaDetails: async (id: string): Promise<SocialMediaMetadata> => {
    const res = await apiClient.get<SocialMediaMetadata>(`/social/media/${id}`);
    return res.data;
  },

  downloadMedia: async (mediaId: string, optionId: string): Promise<DownloadMediaResponse> => {
    const res = await apiClient.post<DownloadMediaResponse>('/social/download', {
      media_id: mediaId,
      option_id: optionId,
    });
    return res.data;
  },

  getHistory: async (): Promise<SocialMediaDownloadRecord[]> => {
    const res = await apiClient.get<{ items: SocialMediaDownloadRecord[] }>('/social/history');
    return res.data.items || [];
  },
};
