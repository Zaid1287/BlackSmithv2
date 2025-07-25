# BlackSmith Traders - Logistics Management System

## Overview

BlackSmith Traders is a comprehensive logistics management system designed for fleet management, financial tracking, and employee salary administration. The application provides real-time journey monitoring, expense management, and comprehensive reporting capabilities for transportation businesses.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with Shadcn/UI components for consistent design
- **State Management**: TanStack Query for server state management with optimistic updates
- **Router**: Wouter for lightweight client-side routing
- **Charts**: Recharts for data visualization and analytics
- **PWA**: Progressive Web App capabilities with service worker for offline functionality

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Authentication**: JWT-based authentication with role-based access control
- **API Design**: RESTful API with Express middleware
- **File Handling**: Support for image uploads and document processing
- **Session Management**: Secure session handling with proper token validation

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Relational database design with proper foreign key relationships
- **Connection**: Neon serverless PostgreSQL connection with connection pooling
- **Migrations**: Drizzle Kit for database schema management

## Key Components

### User Management
- Role-based access control (Admin/Driver)
- User authentication and authorization
- Salary management for drivers
- User profile management with edit capabilities

### Vehicle Management
- Vehicle fleet tracking and status management
- EMI payment tracking for vehicle financing
- Vehicle availability and maintenance scheduling
- License plate and model information management

### Journey Management
- Real-time journey tracking with GPS location updates
- Journey status management (active, completed, cancelled)
- Driver assignment and vehicle allocation
- Photo documentation for journey verification

### Financial Management
- Comprehensive expense tracking with categorization
- Revenue and profit/loss analysis
- Journey-wise financial breakdown
- Export capabilities for external reporting (Excel format)
- Company-secret expenses for internal tracking

### Expense Categories
- Fuel, food, maintenance, loading, rope, RTO
- HYD/NZB unloading, mechanical, electrical, body works
- Tires, weighment, AdBlue, fines, driver fees
- Role-based expense visibility (admin vs driver)

## Data Flow

### Authentication Flow
1. User submits login credentials
2. Server validates credentials against database
3. JWT token generated and returned to client
4. Client stores token and includes in subsequent requests
5. Server validates token on protected routes

### Journey Management Flow
1. Admin/Driver creates new journey with vehicle assignment
2. Real-time location updates tracked during journey
3. Expenses added throughout journey with categorization
4. Journey completion triggers financial calculations
5. Data synchronized and stored in database

### Financial Reporting Flow
1. System aggregates expense data across journeys
2. Calculations performed for profit/loss analysis
3. Data formatted for dashboard visualization
4. Export functionality generates Excel reports
5. Historical data maintained for trend analysis

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/**: Comprehensive UI component library
- **drizzle-orm**: Type-safe database ORM
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **bcrypt**: Password hashing and security
- **jsonwebtoken**: JWT token management
- **recharts**: Data visualization and charting
- **xlsx**: Excel file generation and export
- **file-saver**: Client-side file download functionality

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type safety and development experience
- **tailwindcss**: Utility-first CSS framework
- **@types/**: TypeScript definitions for various packages

### Mobile Optimization
- Responsive design for mobile drivers
- PWA capabilities for app-like experience
- Offline functionality for data synchronization
- Touch-optimized interfaces

## Deployment Strategy

### Production Build
- **Build Process**: Vite builds client application to dist/public
- **Server Bundle**: ESBuild bundles server code for production
- **Static Assets**: Client assets served from dist/public directory
- **Environment**: Production mode with optimized bundles

### Development Setup
- **Hot Reload**: Vite development server with HMR
- **Database**: PostgreSQL with environment-based configuration
- **Scripts**: npm run dev for development, npm run build for production
- **Port Configuration**: Server runs on port 5000 with external port 80

### Replit Configuration
- **Modules**: nodejs-20, web, postgresql-16
- **Deployment**: Autoscale deployment target
- **Database**: Automatic PostgreSQL provisioning
- **Environment**: DATABASE_URL automatically configured

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **July 19, 2025**: Fixed Excel export missing journey expense breakdowns - now fetches comprehensive expense data for all filtered journeys individually, ensuring complete expense details in exports
- **July 19, 2025**: Enhanced Excel export with journey-wise breakdown sections showing detailed expense information for each journey within selected date ranges
- **July 19, 2025**: Successfully completed migration from Replit Agent to standard Replit environment with user's existing Neon PostgreSQL database - all functionality preserved and verified
- **July 8, 2025**: Fixed expense calculation discrepancy - investigated ₹730 difference between manual calculation (₹616,859) and system total (₹617,589) for June 2025
- **July 8, 2025**: Updated financial management total expenses calculation to use journey.totalExpenses field directly for accurate filtering
- **July 8, 2025**: Fixed journey query limit issue - removed 50 journey limit to show all journeys for proper month filtering
- **July 8, 2025**: Fixed financial management month filter double filtering logic
- **July 8, 2025**: Successfully migrated from Replit Agent to standard Replit environment with user's existing PostgreSQL database - all data preserved and application fully functional
- **July 7, 2025**: Increased photo limit from 3 to 7 photos per journey for better documentation
- **July 7, 2025**: Removed recalculate button from Financial Management interface for cleaner UI
- **July 7, 2025**: Fixed view breakdown total calculation to exclude additional revenue items
- **July 7, 2025**: Fixed backend expense calculation to use correct category names matching frontend
- **July 3, 2025**: Successfully migrated from Replit Agent to standard Replit environment with full database connectivity
- **July 3, 2025**: Added comprehensive financial recalculation feature - processes all journey expense breakdowns and updates total expense calculations
- **July 3, 2025**: Removed individual journey totals recalculation button and replaced with comprehensive financial recalculation
- **July 3, 2025**: Added recalculate journey totals functionality - new admin button and API endpoint to fix expense display issues
- **July 3, 2025**: Fixed Photos button visibility issue - now shows for all journeys regardless of photo existence
- **July 3, 2025**: Fixed production deployment compatibility by removing netProfit column from journeys table schema - now calculated dynamically
- **July 3, 2025**: Removed revenue column from journeys table to fix production deployment compatibility
- **July 3, 2025**: Fixed journey creation authentication and form validation issues
- **July 3, 2025**: Fixed net profit calculation discrepancy between admin dashboard and financial management tab - added salary adjustments to match backend calculation
- **July 1, 2025**: Fixed critical journey creation bug - updated insertJourneySchema to exclude auto-calculated fields (revenue, netProfit, currentLocation, speed, distanceCovered)
- **July 1, 2025**: Added photo compression and 3-photo limit to optimize memory usage for production deployment
- **July 1, 2025**: Increased memory allocation to 512MB and optimized memory monitoring thresholds for Render deployment
- **July 1, 2025**: Successfully migrated from Replit Agent to standard Replit environment with PostgreSQL database
- **June 30, 2025**: Fixed Excel export to match journey history date filtering - now exports all journeys within selected month/date range
- **June 30, 2025**: Removed recalculate financials feature - cleaned up all related components and API endpoints
- **June 30, 2025**: Month filter functionality added to Financial Management tab for better time-based expense analysis
- **June 30, 2025**: Removed repair functionality - cleaned up expense repair components and API endpoints
- **June 25, 2025**: License plate filter added to journey history with month filter defaulting to current date
- **June 25, 2025**: Delete journey functionality implemented with complete data synchronization
- **June 25, 2025**: Fixed admin journey visibility issue - admins now see all journeys properly
- **June 25, 2025**: Database optimizations for memory efficiency - photos excluded from general queries

## Changelog

- June 25, 2025: Initial setup
- June 25, 2025: Journey management enhancements and data integrity improvements