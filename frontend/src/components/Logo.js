import React from 'react';
import { Box, Typography } from '@mui/material';
import { AutoAwesome, Speed } from '@mui/icons-material';

const Logo = ({ size = 'medium', showText = true, color = 'primary', clickable = false }) => {
  const sizes = {
    small: { icon: 24, text: 'h6' },
    medium: { icon: 32, text: 'h5' },
    large: { icon: 48, text: 'h4' },
    xlarge: { icon: 64, text: 'h3' }
  };

  const logoSize = sizes[size] || sizes.medium;

  const LogoContent = () => (
    <Box 
      className={`flex items-center space-x-2 ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
    >
      {/* Logo Icon - Combining AutoAwesome (AI) and Speed (Flow) */}
      <Box className="relative">
        <Box 
          className="rounded-lg p-2 bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"
          sx={{ 
            background: color === 'white' 
              ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' 
              : 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)'
          }}
        >
          <Box className="relative">
            <AutoAwesome 
              sx={{ 
                fontSize: logoSize.icon, 
                color: color === 'white' ? '#1976d2' : 'white',
                position: 'absolute',
                top: -2,
                left: -2
              }} 
            />
            <Speed 
              sx={{ 
                fontSize: logoSize.icon, 
                color: color === 'white' ? '#7b1fa2' : 'white',
                opacity: 0.8
              }} 
            />
          </Box>
        </Box>
      </Box>
      
      {/* Logo Text */}
      {showText && (
        <Box>
          <Typography 
            variant={logoSize.text} 
            className="font-bold"
            sx={{ 
              color: color === 'white' ? 'white' : 'primary.main',
              background: color === 'white' 
                ? 'transparent'
                : 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
              backgroundClip: color === 'white' ? 'unset' : 'text',
              WebkitBackgroundClip: color === 'white' ? 'unset' : 'text',
              WebkitTextFillColor: color === 'white' ? 'white' : 'transparent',
              fontWeight: 700,
              letterSpacing: '-0.02em'
            }}
          >
            AutoFlow
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: color === 'white' ? 'rgba(255,255,255,0.8)' : 'text.secondary',
              fontSize: size === 'small' ? '0.6rem' : '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginTop: '-4px',
              display: 'block'
            }}
          >
            AI
          </Typography>
        </Box>
      )}
    </Box>
  );

  return <LogoContent />;
};

export default Logo;
