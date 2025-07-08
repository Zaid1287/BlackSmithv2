import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool, getDatabaseHealth, isConnected } from "./db";

// Memory optimization for production deployment
process.env.NODE_OPTIONS = '--max-old-space-size=1024';

// Rate limiting for production
const requestCounts = new Map();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

// Startup timestamp for uptime tracking
const startTime = Date.now();

const app = express();

// Rate limiting middleware for production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!requestCounts.has(clientIp)) {
      requestCounts.set(clientIp, { count: 1, windowStart: now });
    } else {
      const clientData = requestCounts.get(clientIp);
      
      // Reset window if needed
      if (now - clientData.windowStart > RATE_WINDOW) {
        clientData.count = 1;
        clientData.windowStart = now;
      } else {
        clientData.count++;
      }
      
      // Check rate limit
      if (clientData.count > RATE_LIMIT) {
        return res.status(429).json({ 
          error: 'Too many requests', 
          message: 'Rate limit exceeded. Please try again later.' 
        });
      }
    }
  }
  next();
});

// Memory monitoring middleware
app.use((req, res, next) => {
  const used = process.memoryUsage();
  const memMB = Math.round(used.heapUsed / 1024 / 1024);
  if (memMB > 800) {
    console.warn(`High memory usage: ${memMB}MB`);
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add health check routes BEFORE main route registration
app.get('/ping', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000)
  });
});

app.get('/health', (_req, res) => {
  const dbHealth = getDatabaseHealth();
  const memUsage = process.memoryUsage();
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  const health = {
    status: dbHealth.connected ? 'healthy' : 'degraded',
    database: dbHealth,
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    },
    uptime,
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV
  };
  
  res.status(dbHealth.connected ? 200 : 503).json(health);
});

// Simple frontend health check
app.get('/app-health', (_req, res) => {
  res.status(200).json({
    frontend: 'available',
    backend: 'available', 
    database: isConnected ? 'connected' : 'disconnected',
    message: 'Application is running'
  });
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Enhanced error logging for production debugging
    console.error('Server error:', {
      status,
      message,
      url: _req.url,
      method: _req.method,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development" || process.env.FORCE_DEV_MODE) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Graceful shutdown for better resource cleanup on Render
  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log('HTTP server closed.');
      
      // Close database pool if it exists
      if (pool) {
        pool.end(() => {
          console.log('Database pool closed.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
    
    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000); // 30 second timeout
  };

  // Listen for shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
})();
