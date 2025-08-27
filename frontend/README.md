# Frontend - React Application

Modern React.js application providing intuitive interface for CI/CD pipeline monitoring and management.

## Quick Start

```bash
cd frontend
cp .env.example .env    # Configure API endpoints
npm install
npm start               # Runs on http://localhost:3000
```

## Environment Setup

Create `.env` file:
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
```

## Key Features

### Dashboard
- Real-time pipeline monitoring
- Interactive metrics and charts
- Build success/failure analytics

### Pipeline Management
- GitHub repository integration
- Workflow import and configuration
- Pipeline status tracking

### Execution History
- Build logs and details
- Performance metrics
- Historical data visualization

## Component Structure

```
src/
├── components/        # Reusable UI components
├── pages/            # Route-based page components
├── contexts/         # React Context providers
└── services/         # API and authentication
```

## Technology Stack

- **React.js** - UI library with hooks
- **Material-UI** - Component library
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **React Router** - Client-side routing

## Available Scripts

```bash
npm start      # Development server
npm test       # Run tests
npm run build  # Build for deployment
```

## Real-time Updates

WebSocket integration provides live updates for:
- Pipeline status changes
- Build completion notifications
- Real-time metrics refresh
