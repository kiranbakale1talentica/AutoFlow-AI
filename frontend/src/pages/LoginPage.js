import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Divider,
} from '@mui/material';
import { Email, Security, PersonAdd, Login as LoginIcon } from '@mui/icons-material';
import Logo from '../components/Logo';

export default function LoginPage({ onLoginSuccess }) {
  const [tabValue, setTabValue] = useState(0);
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Login form data
  const [loginData, setLoginData] = useState({
    email: '',
    otp: ''
  });

  // Signup form data
  const [signupData, setSignupData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    otp: ''
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setStep('email');
    setError('');
    setSuccess('');
  };

  const handleLoginEmailSubmit = async (e) => {
    e.preventDefault();
    if (!loginData.email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/login/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginData.email })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      setSuccess('OTP sent to your email. Please check your inbox.');
      setStep('otp');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginOTPSubmit = async (e) => {
    e.preventDefault();
    if (!loginData.otp) {
      setError('OTP is required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/login/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: loginData.email, 
          otp: loginData.otp 
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Invalid OTP');
      }

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => onLoginSuccess(result.user), 1000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupEmailSubmit = async (e) => {
    e.preventDefault();
    if (!signupData.email || !signupData.firstName || !signupData.lastName) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/signup/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: signupData.email,
          firstName: signupData.firstName,
          lastName: signupData.lastName
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      setSuccess('OTP sent to your email. Please check your inbox.');
      setStep('otp');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupOTPSubmit = async (e) => {
    e.preventDefault();
    if (!signupData.otp) {
      setError('OTP is required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/signup/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: signupData.email,
          firstName: signupData.firstName,
          lastName: signupData.lastName,
          otp: signupData.otp
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Invalid OTP');
      }

      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => onLoginSuccess(result.user), 1000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmail = () => {
    setStep('email');
    setError('');
    setSuccess('');
  };

  return (
    <Box 
      className="min-h-screen flex items-center justify-center"
      sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2
      }}
    >
      <Paper 
        elevation={20}
        sx={{ 
          width: '100%', 
          maxWidth: 450,
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
            padding: 4,
            textAlign: 'center'
          }}
        >
          <Logo size="large" color="white" />
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1 }}>
            Intelligent CI/CD Pipeline Dashboard
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ padding: 4 }}>
          {/* Tabs */}
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab 
              icon={<LoginIcon />} 
              label="Login" 
              iconPosition="start"
            />
            <Tab 
              icon={<PersonAdd />} 
              label="Sign Up" 
              iconPosition="start"
            />
          </Tabs>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Login Tab */}
          {tabValue === 0 && (
            <Box>
              {step === 'email' ? (
                <form onSubmit={handleLoginEmailSubmit}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{ mb: 3 }}
                    disabled={loading}
                  />
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ 
                      py: 1.5,
                      background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565c0 0%, #6a1b9a 100%)'
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Login Code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLoginOTPSubmit}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Enter the 6-digit code sent to {loginData.email}
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Verification Code"
                    value={loginData.otp}
                    onChange={(e) => setLoginData({ ...loginData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Security sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{ mb: 2 }}
                    disabled={loading}
                    inputProps={{ 
                      style: { 
                        textAlign: 'center', 
                        fontSize: '1.5rem', 
                        letterSpacing: '0.5em' 
                      } 
                    }}
                  />
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ 
                      py: 1.5,
                      mb: 2,
                      background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565c0 0%, #6a1b9a 100%)'
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify & Login'}
                  </Button>
                  
                  <Button
                    fullWidth
                    variant="text"
                    onClick={goBackToEmail}
                    disabled={loading}
                  >
                    Back to Email
                  </Button>
                </form>
              )}
            </Box>
          )}

          {/* Signup Tab */}
          {tabValue === 1 && (
            <Box>
              {step === 'email' ? (
                <form onSubmit={handleSignupEmailSubmit}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={signupData.firstName}
                    onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                    variant="outlined"
                    sx={{ mb: 2 }}
                    disabled={loading}
                  />
                  
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={signupData.lastName}
                    onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                    variant="outlined"
                    sx={{ mb: 2 }}
                    disabled={loading}
                  />
                  
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{ mb: 3 }}
                    disabled={loading}
                  />
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ 
                      py: 1.5,
                      background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565c0 0%, #6a1b9a 100%)'
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignupOTPSubmit}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Enter the 6-digit code sent to {signupData.email}
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Verification Code"
                    value={signupData.otp}
                    onChange={(e) => setSignupData({ ...signupData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Security sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{ mb: 2 }}
                    disabled={loading}
                    inputProps={{ 
                      style: { 
                        textAlign: 'center', 
                        fontSize: '1.5rem', 
                        letterSpacing: '0.5em' 
                      } 
                    }}
                  />
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ 
                      py: 1.5,
                      mb: 2,
                      background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565c0 0%, #6a1b9a 100%)'
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify & Sign Up'}
                  </Button>
                  
                  <Button
                    fullWidth
                    variant="text"
                    onClick={goBackToEmail}
                    disabled={loading}
                  >
                    Back to Details
                  </Button>
                </form>
              )}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Divider />
        <Box sx={{ padding: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            © 2025 AutoFlow AI. All rights reserved.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
