import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [githubUser, setGithubUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check main app auth
      const response = await fetch('http://localhost:5000/api/auth/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        
        // Check GitHub auth if main auth is successful
        try {
          const githubResponse = await fetch('http://localhost:5000/auth/user', {
            credentials: 'include'
          });
          
          if (githubResponse.ok) {
            const githubData = await githubResponse.json();
            setGithubUser(githubData.user);
          } else {
            setGithubUser(null);
          }
        } catch (githubError) {
          console.log('GitHub auth not available:', githubError.message);
          setGithubUser(null);
        }
      } else {
        setUser(null);
        setGithubUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setGithubUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
    // Re-check GitHub auth after main login
    setTimeout(checkGithubAuth, 500);
  };

  const checkGithubAuth = async () => {
    try {
      const githubResponse = await fetch('http://localhost:5000/auth/user', {
        credentials: 'include'
      });
      
      if (githubResponse.ok) {
        const githubData = await githubResponse.json();
        setGithubUser(githubData.user);
      } else {
        setGithubUser(null);
      }
    } catch (error) {
      console.log('GitHub auth check failed:', error.message);
      setGithubUser(null);
    }
  };

  const connectGithub = () => {
    // Redirect to GitHub OAuth
    const timestamp = Date.now();
    window.location.href = `http://localhost:5000/auth/github?t=${timestamp}`;
  };

  const disconnectGithub = async () => {
    try {
      // Call GitHub disconnect endpoint (we'll create this)
      await fetch('http://localhost:5000/auth/github/disconnect', {
        method: 'POST',
        credentials: 'include'
      });
      setGithubUser(null);
    } catch (error) {
      console.error('GitHub disconnect failed:', error);
    }
  };

  const logout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setGithubUser(null);
    }
  };

  const value = {
    user,
    githubUser,
    login,
    logout,
    loading,
    connectGithub,
    disconnectGithub,
    checkGithubAuth,
    isAuthenticated: !!user,
    isGithubConnected: !!githubUser,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
