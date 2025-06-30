import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertVehicleSchema, insertJourneySchema, insertExpenseSchema, insertSalaryPaymentSchema, insertEmiPaymentSchema, journeys, expenses } from "@shared/schema";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "blacksmith-traders-secret";

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided for:', req.path);
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      console.log('User not found for token:', decoded.userId);
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.log('Token verification failed for:', req.path, error);
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

  // Initialize admin user if not exists
  app.post("/api/init", async (req, res) => {
    try {
      const existingAdmin = await storage.getUserByUsername("admin");
      if (!existingAdmin) {
        await storage.createUser({
          username: "admin",
          password: "admin123",
          name: "Admin User",
          role: "admin",
        });
        
        // Create some sample vehicles
        await storage.createVehicle({
          licensePlate: "TS16UD1468",
          model: "Tata Ace",
        });
        await storage.createVehicle({
          licensePlate: "TS16UD1506",
          model: "Ashok Leyland Dost",
        });
        await storage.createVehicle({
          licensePlate: "TG16T1469",
          model: "Mahindra Bolero Pickup",
        });
        await storage.createVehicle({
          licensePlate: "TG16T1507",
          model: "Eicher Pro 1055",
        });
        await storage.createVehicle({
          licensePlate: "TG16T3001",
          model: "Tata 407",
        });
        
        // Create sample driver
        await storage.createUser({
          username: "driver",
          password: "driver123",
          name: "Test Driver",
          role: "driver",
        });
      }
      res.json({ message: "Initialization complete" });
    } catch (error) {
      console.error("Initialization error:", error);
      res.status(500).json({ message: "Initialization failed", error: error.message });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
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
      res.status(500).json({ message: "Login failed", error: error.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // User management routes (Admin only)
  app.get("/api/users", authenticateToken, async (req, res) => {
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
      console.log(`Fetching journeys for user: ${req.user.username} (role: ${req.user.role})`);
      let journeys;
      if (req.user.role === 'admin') {
        journeys = await storage.getAllJourneys();
        console.log(`Admin query returned ${journeys.length} journeys`);
      } else {
        journeys = await storage.getJourneysByDriver(req.user.id);
        console.log(`Driver query returned ${journeys.length} journeys for driver ID: ${req.user.id}`);
      }
      res.json(journeys);
    } catch (error) {
      console.error('Journey fetch error:', error);
      res.status(500).json({ message: "Failed to fetch journeys", error: error.message });
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
      const journeyData = insertJourneySchema.parse({
        ...journeyFields,
        driverId: req.user.id,
        photos: photos || null,
      });
      const journey = await storage.createJourney(journeyData);
      res.json(journey);
    } catch (error) {
      console.error("Journey creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid journey data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create journey", error: error.message });
    }
  });

  app.patch("/api/journeys/:id/complete", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.completeJourney(id);
      res.json({ message: "Journey completed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to complete journey" });
    }
  });

  app.patch("/api/journeys/:id/location", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { location, speed, distance } = req.body;
      await storage.updateJourneyLocation(id, location, speed, distance);
      res.json({ message: "Location updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.delete("/api/journeys/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Admin ${req.user.username} deleting journey ID: ${id}`);
      await storage.deleteJourney(id);
      res.json({ message: "Journey deleted successfully" });
    } catch (error) {
      console.error('Journey deletion error:', error);
      res.status(500).json({ message: "Failed to delete journey", error: error.message });
    }
  });

  app.get("/api/journeys/:id/photos", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const photos = await storage.getJourneyPhotos(id);
      res.json({ photos });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch journey photos" });
    }
  });

  // Expense management routes
  app.get("/api/journeys/:id/expenses", authenticateToken, async (req: any, res) => {
    try {
      const journeyId = parseInt(req.params.id);
      const expenses = await storage.getExpensesByJourneyForUser(journeyId, req.user.role);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", authenticateToken, async (req: any, res) => {
    try {
      console.log("Expense creation request body:", req.body);
      
      // Convert amount to string if it's a number
      const requestBody = {
        ...req.body,
        amount: typeof req.body.amount === 'number' ? req.body.amount.toString() : req.body.amount
      };
      
      const expenseData = insertExpenseSchema.parse(requestBody);
      console.log("Parsed expense data:", expenseData);
      const expense = await storage.createExpense(expenseData);
      console.log("Created expense:", expense);
      res.json(expense);
    } catch (error) {
      console.error("Expense creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense", error: error.message });
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

  app.get("/api/debug/expenses/:journeyId", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);
      const allExpenses = await storage.getExpensesByJourney(journeyId);
      const userFilteredExpenses = await storage.getExpensesByJourneyForUser(journeyId, req.user.role);
      res.json({
        journeyId,
        userRole: req.user.role,
        allExpenses,
        userFilteredExpenses,
        count: {
          all: allExpenses.length,
          filtered: userFilteredExpenses.length
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to debug expenses" });
    }
  });

  // Diagnostic endpoint to find journeys with missing expense records
  app.get("/api/admin/diagnose-expense-discrepancy", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const result = await db
        .select({
          journeyId: journeys.id,
          licensePlate: journeys.licensePlate,
          destination: journeys.destination,
          totalExpenses: journeys.totalExpenses,
          expenseCount: sql<number>`COUNT(${expenses.id})`,
          calculatedTotal: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`
        })
        .from(journeys)
        .leftJoin(expenses, eq(journeys.id, expenses.journeyId))
        .groupBy(journeys.id, journeys.licensePlate, journeys.destination, journeys.totalExpenses)
        .having(sql`(${journeys.totalExpenses} > 0 AND COUNT(${expenses.id}) = 0) OR 
                   (${journeys.totalExpenses} != COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0))`);
      
      res.json({
        discrepancies: result,
        summary: {
          totalDiscrepancies: result.length,
          message: result.length > 0 ? 
            "Found journeys with expense discrepancies" : 
            "No expense discrepancies found"
        }
      });
    } catch (error) {
      console.error("Diagnostic error:", error);
      res.status(500).json({ message: "Failed to diagnose expense discrepancies" });
    }
  });

  // Salary management routes
  app.get("/api/salaries", authenticateToken, async (req, res) => {
    try {
      const payments = await storage.getSalaryPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch salary payments" });
    }
  });

  app.post("/api/salaries/pay", authenticateToken, async (req, res) => {
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

  app.post("/api/salaries/reset", authenticateToken, async (req, res) => {
    try {
      await storage.resetSalaryData();
      res.json({ message: "Salary data reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset salary data" });
    }
  });

  // Update user salary
  app.put("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { salary } = req.body;
      
      if (!salary || isNaN(parseFloat(salary))) {
        return res.status(400).json({ message: "Valid salary amount is required" });
      }

      await storage.updateUserSalary(userId, salary);
      res.json({ message: "User salary updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user salary" });
    }
  });

  // Admin editing routes
  app.put("/api/admin/journeys/:id/financials", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const journeyId = parseInt(req.params.id);
      const { pouch, security } = req.body;
      
      await storage.updateJourneyFinancials(journeyId, { pouch, security });
      res.json({ message: "Journey financials updated successfully" });
    } catch (error) {
      console.error("Failed to update journey financials:", error);
      res.status(500).json({ message: "Failed to update journey financials" });
    }
  });

  app.put("/api/admin/expenses/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const { amount, description, category } = req.body;
      
      await storage.updateExpense(expenseId, { amount, description, category });
      res.json({ message: "Expense updated successfully" });
    } catch (error) {
      console.error("Failed to update expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/admin/expenses/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      
      await storage.deleteExpense(expenseId);
      res.json({ message: "Expense deleted successfully" });
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

  const httpServer = createServer(app);
  return httpServer;
}
