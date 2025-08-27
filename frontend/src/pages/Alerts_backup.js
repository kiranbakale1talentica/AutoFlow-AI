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
import authService from '../services/authService';

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
  Chat as SlackIcon,
  Science as TestIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import apiService from '../services/api';
import authService from '../services/authService';

export default function Alerts() {
  const [alertConfigs, setAlertConfigs] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [open, setOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    pipeline_id: '', 
    alert_type: 'slack', 
    webhook_url: '',
    email_address: ''
  });
  const [testData, setTestData] = useState({ 
    alert_type: 'slack', 
    webhook_url: '',
    email_address: '',
    message: 'Test notification from CI/CD Dashboard'
  });
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchAlertConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const [alertsResponse, pipelinesResponse] = await Promise.all([
        apiService.getAlertConfigs(),
        apiService.getPipelines()
      ]);
      setAlertConfigs(alertsResponse.data);
      setPipelines(pipelinesResponse.data);
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
      setSuccess('Alert configuration created successfully');
      fetchAlertConfigs();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
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
        setError('Authentication required. Please login with GitHub first to test alerts.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send test alert');
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
      await apiService.deleteAlertConfig(id);
      setSuccess('Alert configuration deleted successfully');
      fetchAlertConfigs();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to delete alert config:', err);
      setError(err.response?.data?.error || 'Failed to delete alert configuration');
    }
  };

  const getAlertIcon = (type) => {
    return type === 'email' ? <EmailIcon /> : <SlackIcon />;
  };

  const getAlertColor = (type) => {
    return type === 'email' ? '#ea4335' : '#4a154b';
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
          <Typography variant="body1" color="textSecondary">
            Configure notifications for pipeline events
          </Typography>
        </Box>
        <Box className="flex items-center space-x-2">
          <IconButton 
            onClick={fetchAlertConfigs} 
            className="bg-gray-50 hover:bg-gray-100 text-gray-600"
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<TestIcon />}
            onClick={() => setTestDialogOpen(true)}
            className="mr-2"
          >
            Test Alert
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

      {/* Success Alert */}
      {success && (
        <Alert 
          severity="success" 
          onClose={() => setSuccess(null)}
          icon={<CheckIcon />}
        >
          {success}
        </Alert>
      )}

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

      {/* Quick Setup Cards */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <Box className="flex items-center space-x-3 mb-4">
                <SlackIcon className="text-4xl" style={{ color: '#4a154b' }} />
                <Box>
                  <Typography variant="h6" className="font-semibold">
                    Slack Notifications
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Get real-time alerts in your Slack channels
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" className="mb-4">
                Configure Slack webhook URLs to receive instant notifications when your pipelines succeed, fail, or require attention.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setFormData({ ...formData, alert_type: 'slack' });
                  setOpen(true);
                }}
                style={{ backgroundColor: '#4a154b' }}
              >
                Setup Slack Alert
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="p-6">
              <Box className="flex items-center space-x-3 mb-4">
                <EmailIcon className="text-4xl" style={{ color: '#ea4335' }} />
                <Box>
                  <Typography variant="h6" className="font-semibold">
                    Email Notifications
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Receive detailed reports via email
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" className="mb-4">
                Set up email notifications to get comprehensive build reports and failure details delivered to your inbox.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setFormData({ ...formData, alert_type: 'email' });
                  setOpen(true);
                }}
                style={{ backgroundColor: '#ea4335' }}
              >
                Setup Email Alert
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Configurations Table */}
      <Card>
        <CardContent className="p-0">
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold text-gray-700">Alert Type</TableCell>
                  <TableCell className="font-semibold text-gray-700">Pipeline</TableCell>
                  <TableCell className="font-semibold text-gray-700">Configuration</TableCell>
                  <TableCell className="font-semibold text-gray-700">Status</TableCell>
                  <TableCell className="font-semibold text-gray-700">Created</TableCell>
                  <TableCell className="font-semibold text-gray-700">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alertConfigs.length > 0 ? (
                  alertConfigs.map((config) => (
                    <TableRow key={config.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Box className="flex items-center space-x-3">
                          <Box 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${getAlertColor(config.alert_type)}20` }}
                          >
                            {React.cloneElement(getAlertIcon(config.alert_type), { 
                              className: "text-sm",
                              style: { color: getAlertColor(config.alert_type) }
                            })}
                          </Box>
                          <Typography variant="body2" className="font-medium capitalize">
                            {config.alert_type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {config.pipeline_name || 'All Pipelines'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary" className="max-w-xs truncate">
                          {config.webhook_url || config.email_address}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={config.is_enabled ? 'Enabled' : 'Disabled'} 
                          color={config.is_enabled ? 'success' : 'default'}
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(config.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAlert(config.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <AlertIcon className="mx-auto text-gray-400 mb-2" style={{ fontSize: 48 }} />
                      <Typography variant="body1" color="textSecondary">
                        No alert configurations found
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setOpen(true)}
                        className="mt-2"
                      >
                        Add First Alert
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Alert Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle className="text-gray-800 font-semibold">
          🔔 Add New Alert Configuration
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            <FormControl fullWidth variant="outlined" className="mb-4">
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={formData.alert_type}
                onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })}
                label="Alert Type"
              >
                <MenuItem value="slack">
                  <Box className="flex items-center space-x-2">
                    <SlackIcon />
                    <span>Slack</span>
                  </Box>
                </MenuItem>
                <MenuItem value="email">
                  <Box className="flex items-center space-x-2">
                    <EmailIcon />
                    <span>Email</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined" className="mb-4">
              <InputLabel>Pipeline (Optional)</InputLabel>
              <Select
                value={formData.pipeline_id}
                onChange={(e) => setFormData({ ...formData, pipeline_id: e.target.value })}
                label="Pipeline (Optional)"
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

            {formData.alert_type === 'slack' && (
              <TextField
                margin="dense"
                label="Slack Webhook URL"
                type="url"
                fullWidth
                variant="outlined"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                required
                helperText="Get this from your Slack app's Incoming Webhooks settings"
                placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
              />
            )}

            {formData.alert_type === 'email' && (
              <TextField
                margin="dense"
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                value={formData.email_address}
                onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                required
                helperText="Email address to receive notifications"
                placeholder="devops@company.com"
              />
            )}
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
              {submitting ? <CircularProgress size={20} /> : 'Add Alert'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Test Alert Dialog */}
      <Dialog open={testDialogOpen} onClose={handleTestClose} maxWidth="sm" fullWidth>
        <DialogTitle className="text-gray-800 font-semibold">
          🧪 Test Alert Notification
        </DialogTitle>
        <form onSubmit={handleTestAlert}>
          <DialogContent className="space-y-4">
            <FormControl fullWidth variant="outlined" className="mb-4">
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={testData.alert_type}
                onChange={(e) => setTestData({ ...testData, alert_type: e.target.value })}
                label="Alert Type"
              >
                <MenuItem value="slack">
                  <Box className="flex items-center space-x-2">
                    <SlackIcon />
                    <span>Slack</span>
                  </Box>
                </MenuItem>
                <MenuItem value="email">
                  <Box className="flex items-center space-x-2">
                    <EmailIcon />
                    <span>Email</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {testData.alert_type === 'slack' && (
              <TextField
                margin="dense"
                label="Slack Webhook URL"
                type="url"
                fullWidth
                variant="outlined"
                value={testData.webhook_url}
                onChange={(e) => setTestData({ ...testData, webhook_url: e.target.value })}
                required
                placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
              />
            )}

            {testData.alert_type === 'email' && (
              <TextField
                margin="dense"
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                value={testData.email_address}
                onChange={(e) => setTestData({ ...testData, email_address: e.target.value })}
                required
                placeholder="devops@company.com"
              />
            )}

            <TextField
              margin="dense"
              label="Test Message"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={testData.message}
              onChange={(e) => setTestData({ ...testData, message: e.target.value })}
              helperText="Custom message for the test notification"
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
              className="bg-orange-600 hover:bg-orange-700"
            >
              {testing ? <CircularProgress size={20} /> : 'Send Test Alert'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
