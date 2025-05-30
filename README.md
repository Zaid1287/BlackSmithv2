# BlackSmith Traders - Logistics Management System

A comprehensive fleet management and financial tracking platform designed for BlackSmith Traders, providing real-time journey monitoring, expense management, and employee salary administration.

## Features

### 🚛 Fleet Management
- **Vehicle Tracking**: Monitor vehicle status, availability, and maintenance schedules
- **Journey Management**: Real-time tracking of active journeys with location updates
- **Driver Assignment**: Efficient driver-to-vehicle allocation system

### 💰 Financial Management
- **Expense Tracking**: Categorized expense logging with income/expense classification
- **Journey-wise Analysis**: Detailed financial breakdown per journey
- **Revenue Analytics**: Comprehensive profit/loss reporting with visual charts

### 👥 Employee Management
- **Salary Administration**: Complete payroll system with payment processing
- **Driver Profiles**: User management with role-based access control
- **Payment History**: Detailed salary payment tracking and reporting

### 📊 Dashboard & Reporting
- **Real-time Analytics**: Live dashboard with key performance indicators
- **Excel Export**: Data export functionality for external reporting
- **Historical Analysis**: Journey history with financial summaries

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **Backend**: Express.js with JWT authentication
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack Query for server state
- **Charts**: Recharts for data visualization

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Environment variables configured

### Installation
```bash
npm install
npm run db:push
npm run dev
```

### Default Credentials
- **Admin**: Username: `admin`, Password: `admin123`
- **Driver**: Username: `driver`, Password: `driver123`

## User Roles

### Administrator
- Complete system access
- Financial management and reporting
- Employee salary administration
- Vehicle and driver management

### Driver
- Journey management (start/complete)
- Expense logging during journeys
- Personal journey history access

## Key Workflows

### Journey Management
1. Admin assigns vehicle to driver
2. Driver starts journey with destination
3. Real-time expense logging during journey
4. Journey completion with automatic financial calculations

### Salary Processing
1. Admin sets employee base salaries
2. Payment entries can be added/removed as needed
3. Individual or bulk salary payments
4. Comprehensive payment history tracking

### Financial Reporting
- Income/Expense categorization with visual indicators
- Journey-wise profit/loss analysis
- Export capabilities for external accounting

## Security Features
- JWT-based authentication
- Role-based access control
- Secure password hashing
- Session management

## Production Deployment
The application is ready for deployment with:
- Professional UI with gradient designs
- Responsive mobile layout
- Error handling and loading states
- Data validation and security measures

---

**BlackSmith Traders** - Streamlining logistics operations with modern technology.