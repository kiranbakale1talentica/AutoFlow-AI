import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Add this to ensure cookies are sent
  timeout: 10000,
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// WebSocket connection
let wsConnection = null;

export const createWebSocketConnection = (onMessage) => {
  // Close existing connection if any
  if (wsConnection && wsConnection.readyState !== WebSocket.CLOSED) {
    wsConnection.close();
  }

  try {
    wsConnection = new WebSocket(WS_BASE_URL);
    
    wsConnection.onopen = () => {
      console.log('🔌 WebSocket connected to CI/CD Dashboard');
    };
    
    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);
        if (onMessage && typeof onMessage === 'function') {
          onMessage(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    wsConnection.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
    };
    
    wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return wsConnection;
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    return null;
  }
};

export const closeWebSocketConnection = () => {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
};

// CI/CD Pipeline API endpoints
export const apiService = {
  // Health check
  healthCheck: () => api.get('/api/health'),

  // Pipeline Management
  getPipelines: () => api.get('/api/pipelines'),
  getPipelineById: (id) => api.get(`/api/pipelines/${id}`),
  createPipeline: (pipelineData) => api.post('/api/pipelines', pipelineData),
  updatePipeline: (id, pipelineData) => api.put(`/api/pipelines/${id}`, pipelineData),
  deletePipeline: (id) => api.delete(`/api/pipelines/${id}`),

  // Execution Tracking
  getExecutions: (limit = 50) => api.get(`/api/executions?limit=${limit}`),
  getPipelineExecutions: (pipelineId, limit = 50) => api.get(`/api/pipelines/${pipelineId}/executions?limit=${limit}`),
  getExecutionById: (id) => api.get(`/api/executions/${id}`),
  getExecutionLogs: (id) => api.get(`/api/executions/${id}/logs`),
  createExecution: (executionData) => api.post('/api/executions', executionData),

  // Dashboard Metrics
  getDashboardMetrics: () => api.get('/api/metrics/dashboard'),
  getBuildTrends: (days = 7) => api.get(`/api/metrics/build-trends?days=${days}`),

  // Alert Management
  getAlertConfigs: (pipelineId = null) => {
    const url = pipelineId ? `/api/alerts/config?pipeline_id=${pipelineId}` : '/api/alerts/config';
    return api.get(url);
  },
  createAlertConfig: (alertData) => api.post('/api/alerts/config', alertData),
  deleteAlertConfig: (id) => api.delete(`/api/alerts/config/${id}`),
  testAlert: (alertData) => api.post('/api/alerts/test', alertData),
  testEmailSimple: (emailData) => api.post('/api/alerts/test-email', emailData),

  // Webhook Simulation
  triggerGitHubWebhook: (webhookData) => api.post('/api/webhooks/github', webhookData),

  // Real Data Synchronization
  syncGitHubWorkflowRuns: (pipelineId, syncData) => api.post(`/api/github/sync-workflow-runs/${pipelineId}`, syncData),
  syncPipelineExecutions: (pipelineId, syncData) => api.post(`/api/pipelines/${pipelineId}/sync`, syncData),

  // WebSocket management
  createWebSocketConnection,
  closeWebSocketConnection,
};

export default apiService;
