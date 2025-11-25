import axios from 'axios';

const defaultBaseUrl = 'http://localhost:3000/api/v1';

const normalizedBaseUrl = (() => {
  const envUrl = process.env.REACT_APP_API_BASE;
  if (!envUrl) return defaultBaseUrl;

  const trimmed = envUrl.trim();
  if (!trimmed) return defaultBaseUrl;

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
})();

export const API_BASE_URL = normalizedBaseUrl;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('viewesta_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const healthCheck = () => apiClient.get('/health');

export default apiClient;

