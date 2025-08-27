import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

export default function UserProfile() {
  const { user, login } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });

  const handleEdit = () => {
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditing(false);
    setProfileData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || ''
    });
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!profileData.firstName || !profileData.lastName) {
      setError('First name and last name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Update the user context with new data
      login(result.user);
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <Box className="mb-6">
        <Typography variant="h4" className="font-bold text-gray-800 mb-2">
          User Profile
        </Typography>
        <Typography variant="body1" className="text-gray-600">
          Manage your account information and preferences
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Profile Card */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent className="p-6">
              {/* Profile Header */}
              <Box className="flex items-center mb-6">
                <Avatar
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                    mr: 3
                  }}
                >
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5" className="font-semibold">
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Box className="flex items-center mt-1">
                    <EmailIcon className="text-gray-500 mr-1" fontSize="small" />
                    <Typography variant="body2" className="text-gray-600">
                      {user.email}
                    </Typography>
                  </Box>
                  <Box className="mt-2">
                    {user.role === 'admin' ? (
                      <Chip 
                        icon={<AdminIcon />} 
                        label="Administrator" 
                        color="primary" 
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Chip 
                        icon={<PersonIcon />} 
                        label="User" 
                        color="default" 
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider className="my-4" />

              {/* Profile Form */}
              <Box>
                <Box className="flex justify-between items-center mb-4">
                  <Typography variant="h6" className="font-semibold">
                    Personal Information
                  </Typography>
                  {!editing ? (
                    <Button
                      startIcon={<EditIcon />}
                      onClick={handleEdit}
                      variant="outlined"
                      size="small"
                    >
                      Edit Profile
                    </Button>
                  ) : null}
                </Box>

                {/* Alerts */}
                {error && (
                  <Alert severity="error" className="mb-4">
                    {error}
                  </Alert>
                )}
                
                {success && (
                  <Alert severity="success" className="mb-4">
                    {success}
                  </Alert>
                )}

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      disabled={!editing || loading}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      disabled={!editing || loading}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={profileData.email}
                      disabled={true}
                      variant="outlined"
                      helperText="Email address cannot be changed"
                    />
                  </Grid>
                </Grid>

                {editing && (
                  <Box className="flex justify-end gap-2 mt-4">
                    <Button
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={loading}
                      variant="outlined"
                    >
                      Cancel
                    </Button>
                    <Button
                      startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                      onClick={handleSave}
                      disabled={loading}
                      variant="contained"
                      sx={{ 
                        background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1565c0 0%, #6a1b9a 100%)'
                        }
                      }}
                    >
                      Save Changes
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Info Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent className="p-6">
              <Typography variant="h6" className="font-semibold mb-4">
                Account Information
              </Typography>
              
              <Box className="space-y-4">
                <Box>
                  <Typography variant="body2" className="text-gray-500 mb-1">
                    User ID
                  </Typography>
                  <Typography variant="body1" className="font-mono">
                    #{user.id}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" className="text-gray-500 mb-1">
                    Account Type
                  </Typography>
                  <Typography variant="body1">
                    {user.role === 'admin' ? 'Administrator' : 'Standard User'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" className="text-gray-500 mb-1">
                    Email Verified
                  </Typography>
                  <Chip 
                    label={user.email_verified ? "Verified" : "Pending"} 
                    color={user.email_verified ? "success" : "warning"}
                    size="small"
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" className="text-gray-500 mb-1">
                    Account Status
                  </Typography>
                  <Chip 
                    label={user.is_active ? "Active" : "Inactive"} 
                    color={user.is_active ? "success" : "error"}
                    size="small"
                  />
                </Box>
              </Box>

              <Divider className="my-4" />
              
              {/* AutoFlow AI Branding */}
              <Box className="text-center">
                <Logo size="small" />
                <Typography variant="caption" className="text-gray-500 mt-2 block">
                  Intelligent CI/CD Pipeline Dashboard
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
