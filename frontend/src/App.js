import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress } from '@mui/material';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Pipelines from './pages/Pipelines';
import Executions from './pages/Executions';
import Alerts from './pages/Alerts';
import Accounts from './pages/Accounts';
import UserProfile from './pages/UserProfile';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#7b1fa2',
      light: '#ba68c8',
      dark: '#6a1b9a',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <CircularProgress size={60} sx={{ color: 'white' }} />
      </Box>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// App Content Component
const AppContent = () => {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <CircularProgress size={60} sx={{ color: 'white' }} />
      </Box>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/" replace /> : 
            <LoginPage onLoginSuccess={login} />
          } 
        />
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/pipelines" element={<Pipelines />} />
                  <Route path="/executions" element={<Executions />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box id="root" className="min-h-screen bg-gray-50">
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Box>
    </ThemeProvider>
  );
}

export default App;
