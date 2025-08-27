import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import authService from '../services/authService';

const Accounts = () => {
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadConnectedAccounts();
  }, []);

  const loadConnectedAccounts = async () => {
    try {
      setLoading(true);
      const userData = await authService.checkAuthStatus();
      if (userData) {
        setConnectedAccounts([userData]); // For now, we only support one account
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError('Failed to load connected accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGitHub = (e) => {
    e.preventDefault();
    // Store current URL to redirect back after auth
    localStorage.setItem('redirectAfterAuth', window.location.pathname);
    window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/auth/github`;
  };

  const handleLogout = async (userId) => {
    try {
      setLoading(true);
      await authService.logout();
      setConnectedAccounts(connectedAccounts.filter(account => account.id !== userId));
      setSuccess('Successfully disconnected account');
      
      // Clear any stored redirect URL
      localStorage.removeItem('redirectAfterAuth');
    } catch (error) {
      setError('Failed to disconnect account');
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const username = urlParams.get('user');
    
    if (authStatus === 'success' && username) {
      setSuccess(`Successfully connected GitHub account: ${decodeURIComponent(username)}`);
      loadConnectedAccounts();
      
      // Get the stored redirect URL and navigate back if exists
      const redirectUrl = localStorage.getItem('redirectAfterAuth');
      if (redirectUrl) {
        localStorage.removeItem('redirectAfterAuth');
        window.history.replaceState({}, document.title, redirectUrl);
      } else {
        // Just clean up the URL if no redirect
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (authStatus === 'error') {
      setError('Failed to connect GitHub account. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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

      {/* Connected Accounts Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Connected Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Manage your connected version control and CI/CD platform accounts.
          </Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" my={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <List>
                {connectedAccounts.map((account) => (
                  <React.Fragment key={account.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar src={account.avatarUrl}>
                          <AccountIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={account.displayName || account.username}
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            GitHub • {account.email}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="disconnect"
                          onClick={() => handleLogout(account.id)}
                          disabled={loading}
                        >
                          <LogoutIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>

              {connectedAccounts.length === 0 && (
                <Box textAlign="center" py={4}>
                  <GitHubIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Connected Accounts
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Connect your GitHub account to get started with pipeline management.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<GitHubIcon />}
                    onClick={handleConnectGitHub}
                    size="large"
                    sx={{ backgroundColor: '#24292e', '&:hover': { backgroundColor: '#1a1e22' } }}
                  >
                    Connect GitHub Account
                  </Button>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add New Account Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Add New Account
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Connect additional accounts to manage multiple pipelines.
          </Typography>

          <List>
            <ListItem>
              <ListItemAvatar>
                <Avatar>
                  <GitHubIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="GitHub"
                secondary="Connect your GitHub account to import repositories and manage workflows"
              />
              <ListItemSecondaryAction>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleConnectGitHub}
                  disabled={loading}
                >
                  Connect
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Accounts;
