import { apiClient } from './client';
export const safetyApi = {
  checkContent: (content: string) => apiClient.post('/api/safety/check', { content }).then(r => r.data),
};