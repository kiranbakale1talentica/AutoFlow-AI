import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Build as PipelinesIcon,
  PlayArrow as ExecutionsIcon,
  CheckCircle as SuccessIcon,
  Error as FailureIcon,
  Schedule as RunningIcon,
  Cancel as CancelledIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Speed as PerformanceIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import apiService from '../services/api';

const MetricCard = ({ title, value, icon, color, subtitle, trend, loading }) => (
  <Card className="h-full transition-all duration-200 hover:shadow-lg border-l-4" style={{ borderLeftColor: color }}>
    <CardContent className="p-6">
      <Box className="flex items-center justify-between">
        <Box className="flex-1">
          <Typography color="textSecondary" gutterBottom variant="overline" className="font-medium text-xs">
            {title}
          </Typography>
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <Typography variant="h3" component="div" className="font-bold" style={{ color }}>
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="textSecondary" className="mt-2">
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box className="flex items-center mt-2">
              <TrendingUpIcon className={`text-sm mr-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
              <Typography variant="caption" className={trend > 0 ? 'text-green-500' : 'text-red-500'}>
                {trend > 0 ? '+' : ''}{trend}% from last week
              </Typography>
            </Box>
          )}
        </Box>
        <Box className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          {React.cloneElement(icon, { style: { color }, fontSize: 'large' })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const PipelineStatusCard = ({ pipeline, onClick }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'failure': return '#ef4444';
      case 'running': return '#f59e0b';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
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

  return (
    <Card 
      className="mb-3 transition-all duration-200 hover:shadow-md cursor-pointer"
      onClick={() => onClick && onClick(pipeline)}
    >
      <CardContent className="p-4">
        <Box className="flex items-center justify-between">
          <Box className="flex items-center space-x-3 flex-1">
            <Box className="w-10 h-10 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: pipeline.type === 'github' ? '#24292e20' : '#2684ff20' }}>
              <PipelinesIcon className={pipeline.type === 'github' ? 'text-gray-800' : 'text-blue-600'} />
            </Box>
            <Box className="flex-1">
              <Typography variant="subtitle1" className="font-medium mb-1">
                {pipeline.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" className="mb-2">
                {pipeline.type.toUpperCase()} • {pipeline.execution_count} executions
              </Typography>
              <Box className="flex items-center space-x-2">
                <Chip
                  label={pipeline.last_status || 'No executions'}
                  size="small"
                  icon={getStatusIcon(pipeline.last_status)}
                  style={{ 
                    backgroundColor: `${getStatusColor(pipeline.last_status)}20`,
                    color: getStatusColor(pipeline.last_status)
                  }}
                />
                {pipeline.last_execution && (
                  <Typography variant="caption" color="textSecondary">
                    {new Date(pipeline.last_execution).toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          <Box className="text-right">
            <Typography variant="caption" color="textSecondary">
              {pipeline.is_active ? 'Active' : 'Inactive'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [buildTrends, setBuildTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metricsResponse, pipelinesResponse, executionsResponse, trendsResponse] = await Promise.all([
        apiService.getDashboardMetrics(),
        apiService.getPipelines(),
        apiService.getExecutions(10), // Last 10 executions
        apiService.getBuildTrends(7), // Last 7 days
      ]);
      
      setMetrics(metricsResponse.data);
      setPipelines(pipelinesResponse.data);
      setExecutions(executionsResponse.data);
      setBuildTrends(trendsResponse.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up WebSocket connection for real-time updates
    const ws = apiService.createWebSocketConnection((data) => {
      console.log('Real-time update received:', data);
      // Refresh data when changes occur
      if (data.type === 'pipeline_created' || data.type === 'execution_created') {
        fetchDashboardData();
      }
    });

    // Cleanup WebSocket on unmount
    return () => {
      if (ws) {
        apiService.closeWebSocketConnection();
      }
    };
  }, []);

  if (loading) {
    return (
      <Box className="space-y-6">
        <LinearProgress />
        <Box className="flex items-center justify-center h-64">
          <Box className="text-center">
            <CircularProgress size={60} />
            <Typography variant="h6" className="mt-4 text-gray-600">
              Loading CI/CD Dashboard...
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="space-y-4">
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={fetchDashboardData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // Prepare chart data - only show if we have real data
  const hasData = metrics && !metrics.isEmpty && metrics.totalExecutions > 0;
  
  const statusData = hasData ? [
    { name: 'Success', value: Math.round((metrics?.successRate || 0) / 100 * (metrics?.totalExecutions || 0)), color: '#10b981' },
    { name: 'Failure', value: (metrics?.totalExecutions || 0) - Math.round((metrics?.successRate || 0) / 100 * (metrics?.totalExecutions || 0)), color: '#ef4444' },
  ] : [];

  const trendsData = buildTrends && buildTrends.length > 0 ? buildTrends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString(),
    builds: trend.total_builds,
    successful: trend.successful_builds,
    avgTime: Math.round(trend.avg_build_time || 0)
  })) : [];

  // Show empty state message if no pipelines are configured
  const showEmptyState = !loading && (!metrics || metrics.isEmpty || metrics.totalPipelines === 0);

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Box>
          <Typography variant="h4" className="font-bold text-gray-800 mb-2">
            CI/CD Pipeline Dashboard
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Real-time monitoring and analytics for your CI/CD pipelines
          </Typography>
        </Box>
        <IconButton 
          onClick={fetchDashboardData} 
          className="bg-blue-50 hover:bg-blue-100 text-blue-600"
          disabled={loading}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Empty State - Show when no pipelines are configured */}
      {showEmptyState && (
        <Card className="p-8">
          <CardContent className="text-center">
            <PipelinesIcon className="mx-auto text-gray-300 mb-4" style={{ fontSize: 64 }} />
            <Typography variant="h5" className="text-gray-600 mb-2">
              No Pipelines Configured
            </Typography>
            <Typography variant="body1" color="textSecondary" className="mb-4">
              Connect your GitHub account to start monitoring your CI/CD workflows
            </Typography>
            <Box className="flex justify-center space-x-4">
              <Button 
                variant="contained" 
                startIcon={<PipelinesIcon />}
                href="/pipelines"
                sx={{ 
                  background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #6a1b9a 100%)'
                  }
                }}
              >
                Add Pipelines
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<ExecutionsIcon />}
                href="/accounts"
              >
                Connect GitHub
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Show dashboard content only when we have data */}
      {!showEmptyState && (
        <>
          {/* Metrics Cards */}
          <Grid container spacing={3}>
            <Grid xs={12} sm={6} md={3}>
              <MetricCard
                title="Active Pipelines"
                value={metrics?.totalPipelines || 0}
                icon={<PipelinesIcon />}
                color="#3b82f6"
                subtitle="Configured pipelines"
                loading={loading}
              />
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Executions"
                value={metrics?.totalExecutions || 0}
                icon={<ExecutionsIcon />}
                color="#10b981"
                subtitle="All time builds"
                loading={loading}
              />
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <MetricCard
                title="Success Rate"
                value={`${metrics?.successRate || 0}%`}
                icon={<PerformanceIcon />}
                color="#f59e0b"
                subtitle="Build success ratio"
                loading={loading}
              />
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <MetricCard
                title="Avg Build Time"
                value={`${metrics?.avgBuildTime || 0}s`}
                icon={<TimerIcon />}
                color="#8b5cf6"
                subtitle="Average duration"
                loading={loading}
              />
            </Grid>
          </Grid>

          {/* Charts and Analytics */}
          <Grid container spacing={3}>
            <Grid xs={12} md={8}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <Typography variant="h6" className="font-semibold mb-4 text-gray-800">
                    📈 Build Trends (Last 7 Days)
                  </Typography>
                  <Box style={{ width: '100%', height: 300 }}>
                    {trendsData.length > 0 ? (
                      <ResponsiveContainer>
                        <LineChart data={trendsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="builds" stroke="#3b82f6" strokeWidth={2} name="Total Builds" />
                          <Line type="monotone" dataKey="successful" stroke="#10b981" strokeWidth={2} name="Successful" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box className="flex items-center justify-center h-full">
                        <Box className="text-center">
                          <TrendingUpIcon className="mx-auto text-gray-300 mb-2" style={{ fontSize: 48 }} />
                          <Typography variant="body1" color="textSecondary">
                            No build trends available
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Execute some pipelines to see trends
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid xs={12} md={4}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <Typography variant="h6" className="font-semibold mb-4 text-gray-800">
                    📊 Success vs Failure
                  </Typography>
                  <Box style={{ width: '100%', height: 320, padding: '8px' }}>
                    {statusData.length > 0 && hasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="40%"
                            outerRadius={75}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, name]} />
                          <Legend 
                            verticalAlign="bottom" 
                            height={40}
                            formatter={(value, entry) => `${value}: ${entry.payload.value}`}
                            wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box className="flex items-center justify-center h-full">
                        <Box className="text-center">
                          <PerformanceIcon className="mx-auto text-gray-300 mb-2" style={{ fontSize: 48 }} />
                          <Typography variant="body1" color="textSecondary">
                            No execution data
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Run some pipelines to see success metrics
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Pipeline Status and Recent Executions */}
          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <Typography variant="h6" className="font-semibold mb-4 text-gray-800">
                    🔧 Pipeline Status
                  </Typography>
                  {pipelines.length > 0 ? (
                    <Box className="space-y-3 max-h-96 overflow-y-auto">
                      {pipelines.slice(0, 5).map((pipeline) => (
                        <PipelineStatusCard 
                          key={pipeline.id} 
                          pipeline={pipeline}
                          onClick={(p) => console.log('Pipeline clicked:', p)}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Box className="text-center py-8">
                      <PipelinesIcon className="mx-auto text-gray-400 mb-2" style={{ fontSize: 48 }} />
                      <Typography variant="body1" color="textSecondary">
                        No pipelines configured
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Add your first pipeline to get started
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid xs={12} md={6}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <Typography variant="h6" className="font-semibold mb-4 text-gray-800">
                    ▶️ Recent Executions
                  </Typography>
                  {executions.length > 0 ? (
                    <Box className="space-y-3 max-h-96 overflow-y-auto">
                      {executions.slice(0, 5).map((execution) => (
                        <Card key={execution.id} className="border border-gray-200">
                          <CardContent className="p-3">
                            <Box className="flex items-center justify-between">
                              <Box className="flex-1">
                                <Typography variant="subtitle2" className="font-medium">
                                  {execution.pipeline_name} #{execution.build_number}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" className="mb-1">
                                  {execution.commit_message}
                                </Typography>
                                <Box className="flex items-center space-x-2">
                                  <Chip
                                    label={execution.status}
                                    size="small"
                                    color={execution.status === 'success' ? 'success' : execution.status === 'failure' ? 'error' : 'warning'}
                                  />
                                  {execution.build_time && (
                                    <Typography variant="caption" color="textSecondary">
                                      {execution.build_time}s
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              <Typography variant="caption" color="textSecondary">
                                {new Date(execution.created_at).toLocaleString()}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  ) : (
                    <Box className="text-center py-8">
                      <ExecutionsIcon className="mx-auto text-gray-400 mb-2" style={{ fontSize: 48 }} />
                      <Typography variant="body1" color="textSecondary">
                        No executions found
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Configure pipelines to see execution history
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
