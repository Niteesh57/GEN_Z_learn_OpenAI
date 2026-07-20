import axios from 'axios';
import type { Experience } from '../types/chat';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '8000' && window.location.port !== '8080'
     ? 'http://localhost:8000' 
     : '');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generateExperience = async (concept: string, active_folder?: string, template?: string): Promise<Experience> => {
  const response = await apiClient.post<Experience>('/generate', { concept, active_folder, medium: active_folder, template });
  return response.data;
};

export const generateComicPage = async (concept: string, cluster: string, page_num: number, story_so_far: string): Promise<any> => {
  const response = await apiClient.post('/generate-comic-page', { concept, cluster, page_num, story_so_far });
  return response.data;
};

export const createReelNarration = async (text: string, voiceId: string, signal?: AbortSignal): Promise<string> => {
  const response = await apiClient.post<Blob>(
    '/reels-narration',
    { text, voice_id: voiceId },
    { responseType: 'blob', signal }
  );
  return URL.createObjectURL(new Blob([response.data], { type: 'audio/mpeg' }));
};
