# BlackSmith Traders - Fleet Management System

A comprehensive logistics and expense management system for BlackSmith Traders, featuring vehicle fleet management, journey tracking, financial reporting, and multi-language support.

## Features

- **Fleet Management**: Vehicle tracking, EMI management, status monitoring
- **Journey Tracking**: Real-time location updates, photo documentation, expense tracking
- **Financial Management**: Expense categorization, profit calculations, admin controls
- **Multi-language Support**: English, Hindi, and Telugu interfaces
- **Admin Controls**: Comprehensive editing capabilities, financial corrections
- **RAM Optimized**: Designed for 10+ concurrent users with 256MB memory limit

## Quick Start

1. **Login Credentials:**
   - Admin: `admin` / `admin123`
   - Driver: `driver` / `driver123`

2. **Key Endpoints:**
   - Main App: `/`
   - Health Check: `/ping`
   - API Base: `/api`

## Keep Alive Configuration

This app includes automatic keep-alive functionality to prevent deployment timeouts:

### GitHub Actions Setup

1. Fork this repository to your GitHub account
2. Add your app URL as a secret:
   - Go to Repository Settings → Secrets and variables → Actions
   - Add `APP_URL` with your Replit deployment URL
3. The workflow will automatically ping every 10 minutes

### Manual Keep Alive

You can manually trigger extended keep-alive sessions:
- Go to Actions tab in your GitHub repository
- Select "Keep BlackSmith Traders App Alive"
- Click "Run workflow"

## Memory Optimization

The system is optimized for efficiency:
- 256MB Node.js memory limit
- Photo data excluded from general queries
- Pagination limits: 20 journeys, 50/30 expenses
- 30-second cache times for active data
- Memory monitoring with warnings

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, PostgreSQL
- **Database**: Drizzle ORM with Neon PostgreSQL
- **Authentication**: JWT tokens with bcrypt
- **Deployment**: Replit with automatic scaling

## API Endpoints

### Health & Status
- `GET /ping` - Health check and uptime status

### Authentication
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Current user info

### Core Features
- `GET /api/journeys/active` - Active journey tracking
- `POST /api/journeys` - Start new journey
- `GET /api/expenses` - Expense management
- `GET /api/vehicles` - Vehicle fleet status

## Production Ready

This system is production-ready with:
- Error handling and logging
- Database connection pooling
- Memory optimization
- Automated deployments
- Health monitoring
- Security best practices

Perfect for logistics companies managing vehicle fleets, tracking journeys, and handling financial operations at scale.