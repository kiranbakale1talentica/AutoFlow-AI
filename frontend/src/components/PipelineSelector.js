import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Checkbox,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  GitHub as GitHubIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import authService from '../services/authService';

const PipelineSelector = ({ open, onClose, onPipelinesAdded }) => {
  const [step, setStep] = useState(0); // 0: auth check, 1: repositories, 2: workflows
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflows, setSelectedWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);

  const steps = ['GitHub Authentication', 'Select Repository', 'Choose Workflows'];

  // Fetch repositories using the authenticated user's token
  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch repositories using authService
      const response = await authService.getGitHubRepositories();
      
      if (response.success) {
        // Filter out any invalid repository objects
        const validRepositories = (response.repositories || []).filter(repo => 
          repo && repo.name && repo.id
        );
        setRepositories(validRepositories);
        
        // Filter repositories with workflows
        const reposWithWorkflows = validRepositories.filter(repo => repo.hasWorkflows);
        if (reposWithWorkflows.length > 0) {
          setRecommendations(reposWithWorkflows.slice(0, 3)); // Top 3 recommendations
        }
      } else {
        setError(response.message || 'Failed to fetch repositories');
      }
    } catch (error) {
      console.error('Repository fetch error:', error);
      setError('Failed to fetch repositories. Please try reconnecting to GitHub.');
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        setStep(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await authService.checkAuthStatus();
      if (userData && userData.accessToken) {
        setUserData(userData);
        setIsAuthenticated(true);
        setStep(1); // Go to repository selection
        await fetchRepositories();
      } else {
        setIsAuthenticated(false);
        setStep(0); // Stay on authentication step
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setStep(0);
    } finally {
      setLoading(false);
    }
  }, [fetchRepositories]);

  // Check authentication status on component mount
  useEffect(() => {
    if (open) {
      checkAuthStatus();
    }
  }, [open, checkAuthStatus]);

  const handleGitHubLogin = () => {
    // Redirect to GitHub OAuth
    authService.loginWithGitHub();
  };

  // Step 2: Repository Selection
  const handleRepoSelect = async (repo) => {
    setSelectedRepo(repo);
    setLoading(true);
    setError('');
    
    try {
      // Use the workflows that are already available in the repo object
      if (repo.workflows && repo.workflows.length > 0) {
        setWorkflows(repo.workflows);
        setSelectedWorkflows([]);
        setStep(2);
      } else {
        setError('This repository does not have any GitHub Actions workflows');
      }
    } catch (error) {
      console.error('Error handling repository selection:', error);
      setError('Failed to process repository selection');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Workflow Selection and Pipeline Creation
  const handleWorkflowToggle = (workflowId) => {
    setSelectedWorkflows(prev => 
      prev.includes(workflowId) 
        ? prev.filter(id => id !== workflowId)
        : [...prev, workflowId]
    );
  };

  const handleCreatePipelines = async () => {
    if (selectedWorkflows.length === 0) {
      setError('Please select at least one workflow');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const createdPipelines = [];
      const errors = [];
      const skippedExisting = [];
      
      // Create pipeline for each selected workflow
      for (const workflowId of selectedWorkflows) {
        const workflow = workflows.find(w => w.id === workflowId);
        if (workflow) {
          const pipelineData = {
            repositoryId: selectedRepo.id,
            repositoryName: selectedRepo.name,
            repositoryUrl: selectedRepo.htmlUrl,
            workflowId: workflowId
          };
          
          try {
            const result = await authService.importPipeline(pipelineData);
            if (result.success) {
              createdPipelines.push(result.pipeline);
            } else if (result.conflict) {
              // Pipeline already exists
              skippedExisting.push(workflow.name);
            } else {
              errors.push(`${workflow.name}: ${result.message || 'Unknown error'}`);
            }
          } catch (error) {
            if (error.response?.status === 409) {
              // Fallback for direct 409 errors (shouldn't happen with new authService but keeping for safety)
              skippedExisting.push(workflow.name);
            } else {
              // Other errors
              const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
              errors.push(`${workflow.name}: ${errorMessage}`);
            }
          }
        }
      }

      // Build success/error messages
      let message = '';
      if (createdPipelines.length > 0) {
        message += `Successfully created ${createdPipelines.length} pipeline${createdPipelines.length !== 1 ? 's' : ''}`;
      }
      
      if (skippedExisting.length > 0) {
        if (message) message += '. ';
        message += `${skippedExisting.length} pipeline${skippedExisting.length !== 1 ? 's' : ''} already exist${skippedExisting.length === 1 ? 's' : ''}: ${skippedExisting.join(', ')}`;
      }
      
      if (errors.length > 0) {
        if (message) message += '. ';
        message += `${errors.length} error${errors.length !== 1 ? 's' : ''}: ${errors.join('; ')}`;
      }

      if (createdPipelines.length > 0 || skippedExisting.length > 0) {
        setSuccess(message);
        if (createdPipelines.length > 0) {
          onPipelinesAdded(createdPipelines);
        }
        
        // Reset and close after a short delay
        setTimeout(() => {
          handleClose();
        }, 3000); // Longer delay to read the message
      } else {
        setError(message || 'Failed to create any pipelines');
      }
    } catch (error) {
      console.error('Error creating pipelines:', error);
      setError('Failed to create pipelines: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset all state
    setStep(0);
    setRepositories([]);
    setSelectedRepo(null);
    setWorkflows([]);
    setSelectedWorkflows([]);
    setLoading(false);
    setRecommendations([]);
    setError('');
    setSuccess('');
    setIsAuthenticated(false);
    setUserData(null);
    
    // Call the parent's onClose function
    onClose();
  };

  const renderStep0 = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      {isAuthenticated ? (
        <Box>
          <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>
            Connected to GitHub
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Logged in as: <strong>{userData?.login || userData?.username}</strong>
          </Typography>
          <Button
            variant="contained"
            onClick={() => fetchRepositories()}
            disabled={loading}
          >
            {loading ? 'Loading Repositories...' : 'Continue to Repositories'}
          </Button>
        </Box>
      ) : (
        <Box>
          <GitHubIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>
            Connect to GitHub
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            We need to connect to your GitHub account to discover your repositories and workflows.
            This will redirect you to GitHub for secure authentication.
          </Typography>
          <Button
            variant="contained"
            startIcon={<GitHubIcon />}
            onClick={handleGitHubLogin}
            size="large"
            sx={{ bgcolor: '#24292e', '&:hover': { bgcolor: '#1b1f23' } }}
          >
            Connect with GitHub
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 2 }} color="textSecondary">
            We'll only request access to repository information and workflows
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderStep1 = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Select Repository</Typography>
        <IconButton onClick={() => setStep(0)}>
          <ArrowBackIcon />
        </IconButton>
      </Box>

      {recommendations.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'success.main' }}>
            🌟 Recommended (with CI/CD workflows)
          </Typography>
          {recommendations.slice(0, 3).filter(rec => rec && rec.repository && rec.repository.name).map((rec) => (
            <Card
              key={rec.repository.name}
              onClick={() => handleRepoSelect(rec.repository)}
              sx={{ 
                mb: 1, 
                cursor: 'pointer', 
                '&:hover': { bgcolor: 'success.light', opacity: 0.1 },
                border: '1px solid',
                borderColor: 'success.main',
                bgcolor: 'success.lighter'
              }}
            >
              <CardContent sx={{ py: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle2" color="success.dark">
                      {rec.repository.name}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      {rec.repository.description || 'No description'}
                    </Typography>
                    <Typography variant="caption" display="block" color="success.main">
                      {rec.workflowCount || 0} workflow{rec.workflowCount !== 1 ? 's' : ''} • {rec.repository.language || 'No language'}
                    </Typography>
                  </Box>
                  <Chip label="Recommended" size="small" color="success" />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Typography variant="subtitle2" sx={{ mb: 2 }}>All Repositories</Typography>
      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
        {repositories.filter(repo => repo && repo.name).map((repo) => (
          <Card
            key={repo.id}
            onClick={() => handleRepoSelect(repo)}
            sx={{ 
              mb: 1, 
              cursor: 'pointer', 
              '&:hover': { bgcolor: 'grey.50' }
            }}
          >
            <CardContent sx={{ py: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2">{repo.name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {repo.description || 'No description'}
                  </Typography>
                  <Typography variant="caption" display="block" color="textSecondary">
                    {repo.language || 'No language'} • Updated {repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString() : 'Unknown'}
                  </Typography>
                </Box>
                {repo.isPrivate && (
                  <Chip label="Private" size="small" />
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Select Workflows</Typography>
        <IconButton onClick={() => setStep(1)}>
          <ArrowBackIcon />
        </IconButton>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Repository:</strong> {selectedRepo?.name}
        </Typography>
      </Alert>

      <Box>
        {workflows.map((workflow) => (
          <Card
            key={workflow.id}
            sx={{ 
              mb: 1, 
              cursor: 'pointer',
              border: selectedWorkflows.includes(workflow.id) ? '2px solid' : '1px solid',
              borderColor: selectedWorkflows.includes(workflow.id) ? 'primary.main' : 'grey.300',
              bgcolor: selectedWorkflows.includes(workflow.id) ? 'primary.lighter' : 'white'
            }}
            onClick={() => handleWorkflowToggle(workflow.id)}
          >
            <CardContent sx={{ py: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={selectedWorkflows.includes(workflow.id)}
                  onChange={() => handleWorkflowToggle(workflow.id)}
                  sx={{ mr: 2 }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2">{workflow.name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {workflow.path}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip 
                      label={workflow.state}
                      size="small"
                      color={workflow.state === 'active' ? 'success' : 'default'}
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Add Specific Pipelines</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
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

        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={step} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </DialogContent>

      <DialogActions>
        {step === 0 && !isAuthenticated && (
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
        )}
        
        {step === 2 && (
          <>
            <Button
              onClick={handleCreatePipelines}
              disabled={loading || selectedWorkflows.length === 0}
              variant="contained"
              color="primary"
            >
              {loading ? 'Creating...' : `Create ${selectedWorkflows.length} Pipeline${selectedWorkflows.length !== 1 ? 's' : ''}`}
            </Button>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PipelineSelector;
