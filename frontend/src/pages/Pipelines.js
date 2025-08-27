import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Build as PipelineIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as FailureIcon,
  Schedule as RunningIcon,
  Cancel as CancelledIcon,
  GitHub as GitHubIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import apiService from '../services/api';
import GitHubIntegration from '../components/GitHubIntegration';
import PipelineSelector from '../components/PipelineSelector';

export default function Pipelines() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [showPipelineSelector, setShowPipelineSelector] = useState(false);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getPipelines();
      setPipelines(response.data);
    } catch (err) {
      console.error('Failed to fetch pipelines:', err);
      setError('Failed to load pipelines. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (pipeline) => {
    try {
      setError(null);
      setSuccess(null);
      
      await apiService.updatePipeline(pipeline.id, {
        is_active: !pipeline.is_active
      });
      
      fetchPipelines();
    } catch (err) {
      console.error('Failed to update pipeline:', err);
      setError(err.response?.data?.error || 'Failed to update pipeline');
    }
  };

  const handleSyncPipeline = async (pipeline) => {
    try {
      setError(null);
      setSuccess(null);
      
      // For GitHub pipelines, we need an access token
      if (pipeline.type === 'github') {
        // Import authService if not already imported
        const authService = (await import('../services/authService')).default;
        
        // Check if user is authenticated with GitHub
        const userData = await authService.checkAuthStatus();
        if (!userData) {
          setError('Please connect to GitHub first to sync workflow runs');
          return;
        }
        
        if (!userData.accessToken) {
          setError('GitHub access token not available. Please reconnect to GitHub.');
          return;
        }

        // Extract owner and repo from repository URL
        if (!pipeline.repository_url) {
          setError('Pipeline repository URL is missing. Please ensure the pipeline is properly configured.');
          return;
        }
        
        const repoUrlMatch = pipeline.repository_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!repoUrlMatch) {
          setError('Invalid GitHub repository URL format');
          return;
        }

        const [, owner, repo] = repoUrlMatch;

        // Sync workflow runs using session-based authentication
        const syncData = {
          // Token will be automatically retrieved from session on backend
        };

        const syncResult = await apiService.syncPipelineExecutions(pipeline.id, syncData);
        
        if (syncResult.success) {
          setSuccess(`Synced ${syncResult.syncedCount} executions for ${pipeline.name}`);
          await fetchPipelines(); // Refresh the pipeline list
        } else {
          setError('Failed to sync executions: ' + (syncResult.message || 'Unknown error'));
        }
      } else {
        setError('Only GitHub pipelines are supported for syncing.');
      }
    } catch (err) {
      console.error('Failed to sync pipeline:', err);
      setError('Failed to sync pipeline executions: ' + (err.message || 'Unknown error'));
    }
  };

  const handlePipelinesAdded = (newPipelines) => {
    setSuccess(`Successfully added ${newPipelines.length} pipeline${newPipelines.length !== 1 ? 's' : ''}`);
    fetchPipelines(); // Refresh the pipeline list
  };

  const handleEdit = async (pipeline) => {
    try {
      setError(null);
      setSuccess(null);
      
      await apiService.updatePipeline(pipeline.id, {
        is_active: !pipeline.is_active
      });
      
      setSuccess(`Pipeline ${pipeline.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchPipelines();
    } catch (err) {
      console.error('Failed to toggle pipeline status:', err);
      setError('Failed to update pipeline status');
    }
  };

  const handleDelete = async (pipelineId) => {
    if (!window.confirm('Are you sure you want to delete this pipeline? This will also delete all associated executions.')) {
      return;
    }

    try {
      await apiService.deletePipeline(pipelineId);
      fetchPipelines();
    } catch (err) {
      console.error('Failed to delete pipeline:', err);
      setError('Failed to delete pipeline');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failure': return 'error';
      case 'running': return 'warning';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <SuccessIcon />;
      case 'failure': return <FailureIcon />;
      case 'running': return <RunningIcon />;
      case 'cancelled': return <CancelledIcon />;
      default: return <RunningIcon />;
    }
  };

  const getTypeIcon = (type) => {
    return <GitHubIcon />;
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  if (loading) {
    return (
      <Box className="flex items-center justify-center h-64">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Box>
          <Typography variant="h4" className="font-bold text-gray-800 mb-2">
            🔧 Pipeline Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Configure and monitor your CI/CD pipelines
          </Typography>
        </Box>
        <Box className="flex items-center space-x-2">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowPipelineSelector(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Add Specific Pipelines
          </Button>
          <IconButton 
            onClick={fetchPipelines} 
            className="bg-gray-50 hover:bg-gray-100 text-gray-600"
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Pipeline List" />
          <Tab label="GitHub Integration" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Box>
          {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={fetchPipelines}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert 
          severity="success" 
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Pipelines Table */}
      <Card>
        <CardContent className="p-0">
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold text-gray-700">Pipeline</TableCell>
                  <TableCell className="font-semibold text-gray-700">Type</TableCell>
                  <TableCell className="font-semibold text-gray-700">Repository</TableCell>
                  <TableCell className="font-semibold text-gray-700">Last Status</TableCell>
                  <TableCell className="font-semibold text-gray-700">Executions</TableCell>
                  <TableCell className="font-semibold text-gray-700">Status</TableCell>
                  <TableCell className="font-semibold text-gray-700">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pipelines.length > 0 ? (
                  pipelines.map((pipeline) => (
                    <TableRow key={pipeline.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Box className="flex items-center space-x-3">
                          <Box className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <PipelineIcon className="text-blue-600 text-sm" />
                          </Box>
                          <Box>
                            <Typography
                              variant="body2"
                              className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                              onClick={() => navigate(`/executions?pipeline=${pipeline.id}`)}
                            >
                              {pipeline.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Created {new Date(pipeline.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box className="flex items-center space-x-2">
                          {getTypeIcon(pipeline.type)}
                          <Typography variant="body2" className="capitalize">
                            {pipeline.type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary" className="max-w-xs truncate">
                          {pipeline.repository_url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {pipeline.last_status ? (
                          <Chip
                            label={pipeline.last_status}
                            size="small"
                            color={getStatusColor(pipeline.last_status)}
                            icon={getStatusIcon(pipeline.last_status)}
                          />
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No executions
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {pipeline.execution_count} total
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={pipeline.is_active ? 'Active' : 'Inactive'} 
                          color={pipeline.is_active ? 'success' : 'default'}
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box className="flex items-center space-x-1">
                          <IconButton
                            size="small"
                            onClick={() => handleSyncPipeline(pipeline)}
                            className="text-green-600 hover:bg-green-50"
                            title="Sync executions from source"
                          >
                            <SyncIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(pipeline)}
                            className="text-blue-600 hover:bg-blue-50"
                            title="Toggle pipeline status"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(pipeline.id)}
                            className="text-red-600 hover:bg-red-50"
                            title="Delete pipeline"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <PipelineIcon className="mx-auto text-gray-400 mb-2" style={{ fontSize: 48 }} />
                      <Typography variant="body1" color="textSecondary">
                        No pipelines configured
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setShowPipelineSelector(true)}
                        className="mt-2"
                      >
                        Add First Pipeline
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
        </Box>
      )}

      {/* GitHub Integration Tab */}
      {tabValue === 1 && (
        <Box>
          <GitHubIntegration 
            onPipelineImported={(pipeline) => {
              setSuccess(`Successfully imported pipeline: ${pipeline.name}`);
              fetchPipelines();
            }}
            onRefreshPipelines={fetchPipelines}
          />
        </Box>
      )}

      {/* Pipeline Selector Modal */}
      {showPipelineSelector && (
        <PipelineSelector
          open={showPipelineSelector}
          onClose={() => setShowPipelineSelector(false)}
          onPipelinesAdded={handlePipelinesAdded}
        />
      )}
    </Box>
  );
}
