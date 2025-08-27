import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  PlayArrow as ExecutionIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  CheckCircle as SuccessIcon,
  Error as FailureIcon,
  Schedule as RunningIcon,
  Cancel as CancelledIcon,
  GitHub as GitHubIcon,
  Code as CodeIcon,
  Timer as TimerIcon,
  ArrowBack as ArrowBackIcon,
  ViewList as ViewAllIcon,
} from '@mui/icons-material';
import apiService from '../services/api';

export default function Executions() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pipelineId = searchParams.get('pipeline');
  
  const [executions, setExecutions] = useState([]);
  const [sortedExecutions, setSortedExecutions] = useState([]);
  const [filteredExecutions, setFilteredExecutions] = useState([]);
  const [sortOption, setSortOption] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState(null);

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (pipelineId) {
        // Fetch pipeline details and its executions
        const [executionsResponse, pipelineResponse] = await Promise.all([
          apiService.getExecutions(100),
          apiService.getPipelines()
        ]);
        
        // Find the selected pipeline
        const pipeline = pipelineResponse.data.find(p => p.id.toString() === pipelineId);
        setSelectedPipeline(pipeline);
        
        // Filter executions for this pipeline
        const pipelineExecutions = executionsResponse.data.filter(
          execution => execution.pipeline_id.toString() === pipelineId
        );
        setExecutions(pipelineExecutions);
      } else {
        // Fetch all executions
        const executionsResponse = await apiService.getExecutions(100);
        setExecutions(executionsResponse.data);
        setSelectedPipeline(null);
      }
    } catch (err) {
      console.error('Failed to fetch executions:', err);
      setError('Failed to load executions. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = async (execution) => {
    try {
      const response = await apiService.getExecutionLogs(execution.id);
      setSelectedExecution({ ...execution, logs: response.data.logs });
      setLogsDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to load execution logs');
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
    return type === 'github' ? <GitHubIcon /> : <CodeIcon />;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Function to sort executions
  const sortExecutions = (execList, option) => {
    let sorted = [...execList];
    switch (option) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'duration-desc':
        sorted.sort((a, b) => (b.build_time || 0) - (a.build_time || 0));
        break;
      case 'duration-asc':
        sorted.sort((a, b) => (a.build_time || 0) - (b.build_time || 0));
        break;
      case 'status':
        sorted.sort((a, b) => {
          const statusOrder = { success: 1, running: 2, failure: 3, cancelled: 4 };
          return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
        });
        break;
      default: // latest first
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return sorted;
  };

  // Effect for initial load and WebSocket updates
  useEffect(() => {
    fetchExecutions();
    
    // Set up WebSocket connection for real-time updates
    const ws = apiService.createWebSocketConnection((data) => {
      if (data.type === 'execution_created' || data.type === 'execution_updated') {
        fetchExecutions();
      }
    });

    return () => {
      if (ws) {
        apiService.closeWebSocketConnection();
      }
    };
  }, [pipelineId]); // Re-fetch when pipeline ID changes

  // Effect for sorting executions when executions or sort option changes
  useEffect(() => {
    setSortedExecutions(sortExecutions(executions, sortOption));
  }, [executions, sortOption]);

  if (loading) {
    return (
      <Box className="flex items-center justify-center h-64">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box className="space-y-6">
      {/* Pipeline Info Banner */}
      {selectedPipeline && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <Box className="flex items-center justify-between">
              <Box className="flex items-center space-x-3">
                {getTypeIcon(selectedPipeline.type)}
                <Box>
                  <Typography variant="h6" className="font-medium text-blue-800">
                    {selectedPipeline.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedPipeline.repository_url}
                  </Typography>
                </Box>
              </Box>
              <Box className="flex items-center space-x-4">
                <Chip
                  label={selectedPipeline.is_active ? 'Active' : 'Inactive'}
                  color={selectedPipeline.is_active ? 'success' : 'default'}
                  size="small"
                />
                <Typography variant="body2" color="textSecondary">
                  {executions.length} execution{executions.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <Box className="flex items-center justify-between">
        <Box>
          {selectedPipeline ? (
            <Box>
              <Box className="flex items-center space-x-2 mb-2">
                <IconButton
                  onClick={() => navigate('/executions')}
                  className="text-gray-600 hover:bg-gray-100"
                  size="small"
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" className="font-bold text-gray-800">
                  Pipeline Executions
                </Typography>
              </Box>
              <Typography variant="body1" color="textSecondary">
                Showing executions for selected pipeline • {executions.length} executions
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="h4" className="font-bold text-gray-800 mb-2">
                ▶️ Pipeline Executions
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Monitor and track pipeline execution history • {executions.length} total executions
              </Typography>
            </Box>
          )}
        </Box>
        <Box className="flex items-center space-x-2">
          {selectedPipeline && (
            <Button
              variant="outlined"
              startIcon={<ViewAllIcon />}
              onClick={() => navigate('/executions')}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              View All Executions
            </Button>
          )}
          <FormControl variant="outlined" size="small" style={{ minWidth: 200 }}>
            <Select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              displayEmpty
              className="bg-white"
            >
              <MenuItem value="">Sort by: Latest First</MenuItem>
              <MenuItem value="oldest">Sort by: Oldest First</MenuItem>
              <MenuItem value="duration-desc">Sort by: Duration (Longest)</MenuItem>
              <MenuItem value="duration-asc">Sort by: Duration (Shortest)</MenuItem>
              <MenuItem value="status">Sort by: Status</MenuItem>
            </Select>
          </FormControl>
          <IconButton 
            onClick={fetchExecutions} 
            className="bg-gray-50 hover:bg-gray-100 text-gray-600"
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={fetchExecutions}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Executions Table */}
      <Card>
        <CardContent className="p-0">
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold text-gray-700">Execution</TableCell>
                  {!selectedPipeline && (
                    <TableCell className="font-semibold text-gray-700">Pipeline</TableCell>
                  )}
                  <TableCell className="font-semibold text-gray-700">Status</TableCell>
                  <TableCell className="font-semibold text-gray-700">Commit</TableCell>
                  <TableCell className="font-semibold text-gray-700">Duration</TableCell>
                  <TableCell className="font-semibold text-gray-700">Started</TableCell>
                  <TableCell className="font-semibold text-gray-700">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedExecutions.length > 0 ? (
                  sortedExecutions.map((execution) => (
                    <TableRow key={execution.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Box className="flex items-center space-x-3">
                          <Box className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <ExecutionIcon className="text-green-600 text-sm" />
                          </Box>
                          <Box>
                            <Typography variant="body2" className="font-medium">
                              Build #{execution.build_number}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ID: {execution.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      {!selectedPipeline && (
                        <TableCell>
                          <Box className="flex items-center space-x-2">
                            {getTypeIcon(execution.pipeline_type)}
                            <Box>
                              <Typography variant="body2" className="font-medium">
                                {execution.pipeline_name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {execution.pipeline_type.toUpperCase()}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip
                          label={execution.status}
                          size="small"
                          color={getStatusColor(execution.status)}
                          icon={getStatusIcon(execution.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box className="flex items-center space-x-2 mb-1">
                            <CodeIcon className="text-gray-400 text-sm" />
                            <Typography variant="body2" className="font-mono text-sm">
                              {execution.commit_hash || 'N/A'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="textSecondary" className="line-clamp-2">
                            {execution.commit_message || 'No commit message'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" className="block">
                            Branch: {execution.branch || 'main'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box className="flex items-center space-x-1">
                          <TimerIcon className="text-gray-400 text-sm" />
                          <Typography variant="body2">
                            {formatDuration(execution.build_time)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(execution.started_at || execution.created_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleViewLogs(execution)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={selectedPipeline ? 6 : 7} className="text-center py-12">
                      <ExecutionIcon className="mx-auto text-gray-400 mb-2" style={{ fontSize: 48 }} />
                      <Typography variant="body1" color="textSecondary">
                        {selectedPipeline 
                          ? `No executions found for ${selectedPipeline.name}`
                          : 'No executions found'
                        }
                      </Typography>
                      <Typography variant="body2" color="textSecondary" className="mt-2">
                        {selectedPipeline
                          ? 'Sync this pipeline or trigger new workflows to see executions here'
                          : 'Pipeline executions will appear here automatically when triggered'
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onClose={() => setLogsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle className="text-gray-800 font-semibold">
          📋 Execution Logs - {selectedExecution?.pipeline_name} #{selectedExecution?.build_number}
        </DialogTitle>
        <DialogContent>
          <Box className="mb-4">
            <Chip
              label={selectedExecution?.status}
              color={getStatusColor(selectedExecution?.status)}
              icon={getStatusIcon(selectedExecution?.status)}
            />
          </Box>
          <Paper className="p-4 bg-gray-900 text-green-400 font-mono text-sm max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap">
              {selectedExecution?.logs || 'No logs available'}
            </pre>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
