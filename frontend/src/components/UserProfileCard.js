import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Divider,
  Stack
} from '@mui/material';
import {
  Person as PersonIcon,
  GitHub as GitHubIcon,
  AdminPanelSettings as AdminIcon,
  ExitToApp as LogoutIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const UserProfileCard = () => {
  const { 
    user, 
    githubUser, 
    isAuthenticated, 
    isGithubConnected, 
    isAdmin, 
    logout, 
    connectGithub, 
    disconnectGithub 
  } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          User Profile
        </Typography>
        
        {/* Main App User Info */}
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            <PersonIcon />
          </Avatar>
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight="bold">
              {user.first_name} {user.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {isAdmin && (
                <Chip 
                  icon={<AdminIcon />} 
                  label="Administrator" 
                  color="primary" 
                  size="small" 
                />
              )}
              <Chip 
                label="Verified" 
                color="success" 
                size="small" 
              />
            </Stack>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* GitHub Integration Status */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <GitHubIcon sx={{ mr: 1, color: isGithubConnected ? 'success.main' : 'text.secondary' }} />
            <Box>
              <Typography variant="subtitle2">
                GitHub Integration
              </Typography>
              {isGithubConnected ? (
                <Typography variant="body2" color="text.secondary">
                  Connected as @{githubUser.username}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Not connected
                </Typography>
              )}
            </Box>
          </Box>
          
          {isGithubConnected ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<UnlinkIcon />}
              onClick={disconnectGithub}
              size="small"
            >
              Disconnect
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<LinkIcon />}
              onClick={connectGithub}
              size="small"
            >
              Connect GitHub
            </Button>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Logout Button */}
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={logout}
          fullWidth
        >
          Logout
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;
