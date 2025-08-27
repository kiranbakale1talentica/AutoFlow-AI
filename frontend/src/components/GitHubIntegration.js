import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Grid,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Folder as RepoIcon,
  PlayArrow as WorkflowIcon,
  Sync as SyncIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import apiService from '../services/api';

const GitHubIntegration = ({ onPipelineImported, onRefreshPipelines }) => {
  const { githubUser, isGithubConnected, connectGithub, disconnectGithub, checkGithubAuth } = useAuth();
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        // Check for OAuth callback first
        const urlParams = new URLSearchParams(window.location.search);
        const authStatus = urlParams.get('auth');
        const username = urlParams.get('user');
        
        if (authStatus === 'success' && username) {
          setSuccess(`Successfully connected to GitHub as ${decodeURIComponent(username)}!`);
          await checkGithubAuth(); // Re-check GitHub auth status
          await loadRepositories();
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (authStatus === 'error') {
          setError('GitHub authentication failed. Please try again.');
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          // If already connected, load repositories
          if (isGithubConnected) {
            await loadRepositories();
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setError('Failed to initialize: ' + error.message);
      }
    };
    
    init();
  }, [isGithubConnected, checkGithubAuth]);

  const handleLogin = (e, forceReconnect = false) => {
    e.preventDefault();
    
    // Only clear GitHub-specific data for reconnection
    if (forceReconnect) {
      setRepositories([]);
      localStorage.removeItem('github_token');
      sessionStorage.removeItem('github_user');
    }
    
    // Use the AuthContext method to connect
    connectGithub();
  };

  const handleLogout = async () => {
    try {
      await disconnectGithub();
      setRepositories([]);
      setSuccess('Successfully disconnected from GitHub');
    } catch (error) {
      setError('Failed to disconnect from GitHub');
    }
  };

  const loadRepositories = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await authService.getGitHubRepositories();
      
      if (response.success) {
        setRepositories(response.repositories);
      } else {
        setError('Failed to load repositories');
      }
    } catch (error) {
      setError('Failed to load repositories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPipeline = async () => {
    if (!selectedRepo || !selectedWorkflow) {
      setError('Please select a repository and workflow');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const workflow = selectedRepo.workflows.find(w => w.id.toString() === selectedWorkflow);
      
      const importData = {
        repositoryId: selectedRepo.id,
        repositoryName: selectedRepo.name,
        repositoryUrl: selectedRepo.htmlUrl,
        workflowId: selectedWorkflow,
        workflowName: workflow?.name
      };

      const response = await authService.importPipeline(importData);
      
      if (response.success) {
        setSuccess(`Successfully imported pipeline: ${selectedRepo.name}`);
        setImportDialogOpen(false);
        setSelectedRepo(null);
        setSelectedWorkflow('');
        
        // Refresh pipelines in parent component
        if (onPipelineImported) {
          onPipelineImported(response.pipeline);
        }
        if (onRefreshPipelines) {
          onRefreshPipelines();
        }
      } else {
        setError('Failed to import pipeline: ' + response.message);
      }
    } catch (error) {
      setError('Failed to import pipeline: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncExecutions = async (repo) => {
    try {
      setLoading(true);
      setError('');
      
      // First, we need to find the pipeline that matches this repository
      const pipelinesResponse = await apiService.getPipelines();
      const matchingPipeline = pipelinesResponse.data.find(p => 
        p.repository_url === repo.htmlUrl || 
        p.name.includes(repo.name)
      );
      
      if (!matchingPipeline) {
        setError('No matching pipeline found for this repository. Please import the pipeline first.');
        return;
      }

      // Get the GitHub access token from auth service
      if (!authService.isAuthenticated || !authService.user?.accessToken) {
        // Try to refresh the auth status
        const userData = await authService.checkAuthStatus();
        if (!userData || !userData.accessToken) {
          setError('GitHub access token not available. Please reconnect to GitHub.');
          handleLogin(new Event('click')); // Redirect to GitHub login
          return;
        }
      }

      // Extract owner and repo name from the URL
      const match = repo.htmlUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        setError('Invalid GitHub repository URL format');
        return;
      }

      const [, owner, repoName] = match;

      // For each workflow in the repository, sync its runs
      const syncPromises = repo.workflows.map(async (workflow) => {
        const syncData = {
          accessToken: authService.user.accessToken,
          owner: owner,
          repo: repoName,
          workflowId: workflow.id,
          limit: 30
        };

        return apiService.syncGitHubWorkflowRuns(matchingPipeline.id, syncData);
      });

      const results = await Promise.all(syncPromises);
      const totalSynced = results.reduce((sum, r) => sum + (r.syncedCount || 0), 0);
      
      setSuccess(`Synced ${totalSynced} workflow runs from ${repo.name}`);
      
      // Refresh pipelines to show updated execution data
      if (onRefreshPipelines) {
        onRefreshPipelines();
      }
    } catch (error) {
      setError('Failed to sync workflow runs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openImportDialog = (repo) => {
    setSelectedRepo(repo);
    setSelectedWorkflow(repo.workflows?.[0]?.id?.toString() || '');
    setImportDialogOpen(true);
  };

  if (loading && !githubUser) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* GitHub Integration Card */}
      <Card>
        <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center">
                <GitHubIcon sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6">GitHub Integration</Typography>
              </Box>
              
              {githubUser && (
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<GitHubIcon />}
                    onClick={(e) => handleLogin(e, true)}
                    size="small"
                  >
                    Reconnect
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    size="small"
                  >
                    Disconnect
                  </Button>
                </Box>
              )}
            </Box>          {!githubUser ? (
            // Not authenticated - show login
            <Box textAlign="center" py={4}>
              <GitHubIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Connect to GitHub
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Connect your GitHub account to import repositories as CI/CD pipelines
                and sync workflow executions in real-time. Use "Reconnect" if you want to switch accounts.
              </Typography>
              <Button
                variant="contained"
                startIcon={<GitHubIcon />}
                onClick={handleLogin}
                size="large"
                sx={{ backgroundColor: '#24292e', '&:hover': { backgroundColor: '#1a1e22' } }}
              >
                Connect GitHub Account
              </Button>
            </Box>
          ) : (
            // Authenticated - show user info and repositories
            <Box>
              {/* User Info */}
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar src={githubUser.avatarUrl} sx={{ mr: 2 }}>
                  {githubUser.username?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {githubUser.displayName || githubUser.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{githubUser.username} • {githubUser.repos} repositories
                  </Typography>
                </Box>
              </Box>

              {/* Repository Actions */}
              <Box display="flex" gap={2} mb={3}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={loadRepositories}
                  disabled={loading}
                >
                  Load Repositories
                </Button>
              </Box>

              {/* Repositories List */}
              {repositories.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Your Repositories
                  </Typography>
                  <List>
                    {repositories.slice(0, 10).map((repo) => (
                      <ListItem key={repo.id} divider>
                        <ListItemAvatar>
                          <Avatar>
                            <RepoIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={repo.name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {repo.description || 'No description'}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                                {repo.private && (
                                  <Chip label="Private" size="small" color="primary" />
                                )}
                                {repo.hasWorkflows && (
                                  <Chip 
                                    label={`${repo.workflows?.length || 0} workflows`} 
                                    size="small" 
                                    color="success"
                                    icon={<WorkflowIcon />}
                                  />
                                )}
                                {repo.language && (
                                  <Chip 
                                    label={repo.language} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                          }
                          secondaryTypographyProps={{
                            component: 'div'
                          }}
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" gap={1}>
                            {repo.hasWorkflows && (
                              <>
                                <IconButton
                                  onClick={() => openImportDialog(repo)}
                                  color="primary"
                                  title="Import as Pipeline"
                                >
                                  <AddIcon />
                                </IconButton>
                                <IconButton
                                  onClick={() => handleSyncExecutions(repo)}
                                  color="secondary"
                                  title="Sync Executions"
                                  disabled={loading}
                                >
                                  <SyncIcon />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                  
                  {repositories.length > 10 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Showing first 10 repositories. Total: {repositories.length}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Import Pipeline Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Import Pipeline: {selectedRepo?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select a workflow to import as a CI/CD pipeline:
            </Typography>
            
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Workflow</InputLabel>
              <Select
                value={selectedWorkflow}
                label="Workflow"
                onChange={(e) => setSelectedWorkflow(e.target.value)}
              >
                {selectedRepo?.workflows?.map((workflow) => (
                  <MenuItem key={workflow.id} value={workflow.id.toString()}>
                    <Box>
                      <Typography variant="subtitle2">
                        {workflow.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {workflow.path} • {workflow.state}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedRepo && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Repository Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {selectedRepo.name}
                </Typography>
                <Typography variant="body2">
                  <strong>URL:</strong> {selectedRepo.htmlUrl}
                </Typography>
                <Typography variant="body2">
                  <strong>Language:</strong> {selectedRepo.language || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Workflows:</strong> {selectedRepo.workflows?.length || 0}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setImportDialogOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImportPipeline}
            variant="contained"
            disabled={loading || !selectedWorkflow}
          >
            {loading ? <CircularProgress size={20} /> : 'Import Pipeline'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GitHubIntegration;
