import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertVehicleSchema, insertJourneySchema, insertExpenseSchema, insertSalaryPaymentSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "blacksmith-traders-secret";

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
    req.user = user;
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

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      res.status(500).json({ message: "Initialization failed" });
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
      res.status(500).json({ message: "Login failed" });
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

  // Salary management routes
  app.get("/api/salaries", authenticateToken, async (req, res) => {
    try {
      const payments = await storage.getSalaryPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch salary payments" });
    }
  });

  app.post("/api/salaries/pay", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const paymentData = insertSalaryPaymentSchema.parse(req.body);
      const payment = await storage.createSalaryPayment(paymentData);
      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
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

  // Update user salary
  app.put("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
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
    } catch (error) {
      console.error("Reset financial data error:", error);
      res.status(500).json({ message: "Failed to reset financial data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
