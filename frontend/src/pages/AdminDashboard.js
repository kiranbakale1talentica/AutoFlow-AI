import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  Verified as VerifiedIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [roleDialog, setRoleDialog] = useState({ open: false, user: null });
  const [addUserDialog, setAddUserDialog] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ element: null, user: null });
  
  // New user form
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });

  // Statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    verifiedUsers: 0
  });

  // Fetch users and stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, statsResponse] = await Promise.all([
        fetch('http://localhost:5000/api/auth/admin/users', {
          credentials: 'include'
        }),
        fetch('http://localhost:5000/api/auth/admin/stats', {
          credentials: 'include'
        })
      ]);

      if (!usersResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const usersData = await usersResponse.json();
      const statsData = await statsResponse.json();
      
      setUsers(usersData.users);
      setStats(statsData);
    } catch (error) {
      setError('Failed to load admin data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/auth/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setSuccess('User deleted successfully');
      setDeleteDialog({ open: false, user: null });
      fetchData();
    } catch (error) {
      setError('Failed to delete user: ' + error.message);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      const response = await fetch(`http://localhost:5000/api/auth/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      setSuccess('User role updated successfully');
      setRoleDialog({ open: false, user: null });
      fetchData();
    } catch (error) {
      setError('Failed to update user role: ' + error.message);
    }
  };

  const handleToggleStatus = async (userId, isActive) => {
    try {
      const response = await fetch(`http://localhost:5000/api/auth/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      setSuccess(`User ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (error) {
      setError('Failed to update user status: ' + error.message);
    }
  };

  const handleAddUser = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create user');
      }

      setSuccess('User created successfully');
      setAddUserDialog(false);
      setNewUser({ email: '', firstName: '', lastName: '', role: 'user' });
      fetchData();
    } catch (error) {
      setError('Failed to create user: ' + error.message);
    }
  };

  if (!isAdmin) {
    return (
      <Box className="p-6">
        <Alert severity="error">
          Access denied. Administrator privileges required.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box className="p-6">
      {/* Header */}
      <Box className="mb-6">
        <Typography variant="h4" className="font-bold text-gray-800 mb-2">
          Admin Dashboard
        </Typography>
        <Typography variant="body1" className="text-gray-600">
          Manage users and system administration
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" className="mb-4" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} className="mb-6">
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box className="flex items-center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.totalUsers}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box className="flex items-center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.activeUsers}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box className="flex items-center">
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <AdminIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.adminUsers}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Administrators
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box className="flex items-center">
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <VerifiedIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.verifiedUsers}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Verified
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Table */}
      <Paper elevation={2}>
        <Box className="p-4 border-b flex justify-between items-center">
          <Typography variant="h6" className="font-semibold">
            User Management
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setAddUserDialog(true)}
            sx={{ 
              background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #6a1b9a 100%)'
              }
            }}
          >
            Add User
          </Button>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Verified</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((userData) => (
                <TableRow key={userData.id}>
                  <TableCell>
                    <Box className="flex items-center">
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {userData.first_name?.[0]}{userData.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" className="font-medium">
                          {userData.first_name} {userData.last_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ID: {userData.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{userData.email}</TableCell>
                  <TableCell>
                    <Chip
                      icon={userData.role === 'admin' ? <AdminIcon /> : <PersonIcon />}
                      label={userData.role === 'admin' ? 'Admin' : 'User'}
                      color={userData.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={userData.is_active ? 'Active' : 'Inactive'}
                      color={userData.is_active ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={userData.email_verified ? 'Verified' : 'Pending'}
                      color={userData.email_verified ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => setMenuAnchor({ element: e.currentTarget, user: userData })}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor.element}
        open={Boolean(menuAnchor.element)}
        onClose={() => setMenuAnchor({ element: null, user: null })}
      >
        <MenuItem
          onClick={() => {
            setRoleDialog({ open: true, user: menuAnchor.user });
            setMenuAnchor({ element: null, user: null });
          }}
        >
          <EditIcon className="mr-2" fontSize="small" />
          Change Role
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleToggleStatus(menuAnchor.user?.id, menuAnchor.user?.is_active);
            setMenuAnchor({ element: null, user: null });
          }}
        >
          {menuAnchor.user?.is_active ? <BlockIcon className="mr-2" fontSize="small" /> : <CheckCircleIcon className="mr-2" fontSize="small" />}
          {menuAnchor.user?.is_active ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteDialog({ open: true, user: menuAnchor.user });
            setMenuAnchor({ element: null, user: null });
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon className="mr-2" fontSize="small" />
          Delete User
        </MenuItem>
      </Menu>

      {/* Add User Dialog */}
      <Dialog open={addUserDialog} onClose={() => setAddUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 mt-2">
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="First Name"
              value={newUser.firstName}
              onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={newUser.lastName}
              onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
            />
            <TextField
              fullWidth
              select
              label="Role"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserDialog(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained">Create User</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{deleteDialog.user?.first_name} {deleteDialog.user?.last_name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>Cancel</Button>
          <Button 
            onClick={() => handleDeleteUser(deleteDialog.user?.id)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ open: false, user: null })}>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          <Typography className="mb-4">
            Change role for "{roleDialog.user?.first_name} {roleDialog.user?.last_name}":
          </Typography>
          <Box className="space-y-2">
            <Button
              fullWidth
              variant={roleDialog.user?.role === 'user' ? 'contained' : 'outlined'}
              onClick={() => handleChangeRole(roleDialog.user?.id, 'user')}
              startIcon={<PersonIcon />}
            >
              User
            </Button>
            <Button
              fullWidth
              variant={roleDialog.user?.role === 'admin' ? 'contained' : 'outlined'}
              onClick={() => handleChangeRole(roleDialog.user?.id, 'admin')}
              startIcon={<AdminIcon />}
            >
              Administrator
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog({ open: false, user: null })}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
