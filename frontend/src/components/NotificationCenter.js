import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
  Divider,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  Build as BuildIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { createWebSocketConnection, closeWebSocketConnection } from '../services/api';

const NotificationCenter = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load notifications from localStorage
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        // Ensure parsed data is an array
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
        } else {
          console.warn('Invalid notifications data in localStorage, resetting...');
          localStorage.removeItem('notifications');
          setNotifications([]);
          setUnreadCount(0);
        }
      } catch (error) {
        console.error('Error parsing notifications from localStorage:', error);
        localStorage.removeItem('notifications');
        setNotifications([]);
        setUnreadCount(0);
      }
    }

    // Set up WebSocket connection for real-time notifications
    let ws = null;
    try {
      ws = createWebSocketConnection((data) => {
        handleWebSocketMessage(data);
      });
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }

    return () => {
      if (ws) {
        closeWebSocketConnection();
      }
    };
  }, []);

  const handleWebSocketMessage = (data) => {
    let notificationMessage = '';
    let type = 'info';
    let iconName = 'InfoIcon';

    switch (data.type) {
      case 'execution_created':
        notificationMessage = `Pipeline "${data.data.pipeline_name}" started`;
        type = 'info';
        iconName = 'BuildIcon';
        break;
      case 'execution_updated':
        if (data.data.status === 'success') {
          notificationMessage = `Pipeline "${data.data.pipeline_name}" completed successfully`;
          type = 'success';
          iconName = 'SuccessIcon';
        } else if (data.data.status === 'failure') {
          notificationMessage = `Pipeline "${data.data.pipeline_name}" failed`;
          type = 'error';
          iconName = 'ErrorIcon';
        } else if (data.data.status === 'stopped') {
          notificationMessage = `Pipeline "${data.data.pipeline_name}" was stopped`;
          type = 'warning';
          iconName = 'WarningIcon';
        } else {
          notificationMessage = `Pipeline "${data.data.pipeline_name}" status: ${data.data.status}`;
          type = 'info';
          iconName = 'InfoIcon';
        }
        break;
      case 'pipeline_created':
        notificationMessage = `New pipeline "${data.data.name}" was created`;
        type = 'success';
        iconName = 'SuccessIcon';
        break;
      case 'pipeline_deleted':
        notificationMessage = `Pipeline "${data.data.name}" was deleted`;
        type = 'warning';
        iconName = 'WarningIcon';
        break;
      default:
        notificationMessage = data.message || 'New notification';
        type = 'info';
        iconName = 'InfoIcon';
    }

    const newNotification = {
      id: Date.now() + Math.random(),
      message: notificationMessage,
      type: type,
      iconName: iconName, // Store icon name instead of React element
      timestamp: new Date().toISOString(),
      read: false,
      data: data.data
    };

    setNotifications(prev => {
      try {
        const updated = [newNotification, ...prev].slice(0, 50); // Keep only latest 50
        localStorage.setItem('notifications', JSON.stringify(updated));
        return updated;
      } catch (error) {
        console.error('Error updating notifications:', error);
        return prev;
      }
    });

    setUnreadCount(prev => prev + 1);
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = (id) => {
    setNotifications(prev => {
      try {
        const updated = prev.map(n => 
          n.id === id ? { ...n, read: true } : n
        );
        localStorage.setItem('notifications', JSON.stringify(updated));
        return updated;
      } catch (error) {
        console.error('Error marking notification as read:', error);
        return prev;
      }
    });
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      try {
        const updated = prev.map(n => ({ ...n, read: true }));
        localStorage.setItem('notifications', JSON.stringify(updated));
        return updated;
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return prev;
      }
    });
    setUnreadCount(0);
  };

  const deleteNotification = (id, event) => {
    event.stopPropagation(); // Prevent triggering markAsRead
    setNotifications(prev => {
      try {
        const notification = prev.find(n => n.id === id);
        const updated = prev.filter(n => n.id !== id);
        localStorage.setItem('notifications', JSON.stringify(updated));
        
        // Update unread count if deleted notification was unread
        if (notification && !notification.read) {
          setUnreadCount(current => Math.max(0, current - 1));
        }
        
        return updated;
      } catch (error) {
        console.error('Error deleting notification:', error);
        return prev;
      }
    });
  };

  const clearAllNotifications = () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      localStorage.removeItem('notifications');
      handleClose();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'SuccessIcon':
        return <SuccessIcon fontSize="small" />;
      case 'ErrorIcon':
        return <ErrorIcon fontSize="small" />;
      case 'WarningIcon':
        return <WarningIcon fontSize="small" />;
      case 'BuildIcon':
        return <BuildIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      default: return '#2196f3';
    }
  };

  const getStatusChipColor = (type) => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'primary';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleClick} className="text-gray-600">
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 600 }
        }}
      >
        <Box className="p-4">
          <Box className="flex items-center justify-between mb-3">
            <Typography variant="h6" className="font-semibold">
              Notifications
            </Typography>
            <Box className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button size="small" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
              <IconButton size="small" onClick={clearAllNotifications}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <NotificationsIcon className="text-gray-400 mb-2" style={{ fontSize: 48 }} />
                <Typography variant="body2" color="textSecondary">
                  No notifications yet
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  You'll receive notifications about pipeline events here
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <List className="max-h-96 overflow-y-auto">
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    className={`rounded-lg mb-1 ${
                      !notification.read ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    sx={{ cursor: 'default' }}
                  >
                    <ListItemIcon>
                      <Box
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ 
                          backgroundColor: `${getStatusColor(notification.type)}20`,
                          color: getStatusColor(notification.type)
                        }}
                      >
                        {getIconComponent(notification.iconName)}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box className="flex items-start justify-between">
                          <Typography variant="body2" className="flex-1 mr-2">
                            {notification.message}
                          </Typography>
                          <Box className="flex items-center space-x-2">
                            <Box className="flex flex-col items-end space-y-1">
                              <Chip
                                size="small"
                                label={notification.type}
                                color={getStatusChipColor(notification.type)}
                                variant="outlined"
                              />
                              <Typography variant="caption" color="textSecondary">
                                {formatTimestamp(notification.timestamp)}
                              </Typography>
                            </Box>
                            <Box className="flex flex-col space-y-1">
                              {!notification.read && (
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  title="Mark as read"
                                >
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                              )}
                              <IconButton 
                                size="small" 
                                onClick={(e) => deleteNotification(notification.id, e)}
                                title="Delete notification"
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationCenter;
