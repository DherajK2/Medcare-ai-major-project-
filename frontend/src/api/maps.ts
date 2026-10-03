import { apiClient } from './client';
export const mapsApi = {
  getFacilities: (lat: number, lon: number) => apiClient.get('/api/facilities', { params: { lat, lon } }).then(r => r.data),
};