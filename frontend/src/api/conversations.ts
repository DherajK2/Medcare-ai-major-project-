import { apiClient } from './client';
export const conversationsApi = {
  sendMessage: (data: any) => apiClient.post('/api/chat', data).then(r => r.data),
};