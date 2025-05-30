import { users, vehicles, journeys, expenses, salaryPayments, type User, type InsertUser, type Vehicle, type InsertVehicle, type Journey, type InsertJourney, type Expense, type InsertExpense, type SalaryPayment, type InsertSalaryPayment } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, not } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Vehicle methods
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  getAllVehicles(): Promise<Vehicle[]>;
  deleteVehicle(id: number): Promise<void>;
  updateVehicleStatus(id: number, status: string): Promise<void>;
  
  // Journey methods
  createJourney(journey: InsertJourney): Promise<Journey>;
  getAllJourneys(): Promise<Journey[]>;
  getActiveJourneys(): Promise<Journey[]>;
  getJourneysByDriver(driverId: number): Promise<Journey[]>;
  updateJourneyStatus(id: number, status: string): Promise<void>;
  updateJourneyLocation(id: number, location: any, speed: number, distance: number): Promise<void>;
  completeJourney(id: number): Promise<void>;
  
  // Expense methods
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpensesByJourney(journeyId: number): Promise<Expense[]>;
  getExpensesByJourneyForUser(journeyId: number, userRole: string): Promise<Expense[]>;
  getAllExpenses(): Promise<Expense[]>;
  
  // Salary methods
  createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment>;
  getSalaryPayments(): Promise<SalaryPayment[]>;
  
  // Dashboard stats
  getDashboardStats(): Promise<any>;
  getFinancialStats(): Promise<any>;
  
  // Reset methods
  resetAllFinancialData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db
      .insert(vehicles)
      .values(vehicle)
      .returning();
    return newVehicle;
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles).orderBy(desc(vehicles.addedOn));
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  async updateVehicleStatus(id: number, status: string): Promise<void> {
    await db.update(vehicles).set({ status }).where(eq(vehicles.id, id));
  }

  async createJourney(journey: InsertJourney): Promise<Journey> {
    const [newJourney] = await db
      .insert(journeys)
      .values({
        ...journey,
        balance: journey.pouch + (journey.security || 0),
      })
      .returning();
    
    // Update vehicle status to in_use
    if (journey.vehicleId) {
      await this.updateVehicleStatus(journey.vehicleId, 'in_use');
    }
    
    return newJourney;
  }

  async getAllJourneys(): Promise<Journey[]> {
    // Limit to recent 50 journeys for better performance
    return await db.select().from(journeys).orderBy(desc(journeys.startTime)).limit(50);
  }

  async getActiveJourneys(): Promise<Journey[]> {
    return await db.select().from(journeys).where(eq(journeys.status, 'active'));
  }

  async getJourneysByDriver(driverId: number): Promise<Journey[]> {
    // Limit to recent 30 journeys for better performance
    return await db.select().from(journeys).where(eq(journeys.driverId, driverId)).orderBy(desc(journeys.startTime)).limit(30);
  }

  async updateJourneyStatus(id: number, status: string): Promise<void> {
    await db.update(journeys).set({ status }).where(eq(journeys.id, id));
  }

  async updateJourneyLocation(id: number, location: any, speed: number, distance: number): Promise<void> {
    await db.update(journeys).set({
      currentLocation: location,
      speed,
      distanceCovered: distance.toString(),
    }).where(eq(journeys.id, id));
  }

  async completeJourney(id: number): Promise<void> {
    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    if (journey && journey.vehicleId) {
      await this.updateVehicleStatus(journey.vehicleId, 'available');
    }
    
    await db.update(journeys).set({
      status: 'completed',
      endTime: new Date(),
    }).where(eq(journeys.id, id));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    // Mark as company secret if category is toll or hyd_inward
    const isSecret = expense.category === 'toll' || expense.category === 'hyd_inward';
    
    const [newExpense] = await db
      .insert(expenses)
      .values({
        ...expense,
        isCompanySecret: isSecret
      })
      .returning();
    
    // Update journey totals
    await this.updateJourneyTotals(expense.journeyId!);
    
    return newExpense;
  }

  async getExpensesByJourney(journeyId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.journeyId, journeyId)).orderBy(desc(expenses.timestamp));
  }

  async getExpensesByJourneyForUser(journeyId: number, userRole: string): Promise<Expense[]> {
    if (userRole === 'admin') {
      // Admin sees all expenses
      return await db.select().from(expenses).where(eq(expenses.journeyId, journeyId)).orderBy(desc(expenses.timestamp));
    } else {
      // Drivers don't see company secrets (toll and hyd_inward)
      return await db.select().from(expenses)
        .where(and(eq(expenses.journeyId, journeyId), eq(expenses.isCompanySecret, false)))
        .orderBy(desc(expenses.timestamp));
    }
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.timestamp));
  }

  private async updateJourneyTotals(journeyId: number): Promise<void> {
    // Calculate actual expenses (excluding HYD Inward which goes directly to profit)
    const [expenseResult] = await db
      .select({
        totalExpenses: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(and(
        eq(expenses.journeyId, journeyId), 
        not(eq(expenses.category, 'hyd_inward')),
        not(eq(expenses.category, 'top_up'))
      ));

    // Calculate top-up separately to add to balance
    const [topUpResult] = await db
      .select({
        totalTopUp: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(and(
        eq(expenses.journeyId, journeyId), 
        eq(expenses.category, 'top_up')
      ));

    const [journey] = await db.select().from(journeys).where(eq(journeys.id, journeyId));
    
    if (journey) {
      // Ensure all values are properly converted to numbers to avoid string concatenation
      const pouchAmount = Number(journey.pouch) || 0;
      const topUpAmount = Number(topUpResult.totalTopUp) || 0;
      const expenseAmount = Number(expenseResult.totalExpenses) || 0;
      
      // Balance = pouch + top_up - actual expenses (security deposit is NOT included in balance)
      const balance = pouchAmount + topUpAmount - expenseAmount;
      
      await db.update(journeys).set({
        totalExpenses: expenseAmount.toString(),
        balance: balance.toString(),
      }).where(eq(journeys.id, journeyId));
    }
  }

  async createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment> {
    const [newPayment] = await db
      .insert(salaryPayments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getSalaryPayments(): Promise<SalaryPayment[]> {
    return await db.select().from(salaryPayments).orderBy(desc(salaryPayments.paidAt));
  }

  async getDashboardStats(): Promise<any> {
    const [vehicleStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        available: sql<number>`COUNT(*) FILTER (WHERE ${vehicles.status} = 'available')`,
        inUse: sql<number>`COUNT(*) FILTER (WHERE ${vehicles.status} = 'in_use')`,
      })
      .from(vehicles);

    const [journeyStats] = await db
      .select({
        active: sql<number>`COUNT(*) FILTER (WHERE ${journeys.status} = 'active')`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${journeys.status} = 'completed')`,
        avgDistance: sql<number>`AVG(${journeys.distanceCovered})`,
      })
      .from(journeys);

    const [driverStats] = await db
      .select({
        total: sql<number>`COUNT(*) FILTER (WHERE ${users.role} = 'driver')`,
      })
      .from(users);

    return {
      vehicles: {
        total: vehicleStats.total || 0,
        available: vehicleStats.available || 0,
        inUse: vehicleStats.inUse || 0,
      },
      journeys: {
        active: journeyStats.active || 0,
        completed: journeyStats.completed || 0,
        avgDistance: Math.round(journeyStats.avgDistance || 0),
      },
      drivers: {
        total: driverStats.total || 0,
        available: (driverStats.total || 0) - (journeyStats.active || 0),
      },
    };
  }

  async getFinancialStats(): Promise<any> {
    // Calculate HYD Inward and Top-up revenue separately
    const [revenueStats] = await db
      .select({
        hydInwardRevenue: sql<number>`COALESCE(SUM(${expenses.amount}) FILTER (WHERE ${expenses.category} = 'hyd_inward'), 0)`,
        topUpRevenue: sql<number>`COALESCE(SUM(${expenses.amount}) FILTER (WHERE ${expenses.category} = 'top_up'), 0)`,
      })
      .from(expenses);

    // Calculate revenue and security deposits from journeys
    const [journeyStats] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${journeys.pouch}), 0)`,
        totalExpenses: sql<number>`COALESCE(SUM(${journeys.totalExpenses}), 0)`,
        completedSecurity: sql<number>`COALESCE(SUM(${journeys.security}) FILTER (WHERE ${journeys.status} = 'completed'), 0)`,
      })
      .from(journeys);

    // Calculate salary payments (positive) and debts received (negative) separately
    const [salaryStats] = await db
      .select({
        totalPayments: sql<number>`COALESCE(SUM(${salaryPayments.amount}) FILTER (WHERE ${salaryPayments.amount} > 0), 0)`,
        totalDebts: sql<number>`COALESCE(SUM(ABS(${salaryPayments.amount})) FILTER (WHERE ${salaryPayments.amount} < 0), 0)`,
      })
      .from(salaryPayments);

    // Net Profit = (Revenue + Completed Security Deposits - Expenses) - Salary Payments + Debts Received + HYD Inward + Top-ups
    const baseProfit = (journeyStats.totalRevenue || 0) + (journeyStats.completedSecurity || 0) - (journeyStats.totalExpenses || 0);
    const salaryAdjustment = -(salaryStats.totalPayments || 0) + (salaryStats.totalDebts || 0); // Subtract payments, add debts
    const additionalRevenue = (revenueStats.hydInwardRevenue || 0) + (revenueStats.topUpRevenue || 0);
    
    const netProfit = baseProfit + salaryAdjustment + additionalRevenue;

    // Get total security deposits for revenue display
    const [allSecurityStats] = await db
      .select({
        totalSecurity: sql<number>`COALESCE(SUM(${journeys.security}), 0)`,
      })
      .from(journeys);

    // Ensure all values are properly converted to numbers
    const totalRevenue = parseFloat(journeyStats.totalRevenue?.toString() || '0');
    const totalSecurity = parseFloat(allSecurityStats.totalSecurity?.toString() || '0');
    const totalExpenses = parseFloat(journeyStats.totalExpenses?.toString() || '0');
    const totalPayments = parseFloat(salaryStats.totalPayments?.toString() || '0');
    const totalDebts = parseFloat(salaryStats.totalDebts?.toString() || '0');
    const hydInward = parseFloat(revenueStats.hydInwardRevenue?.toString() || '0');
    const topUp = parseFloat(revenueStats.topUpRevenue?.toString() || '0');
    
    const calculatedNetProfit = (totalRevenue + totalSecurity - totalExpenses - totalPayments + totalDebts + hydInward + topUp);

    return {
      revenue: totalRevenue + totalSecurity,
      expenses: totalExpenses,
      netProfit: isNaN(calculatedNetProfit) ? 0 : calculatedNetProfit,
      salaryStats: {
        totalPayments: totalPayments,
        totalDebts: totalDebts,
        netSalaryImpact: totalPayments - totalDebts,
      },
      breakdown: {
        journeyRevenue: totalRevenue,
        securityDeposits: totalSecurity,
        hydInwardRevenue: hydInward,
        topUpRevenue: topUp,
        journeyExpenses: totalExpenses,
        salaryPayments: totalPayments,
        salaryDebts: totalDebts,
      }
    };
  }

  async resetAllFinancialData(): Promise<void> {
    // Delete all financial data in the correct order (respecting foreign key constraints)
    await db.delete(expenses);
    await db.delete(journeys);
    await db.delete(salaryPayments);
    
    // Reset vehicle statuses to available
    await db.update(vehicles).set({ status: 'available' });
  }
}

export const storage = new DatabaseStorage();
