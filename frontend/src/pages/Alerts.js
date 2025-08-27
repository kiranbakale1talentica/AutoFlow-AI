import React, { useState, useEffect } from 'react';
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
  TextField,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Notifications as AlertIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Science as TestIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import apiService from '../services/api';

export default function Alerts() {
  const [alertConfigs, setAlertConfigs] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    pipeline_id: '', 
    alert_type: 'email', 
    webhook_url: '', 
    email_address: '' 
  });
  const [testData, setTestData] = useState({ 
    alert_type: 'email', 
    webhook_url: '', 
    email_address: '', 
    message: 'Test notification from CI/CD Dashboard' 
  });

  const fetchAlertConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const [alertResponse, pipelineResponse] = await Promise.all([
        apiService.getAlertConfigs(),
        apiService.getPipelines()
      ]);
      setAlertConfigs(alertResponse.data);
      setPipelines(pipelineResponse.data);
    } catch (err) {
      console.error('Failed to fetch alert configs:', err);
      setError('Failed to load alert configurations. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.alert_type) {
      setError('Alert type is required');
      return;
    }
    if (!formData.email_address) {
      setError('Email address is required for email alerts');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.createAlertConfig(formData);
      
      setFormData({ pipeline_id: '', alert_type: 'email', webhook_url: '', email_address: '' });
      setOpen(false);
      setSuccess('Alert configuration saved successfully!');
      
      // Refresh the list
      await fetchAlertConfigs();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to save alert config:', err);
      setError(err.response?.data?.error || 'Failed to save alert configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestAlert = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!testData.alert_type) {
      setError('Alert type is required');
      return;
    }
    if (!testData.email_address) {
      setError('Email address is required for email alerts');
      return;
    }

    try {
      setTesting(true);
      setError(null);
      
      // Use simple email endpoint
      await apiService.testEmailSimple({
        email_address: testData.email_address,
        message: testData.message
      });
      
      setTestDialogOpen(false);
      setSuccess('Test email sent successfully! Check your email inbox.');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to send test alert:', err);
      if (err.response?.status === 401) {
        setError('Authentication required. Please login with GitHub first.');
      } else {
        setError(err.response?.data?.error || 'Failed to send test alert');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ pipeline_id: '', alert_type: 'email', webhook_url: '', email_address: '' });
    setError(null);
  };

  const handleTestClose = () => {
    setTestDialogOpen(false);
    setTestData({ alert_type: 'email', webhook_url: '', email_address: '', message: 'Test notification from CI/CD Dashboard' });
    setError(null);
  };

  const handleDeleteAlert = async (id) => {
    if (!window.confirm('Are you sure you want to delete this alert configuration?')) {
      return;
    }

    try {
      setError(null);
      await apiService.deleteAlertConfig(id);
      setSuccess('Alert configuration deleted successfully!');
      
      // Refresh the list
      await fetchAlertConfigs();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to delete alert config:', err);
      setError(err.response?.data?.error || 'Failed to delete alert configuration');
    }
  };

  const getPipelineName = (pipelineId) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    return pipeline ? pipeline.name : 'Unknown Pipeline';
  };

  const getAlertIcon = () => {
    return <EmailIcon />;
  };

  const getAlertColor = () => {
    return '#ea4335';
  };

  useEffect(() => {
    fetchAlertConfigs();
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
            🔔 Alert Management
          </Typography>
          <Typography variant="body1" className="text-gray-600">
            Configure email notifications for your CI/CD pipelines
          </Typography>
        </Box>
        <Box className="flex items-center space-x-3">
          <IconButton 
            onClick={fetchAlertConfigs} 
            className="bg-gray-50 hover:bg-gray-100 text-gray-600"
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<TestIcon />}
            onClick={() => setTestDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Test Email
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Alert
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={fetchAlertConfigs}>
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

      {/* Overview Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={12}>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200">
            <CardContent className="p-6">
              <Box className="flex items-center space-x-4">
                <EmailIcon className="text-4xl" style={{ color: '#ea4335' }} />
                <Box className="flex-1">
                  <Typography variant="h6" className="font-semibold text-gray-800 mb-1">
                    Email Notifications
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 mb-3">
                    Get instant email alerts for pipeline events
                  </Typography>
                  <Typography variant="body2" className="text-gray-700">
                    Configure email addresses to receive instant notifications when your pipelines start, succeed, fail, or get stopped.
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setFormData({ ...formData, alert_type: 'email' });
                    setOpen(true);
                  }}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  Setup Email Alert
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Configurations Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" className="font-semibold text-gray-800 mb-4">
            📋 Configured Alerts ({alertConfigs.length})
          </Typography>
          
          {alertConfigs.length === 0 ? (
            <Box className="text-center py-12">
              <AlertIcon className="text-6xl text-gray-300 mb-4" />
              <Typography variant="h6" className="text-gray-500 mb-2">
                No Alert Configurations
              </Typography>
              <Typography variant="body2" className="text-gray-400 mb-4">
                Set up your first alert to get notified about pipeline events
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Your First Alert
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} className="shadow-sm">
              <Table>
                <TableHead className="bg-gray-50">
                  <TableRow>
                    <TableCell className="font-semibold">Type</TableCell>
                    <TableCell className="font-semibold">Pipeline</TableCell>
                    <TableCell className="font-semibold">Email Address</TableCell>
                    <TableCell className="font-semibold">Status</TableCell>
                    <TableCell className="font-semibold">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alertConfigs.map((config) => (
                    <TableRow key={config.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Box className="flex items-center space-x-2">
                          {getAlertIcon()}
                          <Chip
                            label="Email"
                            size="small"
                            style={{ 
                              backgroundColor: `${getAlertColor()}20`,
                              color: getAlertColor()
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="font-medium">
                          {config.pipeline_id ? getPipelineName(config.pipeline_id) : 'All Pipelines'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-700">
                          {config.email_address || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={config.is_enabled ? 'Active' : 'Inactive'}
                          size="small"
                          color={config.is_enabled ? 'success' : 'default'}
                          icon={config.is_enabled ? <CheckIcon /> : <ErrorIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleDeleteAlert(config.id)}
                          size="small"
                          className="text-red-600 hover:bg-red-50"
                          title="Delete alert"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Alert Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle className="text-gray-800 font-semibold">
          🔔 Add New Email Alert
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            <FormControl fullWidth variant="outlined" className="mb-4">
              <InputLabel>Select Pipeline (Optional)</InputLabel>
              <Select
                value={formData.pipeline_id}
                onChange={(e) => setFormData({ ...formData, pipeline_id: e.target.value })}
                label="Select Pipeline (Optional)"
              >
                <MenuItem value="">
                  <em>All Pipelines</em>
                </MenuItem>
                {pipelines.map((pipeline) => (
                  <MenuItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined" className="mb-4">
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={formData.alert_type}
                onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })}
                label="Alert Type"
                required
              >
                <MenuItem value="email">
                  <Box className="flex items-center space-x-2">
                    <EmailIcon />
                    <span>Email</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              margin="dense"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={formData.email_address}
              onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
              required
              placeholder="admin@company.com"
              helperText="Enter the email address to receive notifications"
            />
          </DialogContent>
          <DialogActions className="p-6 pt-2">
            <Button onClick={handleClose} color="secondary">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? <CircularProgress size={20} /> : 'Save Alert'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Test Alert Dialog */}
      <Dialog open={testDialogOpen} onClose={handleTestClose} maxWidth="sm" fullWidth>
        <DialogTitle className="text-gray-800 font-semibold">
          🧪 Test Email Alert
        </DialogTitle>
        <form onSubmit={handleTestAlert}>
          <DialogContent className="space-y-4">
            <TextField
              margin="dense"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={testData.email_address}
              onChange={(e) => setTestData({ ...testData, email_address: e.target.value })}
              required
              placeholder="test@company.com"
              helperText="Enter the email address to send a test notification"
            />
            
            <TextField
              margin="dense"
              label="Test Message"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={testData.message}
              onChange={(e) => setTestData({ ...testData, message: e.target.value })}
              placeholder="This is a test notification from the CI/CD Dashboard"
              helperText="Customize the test message (optional)"
            />
          </DialogContent>
          <DialogActions className="p-6 pt-2">
            <Button onClick={handleTestClose} color="secondary">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={testing}
              className="bg-green-600 hover:bg-green-700"
            >
              {testing ? <CircularProgress size={20} /> : 'Send Test Email'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
