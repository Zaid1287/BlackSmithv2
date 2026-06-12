import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool, getDatabaseHealth, isConnected } from "./db";

// Memory optimization for production deployment
process.env.NODE_OPTIONS = '--max-old-space-size=1024';

// Rate limiting for production
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 1000; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

// Reap stale rate-limit buckets so the Map can't grow unbounded on a 256MB box.
setInterval(() => {
  const now = Date.now();
  requestCounts.forEach((data, ip) => {
    if (now - data.windowStart > RATE_WINDOW) requestCounts.delete(ip);
  });
}, RATE_WINDOW).unref();

// Startup timestamp for uptime tracking
const startTime = Date.now();

const app = express();

// Behind Render's proxy, the real client IP is in X-Forwarded-For.
app.set('trust proxy', 1);
// Don't advertise Express.
app.disable('x-powered-by');

// Security headers. CSP is disabled because the Vite-built SPA uses inline
// styles/scripts and data: image URLs; enabling a strict CSP would break it.
// Everything else (HSTS, nosniff, frameguard, referrer policy) stays on.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Gzip responses. Cuts JSON payload size ~70%; big win on the dashboard/journey
// list. Skips already-compressed photo data URLs automatically (filter by type).
app.use(compression());

// Rate limiting middleware for production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const clientData = requestCounts.get(clientIp);
    if (!clientData || now - clientData.windowStart > RATE_WINDOW) {
      requestCounts.set(clientIp, { count: 1, windowStart: now });
    } else {
      clientData.count++;
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
  // Bytes -> MB is /1024/1024 (the old /512/512 over-reported heap by ~4x).
  const memMB = Math.round(used.heapUsed / 1024 / 1024);
  if (memMB > 200) {
    console.warn(`High memory usage: ${memMB}MB`);
    // Force garbage collection if available (node --expose-gc)
    if (global.gc) {
      global.gc();
    }
  }
  next();
});

// 50MB was unsafe on a 256MB box: a couple of concurrent uploads could OOM.
// Photos are sent as base64 in journey creation, so keep some headroom but cap it.
// TODO: move photo upload off JSON (multipart + object storage) to drop this further.
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: false, limit: '12mb' }));

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

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    // Log full detail server-side only.
    console.error('Server error:', {
      status,
      message: err.message,
      url: req.url,
      method: req.method,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    if (res.headersSent) {
      return _next(err);
    }
    // Don't leak internal error messages to clients on 5xx.
    const clientMessage = status < 500 ? (err.message || 'Request failed') : 'Internal Server Error';
    res.status(status).json({ message: clientMessage });
    // NOTE: do NOT re-throw here — re-throwing surfaced as an uncaughtException,
    // which the handler below turns into a full process shutdown (a DoS vector).
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development" || process.env.FORCE_DEV_MODE) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Bind the port the platform gives us (Render/most PaaS inject PORT), falling
  // back to 5000 for local/dev. reusePort was removed: it adds nothing for a
  // single instance and throws ENOTSUP on macOS.
  const port = Number(process.env.PORT) || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
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
  
  // An uncaught exception leaves the process in an unknown state — shut down.
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });

  // A single unhandled rejection should NOT take the whole server down for all
  // users; log it loudly so it can be fixed, but keep serving.
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
})();
