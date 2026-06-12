import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, getDatabaseHealth, waitForConnection } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertVehicleSchema, insertJourneySchema, insertExpenseSchema, insertSalaryPaymentSchema, insertEmiPaymentSchema, journeys, expenses } from "@shared/schema";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import path from "path";
import rateLimit from "express-rate-limit";

// Strict limiter for credential endpoints to stop brute force / credential
// stuffing. 10 attempts / 15 min per IP; successful logins don't count.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

// SECURITY: a hardcoded fallback secret lets anyone forge admin JWTs.
// Require JWT_SECRET in production; allow a clearly-insecure dev fallback only outside production.
const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  JWT_SECRET not set — using an insecure development-only secret.');
  return 'dev-only-insecure-secret-change-me';
})();

// Remove the password hash before a user object is ever returned to a client.
function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'password'> {
  const { password, ...safe } = user;
  return safe;
}

// Parse a numeric route param, rejecting NaN instead of passing it to the DB.
function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const MAX_PHOTOS = 7;
// Keep MAX_PHOTOS * MAX_PHOTO_CHARS under the 12MB express.json limit so an
// oversized payload fails with a clear 400, not a confusing 413.
const MAX_PHOTO_CHARS = 1_500_000; // ~1.1MB binary per photo as base64

// Validate the photos payload (array of data-URL strings). Returns the cleaned
// array, or throws with a client-safe message. Returns null when no photos.
function validatePhotos(photos: unknown): string[] | null {
  if (photos == null) return null;
  if (!Array.isArray(photos)) {
    throw Object.assign(new Error('photos must be an array'), { status: 400 });
  }
  if (photos.length > MAX_PHOTOS) {
    throw Object.assign(new Error(`A maximum of ${MAX_PHOTOS} photos is allowed`), { status: 400 });
  }
  for (const p of photos) {
    if (typeof p !== 'string' || !p.startsWith('data:image/')) {
      throw Object.assign(new Error('Each photo must be an image data URL'), { status: 400 });
    }
    if (p.length > MAX_PHOTO_CHARS) {
      throw Object.assign(new Error('A photo exceeds the maximum allowed size'), { status: 400 });
    }
  }
  return photos as string[];
}

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    // Never expose the password hash on req.user (it flows into /api/auth/me).
    req.user = sanitizeUser(user);
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Authorize a driver to act on a journey they own; admins bypass. Returns false
// (and writes the response) when access is denied so callers can early-return.
async function authorizeJourneyAccess(req: any, res: any, journeyId: number): Promise<boolean> {
  if (req.user.role === 'admin') return true;
  const journey = await storage.getJourneyById(journeyId);
  if (!journey) {
    res.status(404).json({ message: 'Journey not found' });
    return false;
  }
  if (journey.driverId !== req.user.id) {
    res.status(403).json({ message: 'Access denied' });
    return false;
  }
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve PWA assets with correct MIME types
  app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.resolve(process.cwd(), 'client/manifest.json'));
  });

  app.get('/icon-192.png', (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(path.resolve(process.cwd(), 'client/icon-192.png'));
  });

  app.get('/icon-512.png', (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(path.resolve(process.cwd(), 'client/icon-512.png'));
  });

  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.resolve(process.cwd(), 'client/sw.js'));
  });

  // One-time bootstrap. SECURITY: gated behind INIT_SECRET so it can't be
  // called by anyone, and the admin password comes from the environment
  // instead of a hardcoded default. No-op once INIT_SECRET is unset.
  app.post("/api/init", authLimiter, async (req, res) => {
    try {
      const initSecret = process.env.INIT_SECRET;
      if (!initSecret) {
        return res.status(403).json({ message: "Initialization is disabled" });
      }
      const provided = req.headers['x-init-secret'] || req.body?.initSecret;
      if (provided !== initSecret) {
        return res.status(403).json({ message: "Invalid initialization secret" });
      }

      const adminPassword = process.env.INIT_ADMIN_PASSWORD;
      if (!adminPassword) {
        return res.status(400).json({ message: "INIT_ADMIN_PASSWORD must be set to bootstrap the admin user" });
      }

      const connected = await waitForConnection(8000);
      if (!connected) {
        return res.status(503).json({ message: "Database not connected" });
      }

      const existingAdmin = await storage.getUserByUsername("admin");
      if (!existingAdmin) {
        await storage.createUser({
          username: "admin",
          password: adminPassword,
          name: "Admin User",
          role: "admin",
        });
      }

      // Seed sample vehicles only if none exist.
      const existingVehicles = await storage.getAllVehicles();
      if (existingVehicles.length === 0) {
        const seedVehicles = [
          { licensePlate: "TS16UD1468", model: "Tata Ace" },
          { licensePlate: "TS16UD1506", model: "Ashok Leyland Dost" },
          { licensePlate: "TG16T1469", model: "Mahindra Bolero Pickup" },
          { licensePlate: "TG16T1507", model: "Eicher Pro 1055" },
          { licensePlate: "TG16T3001", model: "Tata 407" },
        ];
        for (const v of seedVehicles) {
          await storage.createVehicle(v);
        }
      }

      res.json({ message: "Initialization complete" });
    } catch (error) {
      console.error("Initialization error:", error);
      res.status(500).json({ message: "Initialization failed" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    // req.user is already sanitized in authenticateToken.
    res.json({ user: req.user });
  });

  // User management routes (Admin only)
  app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { username, name, role, password } = req.body;
      
      if (!username || !name || !role) {
        return res.status(400).json({ message: "Username, name, and role are required" });
      }

      await storage.updateUser(id, { username, name, role, password });
      res.json({ message: "User updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.put("/api/users/:id/salary", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { salary } = req.body;
      
      if (!salary || isNaN(parseFloat(salary))) {
        return res.status(400).json({ message: "Valid salary amount is required" });
      }

      await storage.updateUserSalary(id, salary);
      res.json({ message: "User salary updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user salary" });
    }
  });

  // Vehicle management routes
  app.get("/api/vehicles", authenticateToken, async (req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.post("/api/vehicles", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(vehicleData);
      res.json(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vehicle data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.delete("/api/vehicles/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVehicle(id);
      res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  app.put("/api/vehicles/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { licensePlate, model, status } = req.body;
      
      if (!licensePlate || !model || !status) {
        return res.status(400).json({ message: "License plate, model, and status are required" });
      }

      await storage.updateVehicle(id, { licensePlate, model, status });
      res.json({ message: "Vehicle updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.put("/api/vehicles/:id/emi", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { monthlyEmi } = req.body;
      
      if (!monthlyEmi || isNaN(parseFloat(monthlyEmi))) {
        return res.status(400).json({ message: "Valid monthly EMI amount is required" });
      }

      await storage.updateVehicleMonthlyEmi(id, monthlyEmi);
      res.json({ message: "Vehicle monthly EMI updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update vehicle monthly EMI" });
    }
  });

  // Journey management routes
  app.get("/api/journeys", authenticateToken, async (req: any, res) => {
    try {
      let journeys;
      if (req.user.role === 'admin') {
        journeys = await storage.getAllJourneys();
      } else {
        journeys = await storage.getJourneysByDriver(req.user.id);
      }
      res.json(journeys);
    } catch (error) {
      console.error('Journey fetch error:', error);
      res.status(500).json({ message: "Failed to fetch journeys" });
    }
  });

  app.get("/api/journeys/active", authenticateToken, async (req, res) => {
    try {
      const journeys = await storage.getActiveJourneys();
      res.json(journeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active journeys" });
    }
  });

  app.post("/api/journeys", authenticateToken, async (req: any, res) => {
    try {
      const { photos, ...journeyFields } = req.body;

      // SECURITY: driverId always comes from the authenticated token, never the body.
      // insertJourneySchema omits photos, so parse() strips them — validate and
      // attach the photos explicitly afterwards or they never reach the DB.
      const journeyData = insertJourneySchema.parse({
        ...journeyFields,
        driverId: req.user.id,
      });
      const validatedPhotos = validatePhotos(photos);

      const journey = await storage.createJourney({ ...journeyData, photos: validatedPhotos });
      res.json(journey);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid journey data", errors: error.errors });
      }
      if (error?.status === 400) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Journey creation error:", error);
      res.status(500).json({ message: "Failed to create journey" });
    }
  });

  app.patch("/api/journeys/:id/complete", authenticateToken, async (req: any, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) return res.status(400).json({ message: "Invalid journey id" });
      if (!(await authorizeJourneyAccess(req, res, id))) return;
      await storage.completeJourney(id);
      res.json({ message: "Journey completed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to complete journey" });
    }
  });

  app.patch("/api/journeys/:id/location", authenticateToken, async (req: any, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) return res.status(400).json({ message: "Invalid journey id" });
      if (!(await authorizeJourneyAccess(req, res, id))) return;
      const { location, speed, distance } = req.body;
      await storage.updateJourneyLocation(id, location, speed, distance);
      res.json({ message: "Location updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.delete("/api/journeys/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) return res.status(400).json({ message: "Invalid journey id" });
      await storage.deleteJourney(id);
      res.json({ message: "Journey deleted successfully" });
    } catch (error) {
      console.error('Journey deletion error:', error);
      res.status(500).json({ message: "Failed to delete journey" });
    }
  });

  app.get("/api/journeys/:id/photos", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Fetching photos for journey ${id}`);
      const photos = await storage.getJourneyPhotos(id);
      console.log(`Found photos for journey ${id}:`, photos ? photos.length : 'null');
      res.json({ photos });
    } catch (error: any) {
      console.error(`Failed to fetch photos for journey ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch journey photos", error: error.message });
    }
  });

  // Expense management routes
  app.get("/api/journeys/:id/expenses", authenticateToken, async (req: any, res) => {
    try {
      const journeyId = parseId(req.params.id);
      if (journeyId === null) return res.status(400).json({ message: "Invalid journey id" });
      if (!(await authorizeJourneyAccess(req, res, journeyId))) return;
      const expenses = await storage.getExpensesByJourneyForUser(journeyId, req.user.role);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", authenticateToken, async (req: any, res) => {
    try {
      // Convert amount to string if it's a number
      const requestBody = {
        ...req.body,
        amount: typeof req.body.amount === 'number' ? req.body.amount.toString() : req.body.amount
      };

      const expenseData = insertExpenseSchema.parse(requestBody);
      // SECURITY: a driver may only add expenses to a journey they own.
      if (expenseData.journeyId == null) {
        return res.status(400).json({ message: "journeyId is required" });
      }
      if (!(await authorizeJourneyAccess(req, res, expenseData.journeyId))) return;
      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error) {
      console.error("Expense creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.get("/api/expenses/all", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all expenses" });
    }
  });

  // Salary management routes (Admin only — salary data is sensitive financials).
  // Client-side route gating is not a security control; enforce it on the server.
  app.get("/api/salaries", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payments = await storage.getSalaryPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch salary payments" });
    }
  });

  app.post("/api/salaries/pay", authenticateToken, requireAdmin, async (req, res) => {
    try {
      console.log("Salary payment request body:", req.body);
      
      // Convert amount to string if it's a number
      const requestBody = {
        ...req.body,
        amount: typeof req.body.amount === 'number' ? req.body.amount.toString() : req.body.amount
      };
      
      console.log("Processed salary payment data:", requestBody);
      const paymentData = insertSalaryPaymentSchema.parse(requestBody);
      console.log("Validated payment data:", paymentData);
      const payment = await storage.createSalaryPayment(paymentData);
      console.log("Created payment:", payment);
      res.json(payment);
    } catch (error) {
      console.error("Salary payment error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process salary payment" });
    }
  });

  app.post("/api/salaries/reset", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.resetSalaryData();
      res.json({ message: "Salary data reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset salary data" });
    }
  });

  // NOTE: salary updates go through the admin-only PUT /api/users/:id/salary
  // route defined above. A second unguarded PUT /api/users/:id handler used to
  // live here; it was dead code (shadowed by the earlier admin route) and has
  // been removed to avoid the appearance of an unprotected salary endpoint.

  // Admin editing routes
  app.put("/api/admin/journeys/:id/financials", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const journeyId = parseInt(req.params.id);
      const { pouch, security } = req.body;
      
      await storage.updateJourneyFinancials(journeyId, { pouch, security });
      
      // Recalculate journey totals after updating financials
      await storage.updateJourneyTotals(journeyId);
      
      res.json({ message: "Journey financials updated successfully and balance recalculated" });
    } catch (error) {
      console.error("Failed to update journey financials:", error);
      res.status(500).json({ message: "Failed to update journey financials" });
    }
  });

  app.put("/api/admin/expenses/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const { amount, description, category } = req.body;
      
      // Get the expense first to find the journey ID
      const expense = await storage.getExpenseById(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      await storage.updateExpense(expenseId, { amount, description, category });
      
      // Recalculate journey totals after updating expense
      if (expense.journeyId) {
        await storage.updateJourneyTotals(expense.journeyId);
      }
      
      res.json({ message: "Expense updated successfully and journey balance recalculated" });
    } catch (error) {
      console.error("Failed to update expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/admin/expenses/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      
      // Get the expense first to find the journey ID before deletion
      const expense = await storage.getExpenseById(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      await storage.deleteExpense(expenseId);
      
      // Recalculate journey totals after deleting expense  
      if (expense.journeyId) {
        await storage.updateJourneyTotals(expense.journeyId);
      }
      
      res.json({ message: "Expense deleted successfully and journey balance recalculated" });
    } catch (error) {
      console.error("Failed to delete expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Dashboard stats routes
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/financial", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getFinancialStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch financial stats" });
    }
  });

  // Reset financial data endpoint (admin only)
  app.post("/api/reset-financial-data", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.resetAllFinancialData();
      res.json({ message: "Financial data reset successfully" });
    } catch (error: any) {
      console.error("Reset financial data error:", error);
      if (error.message && error.message.includes('unpaid salary obligations')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to reset financial data" });
    }
  });



  // EMI management routes (Admin only)
  app.get("/api/emi", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const emiPayments = await storage.getAllEmiPayments();
      res.json(emiPayments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch EMI payments" });
    }
  });

  app.post("/api/emi", authenticateToken, requireAdmin, async (req, res) => {
    try {
      console.log("EMI request body:", req.body);
      const emiData = insertEmiPaymentSchema.parse(req.body);
      console.log("Parsed EMI data:", emiData);
      const emiPayment = await storage.createEmiPayment(emiData);
      res.json(emiPayment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid EMI data", errors: error.errors });
      }
      console.log("EMI creation error:", error);
      res.status(500).json({ message: "Failed to create EMI payment" });
    }
  });

  app.patch("/api/emi/:id/status", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const paidDate = status === 'paid' ? new Date() : undefined;
      
      await storage.updateEmiPaymentStatus(id, status, paidDate);
      res.json({ message: "EMI payment status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update EMI payment status" });
    }
  });

  app.delete("/api/emi/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEmiPayment(id);
      res.json({ message: "EMI payment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete EMI payment" });
    }
  });

  app.post("/api/reset-emi-data", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.resetEmiData();
      res.json({ message: "EMI data reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset EMI data" });
    }
  });

  // Recalculate all journey totals endpoint (admin only)
  app.post("/api/admin/recalculate-journey-totals", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { journeyId } = req.body;
      
      if (journeyId) {
        // Recalculate specific journey
        console.log(`Recalculating journey ${journeyId}`);
        await storage.updateJourneyTotals(parseInt(journeyId));
        res.json({ 
          message: `Journey ${journeyId} totals recalculated successfully`,
          updatedCount: 1 
        });
      } else {
        // Get all journeys
        const allJourneys = await storage.getAllJourneys();
        let updatedCount = 0;
        
        console.log(`Starting recalculation for ${allJourneys.length} journeys`);
        
        // Recalculate totals for each journey
        for (const journey of allJourneys) {
          console.log(`Recalculating journey ${journey.id}: ${journey.destination}`);
          await storage.updateJourneyTotals(journey.id);
          updatedCount++;
        }
        
        console.log(`Recalculation complete for ${updatedCount} journeys`);
        
        res.json({ 
          message: `Journey totals recalculated successfully for ${updatedCount} journeys`,
          updatedCount 
        });
      }
    } catch (error) {
      console.error("Failed to recalculate journey totals:", error);
      res.status(500).json({ message: "Failed to recalculate journey totals", error: (error as any).message });
    }
  });

  // Comprehensive financial recalculation endpoint (admin only)
  app.post("/api/admin/recalculate-all-financials", authenticateToken, requireAdmin, async (req, res) => {
    try {
      console.log("Starting comprehensive financial recalculation...");
      
      const result = await storage.recalculateAllFinancials();
      
      console.log("Comprehensive financial recalculation completed successfully");
      
      res.json({ 
        message: result.message,
        totalExpenses: result.totalExpenses,
        affectedJourneys: result.affectedJourneys,
        success: true
      });
    } catch (error: any) {
      console.error("Failed to recalculate all financials:", error);
      res.status(500).json({ 
        message: "Failed to recalculate all financials", 
        error: error.message,
        success: false
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
