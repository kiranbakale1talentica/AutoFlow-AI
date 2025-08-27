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
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import apiService from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getUsers();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiService.createUser(formData);
      setFormData({ name: '', email: '' });
      setOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ name: '', email: '' });
    setError(null);
  };

  useEffect(() => {
    fetchUsers();
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
            Users Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage users in your application
          </Typography>
        </Box>
        <Box className="flex items-center space-x-2">
          <IconButton 
            onClick={fetchUsers} 
            className="bg-gray-50 hover:bg-gray-100 text-gray-600"
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={fetchUsers}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold text-gray-700">ID</TableCell>
                  <TableCell className="font-semibold text-gray-700">Name</TableCell>
                  <TableCell className="font-semibold text-gray-700">Email</TableCell>
                  <TableCell className="font-semibold text-gray-700">Created At</TableCell>
                  <TableCell className="font-semibold text-gray-700">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">#{user.id}</TableCell>
                      <TableCell>
                        <Box className="flex items-center space-x-3">
                          <Box className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <PersonIcon className="text-blue-600 text-sm" />
                          </Box>
                          <Typography variant="body2" className="font-medium">
                            {user.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box className="flex items-center space-x-2">
                          <EmailIcon className="text-gray-400 text-sm" />
                          <Typography variant="body2" color="textSecondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(user.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label="Active" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <PersonIcon className="mx-auto text-gray-400 mb-2" style={{ fontSize: 48 }} />
                      <Typography variant="body1" color="textSecondary">
                        No users found
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setOpen(true)}
                        className="mt-2"
                      >
                        Add First User
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle className="text-gray-800 font-semibold">
          Add New User
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            <TextField
              autoFocus
              margin="dense"
              label="Full Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mb-4"
            />
            <TextField
              margin="dense"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
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
              {submitting ? <CircularProgress size={20} /> : 'Add User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
