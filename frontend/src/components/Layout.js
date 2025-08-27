import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Build as PipelinesIcon,
  PlayArrow as ExecutionsIcon,
  Settings as AlertsIcon,
  ChevronLeft as ChevronLeftIcon,
  AccountCircle as AccountsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import NotificationCenter from './NotificationCenter';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Pipelines', icon: <PipelinesIcon />, path: '/pipelines' },
  { text: 'Executions', icon: <ExecutionsIcon />, path: '/executions' },
  { text: 'Alerts', icon: <AlertsIcon />, path: '/alerts' },
  { text: 'Accounts', icon: <AccountsIcon />, path: '/accounts' },
];

export default function Layout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState(!isMobile);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
  };

  const handleMenuClick = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
  };

  const drawer = (
    <div>
      <Toolbar className="flex items-center justify-between px-4">
        <Box>
          <Logo size="medium" />
        </Box>
        {!isMobile && (
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      <List className="px-2">
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding className="mb-1">
            <ListItemButton
              onClick={() => handleMenuClick(item.path)}
              className={`rounded-lg transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'hover:bg-gray-50'
              }`}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon
                className={`min-w-0 mr-3 ${
                  location.pathname === item.path ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                className={location.pathname === item.path ? 'text-blue-600 font-medium' : 'text-gray-700'}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
          ml: { sm: `${open ? drawerWidth : 0}px` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
        className="bg-white shadow-sm border-b border-gray-200"
        color="inherit"
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: open ? 'none' : 'block' } }}
            className="text-gray-700"
          >
            <MenuIcon />
          </IconButton>
          <Box>
            <Logo size="small" />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Box className="flex items-center space-x-4">
            <NotificationCenter />
            
            {/* User Menu */}
            <Box className="flex items-center space-x-2">
              <Box className="text-right hidden sm:block">
                <Typography variant="body2" className="text-gray-700 font-medium">
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Box className="flex items-center justify-end space-x-1">
                  <Typography variant="caption" className="text-gray-500">
                    {user?.email}
                  </Typography>
                  {isAdmin && (
                    <Chip 
                      icon={<AdminIcon />} 
                      label="Admin" 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
              
              <IconButton
                onClick={handleUserMenuOpen}
                className="text-gray-700"
              >
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: 'primary.main',
                    fontSize: '0.875rem'
                  }}
                >
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </Avatar>
              </IconButton>
              
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <Box className="px-4 py-2">
                  <Typography variant="subtitle2" className="font-medium">
                    {user?.firstName} {user?.lastName}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500">
                    {user?.email}
                  </Typography>
                  {isAdmin && (
                    <Chip 
                      icon={<AdminIcon />} 
                      label="Administrator" 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      className="mt-1"
                    />
                  )}
                </Box>
                <Divider />
                <MenuItem 
                  onClick={() => {
                    handleUserMenuClose();
                    navigate('/profile');
                  }}
                >
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  Profile
                </MenuItem>
                {isAdmin && (
                  <MenuItem 
                    onClick={() => {
                      handleUserMenuClose();
                      navigate('/admin');
                    }}
                  >
                    <ListItemIcon>
                      <AdminIcon fontSize="small" />
                    </ListItemIcon>
                    Admin Dashboard
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: open ? drawerWidth : 0 }, flexShrink: { sm: 0 } }}
        aria-label="navigation"
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          open={isMobile ? mobileOpen : open}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
        className="min-h-screen bg-gray-50"
      >
        <Toolbar />
        <Box className="p-4 sm:p-6">
          {children}
        </Box>
      </Box>
    </Box>
  );
}
