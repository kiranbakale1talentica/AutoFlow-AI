import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';

class AuthService {
  constructor() {
    this.baseURL = API_BASE_URL;
    // Try to restore user from localStorage
    const savedUser = localStorage.getItem('user');
    this.user = savedUser ? JSON.parse(savedUser) : null;
    this.isAuthenticated = !!this.user;
  }

  // Initialize authentication service
  async init() {
    try {
      await this.checkAuthStatus();
    } catch (error) {
      console.log('No active session found');
    }
  }

  // Check if user is authenticated
  async checkAuthStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/api/auth/status`, {
        withCredentials: true
      });
      
      if (response.data.authenticated) {
        this.user = response.data.user;
        this.isAuthenticated = true;
        
        // Set the GitHub token in axios defaults if available
        if (this.user.accessToken) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${this.user.accessToken}`;
        }

        // Save user data to localStorage
        localStorage.setItem('user', JSON.stringify(this.user));
        
        return this.user;
      }
      
      this.user = null;
      this.isAuthenticated = false;
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('user');
      return null;
    } catch (error) {
      this.user = null;
      this.isAuthenticated = false;
      delete axios.defaults.headers.common['Authorization'];
      return null;
    }
  }

  // Initiate GitHub OAuth login
  loginWithGitHub() {
    window.location.href = `${this.baseURL}/auth/github`;
  }

  // Logout user
  async logout() {
    try {
      await axios.post(`${this.baseURL}/api/auth/logout`, {}, {
        withCredentials: true
      });
      
      this.user = null;
      this.isAuthenticated = false;
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Get user's GitHub repositories
  async getGitHubRepositories() {
    try {
      const response = await axios.get(`${this.baseURL}/auth/github/repositories`, {
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw error;
    }
  }

  // Import a repository as a pipeline
  async importPipeline(repositoryData) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/github/import-pipeline`, repositoryData, {
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Error importing pipeline:', error);
      
      // For 409 conflicts, return a structured response instead of throwing
      if (error.response?.status === 409) {
        return {
          success: false,
          conflict: true,
          message: error.response.data?.message || 'Pipeline already exists',
          pipeline: error.response.data?.pipeline
        };
      }
      
      // For other errors, still throw
      throw error;
    }
  }

  // Get workflow runs for a repository
  async getWorkflowRuns(owner, repo, workflowId = null, limit = 20) {
    try {
      const response = await axios.get(`${this.baseURL}/auth/github/workflow-runs/${owner}/${repo}`, {
        params: { workflowId, limit },
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
      throw error;
    }
  }

  // Sync workflow runs to executions
  async syncExecutions(pipelineId, limit = 10) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/github/sync-executions/${pipelineId}`, 
        { limit }, 
        { withCredentials: true }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error syncing executions:', error);
      throw error;
    }
  }

  // Get current user
  getUser() {
    return this.user;
  }

  // Check if authenticated
  isAuth() {
    return this.isAuthenticated;
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
