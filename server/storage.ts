import { users, vehicles, journeys, expenses, salaryPayments, emiPayments, emiResetHistory, type User, type InsertUser, type Vehicle, type InsertVehicle, type Journey, type InsertJourney, type Expense, type InsertExpense, type SalaryPayment, type InsertSalaryPayment, type EmiPayment, type InsertEmiPayment } from "@shared/schema";
import { db, safeDb, isConnected } from "./db";
import { eq, desc, and, sql, not } from "drizzle-orm";
import bcrypt from "bcrypt";

// Helper function to handle database operations with graceful degradation
function withDatabase<T>(operation: () => Promise<T>, fallback?: T): Promise<T> {
  if (!isConnected) {
    if (fallback !== undefined) {
      console.warn('Database unavailable, returning fallback value');
      return Promise.resolve(fallback);
    }
    return Promise.reject(new Error('Database unavailable - please try again later'));
  }
  
  return operation().catch(error => {
    console.error('Database operation failed:', error);
    if (fallback !== undefined) {
      console.warn('Using fallback value due to database error');
      return fallback;
    }
    throw new Error('Database operation failed - please try again later');
  });
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: { username?: string; name?: string; role?: string; password?: string }): Promise<void>;
  updateUserSalary(id: number, salary: string): Promise<void>;
  
  // Vehicle methods
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  getAllVehicles(): Promise<Vehicle[]>;
  deleteVehicle(id: number): Promise<void>;
  updateVehicle(id: number, data: { licensePlate?: string; model?: string; status?: string }): Promise<void>;
  updateVehicleStatus(id: number, status: string): Promise<void>;
  updateVehicleMonthlyEmi(id: number, monthlyEmi: string): Promise<void>;
  
  // Journey methods
  createJourney(journey: InsertJourney): Promise<Journey>;
  getAllJourneys(): Promise<Journey[]>;
  getActiveJourneys(): Promise<Journey[]>;
  getJourneysByDriver(driverId: number): Promise<Journey[]>;
  getJourneyPhotos(id: number): Promise<string[] | null>;
  updateJourneyStatus(id: number, status: string): Promise<void>;
  updateJourneyLocation(id: number, location: any, speed: number, distance: number): Promise<void>;
  completeJourney(id: number): Promise<void>;
  updateJourneyFinancials(id: number, data: { pouch?: string; security?: string }): Promise<void>;
  deleteJourney(id: number): Promise<void>;
  
  // Expense methods
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpensesByJourney(journeyId: number): Promise<Expense[]>;
  getExpensesByJourneyForUser(journeyId: number, userRole: string): Promise<Expense[]>;
  getAllExpenses(): Promise<Expense[]>;
  updateExpense(id: number, data: { amount?: string; description?: string; category?: string }): Promise<void>;
  deleteExpense(id: number): Promise<void>;
  
  // Salary methods
  createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment>;
  getSalaryPayments(): Promise<SalaryPayment[]>;
  
  // EMI methods
  createEmiPayment(payment: InsertEmiPayment): Promise<EmiPayment>;
  getAllEmiPayments(): Promise<EmiPayment[]>;
  updateEmiPaymentStatus(id: number, status: string, paidDate?: Date): Promise<void>;
  deleteEmiPayment(id: number): Promise<void>;
  
  // Dashboard stats
  getDashboardStats(): Promise<any>;
  getFinancialStats(): Promise<any>;
  
  // Reset methods
  resetAllFinancialData(): Promise<void>;
  resetSalaryData(): Promise<void>;
  resetEmiData(): Promise<void>;
  
  // Update journey totals method
  updateJourneyTotals(journeyId: number): Promise<void>;
  
  // Comprehensive financial recalculation method
  recalculateAllFinancials(): Promise<{ totalExpenses: number; affectedJourneys: number; message: string }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    if (!db) {
      console.warn("Database not connected - returning undefined for development");
      return undefined;
    }
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) {
      console.warn("Database not connected - returning undefined for development");
      return undefined;
    }
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) {
      // Return a mock user for development mode
      const hashedPassword = await bcrypt.hash(insertUser.password, 10);
      return {
        id: 1,
        username: insertUser.username,
        name: insertUser.name,
        role: insertUser.role || 'driver',
        password: hashedPassword,
        salary: insertUser.salary || '0',
        createdAt: new Date(),
        updatedAt: new Date()
      } as User;
    }
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

  async updateUser(id: number, data: { username?: string; name?: string; role?: string; password?: string }): Promise<void> {
    const updateData: any = {};
    
    if (data.username) updateData.username = data.username;
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await db.update(users).set(updateData).where(eq(users.id, id));
  }

  async updateUserSalary(id: number, salary: string): Promise<void> {
    await db.update(users).set({ salary }).where(eq(users.id, id));
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db
      .insert(vehicles)
      .values(vehicle)
      .returning();
    return newVehicle;
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return await withDatabase(async () => {
      return await db.select().from(vehicles).orderBy(desc(vehicles.addedOn));
    }, []);
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  async updateVehicleStatus(id: number, status: string): Promise<void> {
    await db.update(vehicles).set({ status }).where(eq(vehicles.id, id));
  }

  async updateVehicle(id: number, data: { licensePlate?: string; model?: string; status?: string }): Promise<void> {
    const updateData: any = {};
    
    if (data.licensePlate) updateData.licensePlate = data.licensePlate;
    if (data.model) updateData.model = data.model;
    if (data.status) updateData.status = data.status;

    await db.update(vehicles).set(updateData).where(eq(vehicles.id, id));
  }

  async updateVehicleMonthlyEmi(id: number, monthlyEmi: string): Promise<void> {
    await db.update(vehicles).set({ monthlyEmi }).where(eq(vehicles.id, id));
  }

  async createJourney(journey: InsertJourney): Promise<Journey> {
    // Only insert the fields that should be provided during journey creation
    // Other fields have database defaults or are calculated
    const insertData = {
      driverId: journey.driverId,
      vehicleId: journey.vehicleId,
      licensePlate: journey.licensePlate,
      destination: journey.destination,
      pouch: journey.pouch,
      security: journey.security || "0",
      photos: journey.photos || null,
      // balance is set to pouch amount initially
      balance: journey.pouch.toString(),
    };

    const [newJourney] = await db
      .insert(journeys)
      .values(insertData)
      .returning();
    
    // Update vehicle status to in_use
    if (journey.vehicleId) {
      await this.updateVehicleStatus(journey.vehicleId, 'in_use');
    }
    
    return newJourney;
  }

  async getAllJourneys(): Promise<Journey[]> {
    // Use the same structure as getJourneysByDriver for consistency
    const result = await db
      .select({
        id: journeys.id,
        driverId: journeys.driverId,
        vehicleId: journeys.vehicleId,
        licensePlate: journeys.licensePlate,
        destination: journeys.destination,
        startTime: journeys.startTime,
        endTime: journeys.endTime,
        status: journeys.status,
        pouch: journeys.pouch,
        security: journeys.security,
        totalExpenses: journeys.totalExpenses,
        balance: journeys.balance,
        currentLocation: journeys.currentLocation,
        speed: journeys.speed,
        distanceCovered: journeys.distanceCovered,
        // Include photos indicator for admin
        photos: sql<boolean>`CASE WHEN ${journeys.photos} IS NOT NULL THEN true ELSE false END`.as('photos'),
        driverName: users.name,
      })
      .from(journeys)
      .leftJoin(users, eq(journeys.driverId, users.id))
      .orderBy(desc(journeys.startTime));
      // Removed limit to show all journeys for proper filtering
    
    return result as any[];
  }

  async getActiveJourneys(): Promise<Journey[]> {
    const result = await db
      .select({
        id: journeys.id,
        driverId: journeys.driverId,
        vehicleId: journeys.vehicleId,
        licensePlate: journeys.licensePlate,
        destination: journeys.destination,
        startTime: journeys.startTime,
        status: journeys.status,
        pouch: journeys.pouch,
        security: journeys.security,
        totalExpenses: journeys.totalExpenses,
        balance: journeys.balance,
        // Exclude photos from active journey queries to save RAM
        photos: sql<boolean>`false`.as('photos'),
        driverName: users.name,
      })
      .from(journeys)
      .leftJoin(users, eq(journeys.driverId, users.id))
      .where(eq(journeys.status, 'active'));
    
    return result as any[];
  }

  async getJourneyPhotos(id: number): Promise<string[] | null> {
    console.log(`Storage: Getting photos for journey ${id}`);
    const result = await db
      .select({ photos: journeys.photos })
      .from(journeys)
      .where(eq(journeys.id, id))
      .limit(1);
    
    console.log(`Storage: Photos result for journey ${id}:`, result[0]?.photos);
    return result[0]?.photos as string[] || null;
  }

  async getJourneysByDriver(driverId: number): Promise<Journey[]> {
    // Limit to recent 15 journeys and exclude photos for RAM efficiency
    const result = await db
      .select({
        id: journeys.id,
        driverId: journeys.driverId,
        vehicleId: journeys.vehicleId,
        licensePlate: journeys.licensePlate,
        destination: journeys.destination,
        startTime: journeys.startTime,
        endTime: journeys.endTime,
        status: journeys.status,
        pouch: journeys.pouch,
        security: journeys.security,
        totalExpenses: journeys.totalExpenses,
        balance: journeys.balance,
        currentLocation: journeys.currentLocation,
        speed: journeys.speed,
        distanceCovered: journeys.distanceCovered,
        // No photos for driver queries to save RAM
        photos: sql<boolean>`false`.as('photos'),
      })
      .from(journeys)
      .where(eq(journeys.driverId, driverId))
      .orderBy(desc(journeys.startTime))
      .limit(15);
    
    return result as any[];
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
    return await db.select().from(expenses).where(eq(expenses.journeyId, journeyId)).orderBy(desc(expenses.timestamp)).limit(50);
  }

  async getExpensesByJourneyForUser(journeyId: number, userRole: string): Promise<Expense[]> {
    if (userRole === 'admin') {
      // Admin sees all expenses (limited for RAM efficiency)
      return await db.select().from(expenses).where(eq(expenses.journeyId, journeyId)).orderBy(desc(expenses.timestamp)).limit(50);
    } else {
      // Drivers don't see company secrets (toll and hyd_inward)
      return await db.select().from(expenses)
        .where(and(eq(expenses.journeyId, journeyId), eq(expenses.isCompanySecret, false)))
        .orderBy(desc(expenses.timestamp))
        .limit(30);
    }
  }

  async getAllExpenses(): Promise<Expense[]> {
    // Limit to recent 50 expenses for better performance on Render
    return await db.select().from(expenses).orderBy(desc(expenses.timestamp)).limit(50);
  }

  async updateJourneyTotals(journeyId: number): Promise<void> {
    // Get all expenses for this journey (same as expense breakdown view)
    const journeyExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.journeyId, journeyId));
    
    // Calculate total expenses exactly like the expense breakdown view
    // These are revenue items that should be excluded from expense calculation
    const revenueCategories = ['hyd_inward', 'top_up'];
    
    // Calculate business expenses (excluding revenue categories)
    const businessExpenses = journeyExpenses.filter((expense: any) => !revenueCategories.includes(expense.category));
    const totalBusinessExpenses = businessExpenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
    
    // Calculate top-up separately (revenue category that adds to balance)
    const topUpExpenses = journeyExpenses.filter((expense: any) => expense.category === 'top_up');
    const totalTopUp = topUpExpenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
    
    // Get journey details to calculate balance
    const [journey] = await db.select().from(journeys).where(eq(journeys.id, journeyId));
    if (!journey) return;
    
    // Calculate balance exactly like expense breakdown: pouch + top_up - business expenses
    const pouch = parseFloat(journey.pouch);
    const security = parseFloat(journey.security || '0');
    
    // Only add security to balance if journey is completed
    const securityAddition = journey.status === 'completed' ? security : 0;
    const balance = pouch + totalTopUp + securityAddition - totalBusinessExpenses;
    
    console.log(`Journey ${journeyId}: Business expenses=${totalBusinessExpenses}, Top-up=${totalTopUp}, Balance=${balance}`);
    
    // Update journey totals with recalculated values
    await db
      .update(journeys)
      .set({
        totalExpenses: totalBusinessExpenses.toString(),
        balance: balance.toString(),
      })
      .where(eq(journeys.id, journeyId));
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

    // Calculate revenue from journeys separately
    const [journeyStats] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${journeys.pouch}), 0)`,
        completedSecurity: sql<number>`COALESCE(SUM(${journeys.security}) FILTER (WHERE ${journeys.status} = 'completed'), 0)`,
      })
      .from(journeys);

    // Calculate total expenses (excluding hyd_inward, top_up, and toll - company secrets, but including RTO)
    const [visibleExpenseStats] = await db
      .select({
        totalExpenses: sql<number>`COALESCE(SUM(${expenses.amount}) FILTER (WHERE ${expenses.category} NOT IN ('hyd_inward', 'top_up', 'toll')), 0)`,
      })
      .from(expenses);

    // Calculate salary payments (positive) and debts received (negative) separately
    const [salaryStats] = await db
      .select({
        totalPayments: sql<number>`COALESCE(SUM(${salaryPayments.amount}) FILTER (WHERE ${salaryPayments.amount} > 0), 0)`,
        totalDebts: sql<number>`COALESCE(SUM(ABS(${salaryPayments.amount})) FILTER (WHERE ${salaryPayments.amount} < 0), 0)`,
      })
      .from(salaryPayments);

    // Calculate total EMI payments
    const [emiStats] = await db
      .select({
        totalEmiPayments: sql<number>`COALESCE(SUM(${emiPayments.amount}), 0)`,
      })
      .from(emiPayments);

    // Calculate total EMI reset amounts to prevent adding money back during resets
    const [emiResetStats] = await db
      .select({
        totalResetAmount: sql<number>`COALESCE(SUM(${emiResetHistory.totalAmountReset}), 0)`,
      })
      .from(emiResetHistory);

    // Net Profit = (Revenue + Completed Security Deposits - Expenses) - Salary Payments + Debts Received + HYD Inward + Top-ups - EMI Payments - Reset EMI amounts
    // EMI payments reduce profit when made, reset amounts keep the deduction permanent
    const baseProfit = (journeyStats.totalRevenue || 0) + (journeyStats.completedSecurity || 0) - (visibleExpenseStats.totalExpenses || 0);
    const salaryAdjustment = -(salaryStats.totalPayments || 0) + (salaryStats.totalDebts || 0); // Subtract payments, add debts
    const additionalRevenue = (revenueStats.hydInwardRevenue || 0) + (revenueStats.topUpRevenue || 0);
    const emiAdjustment = -(emiStats.totalEmiPayments || 0) - (emiResetStats.totalResetAmount || 0); // Subtract current EMI payments and reset amounts
    
    const netProfit = baseProfit + salaryAdjustment + additionalRevenue + emiAdjustment;

    // Get total security deposits for revenue display
    const [allSecurityStats] = await db
      .select({
        totalSecurity: sql<number>`COALESCE(SUM(${journeys.security}), 0)`,
      })
      .from(journeys);

    // Ensure all values are properly converted to numbers
    const totalRevenue = parseFloat(journeyStats.totalRevenue?.toString() || '0');
    const totalSecurity = parseFloat(allSecurityStats.totalSecurity?.toString() || '0');
    const totalExpenses = parseFloat(visibleExpenseStats.totalExpenses?.toString() || '0');
    const totalPayments = parseFloat(salaryStats.totalPayments?.toString() || '0');
    const totalDebts = parseFloat(salaryStats.totalDebts?.toString() || '0');
    const hydInward = parseFloat(revenueStats.hydInwardRevenue?.toString() || '0');
    const topUp = parseFloat(revenueStats.topUpRevenue?.toString() || '0');
    const totalEmiPayments = parseFloat(emiStats.totalEmiPayments?.toString() || '0');
    
    // Calculate net profit including salary expenses and EMI payments
    const totalEmiResetAmount = parseFloat(emiResetStats.totalResetAmount?.toString() || '0');
    
    // Calculate toll expenses separately to subtract from net profit
    const [tollExpenseStats] = await db
      .select({
        totalTollExpenses: sql<number>`COALESCE(SUM(${expenses.amount}) FILTER (WHERE ${expenses.category} = 'toll'), 0)`,
      })
      .from(expenses);
    
    const tollExpenses = parseFloat(tollExpenseStats.totalTollExpenses?.toString() || '0');
    const businessTotalExpenses = totalExpenses; // Use visible expenses (already excludes toll)
    
    // Get the actual sum of all expenses from expense records for accurate calculation
    const [actualExpenseStats] = await db
      .select({
        totalActualExpenses: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses);
    
    const actualTotalExpenses = parseFloat(actualExpenseStats.totalActualExpenses?.toString() || '0');
    
    // Calculate all business expenses including company secrets for accurate net profit
    const allBusinessExpenses = actualTotalExpenses - hydInward - topUp; // Remove revenue categories
    
    // Simplified net profit calculation: Total Revenue - Total Expenses
    // Total expenses include: all business expenses + salary payments + EMI payments
    const totalBusinessExpenses = allBusinessExpenses + totalPayments + totalEmiPayments + totalEmiResetAmount - totalDebts;
    const totalRevenueAmount = totalRevenue + totalSecurity + hydInward + topUp;
    const calculatedNetProfit = totalRevenueAmount - totalBusinessExpenses;

    // Display actual calculated total expenses
    const displayExpenses = totalBusinessExpenses;
    const displayNetProfit = calculatedNetProfit;

    return {
      revenue: totalRevenue + totalSecurity + hydInward + topUp,
      expenses: displayExpenses,
      netProfit: displayNetProfit,
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
        emiPayments: totalEmiPayments,
        tollExpenses: tollExpenses,
      },
      emiStats: {
        totalEmiPayments: totalEmiPayments,
      }
    };
  }

  async resetAllFinancialData(): Promise<void> {
    // Check for unpaid salary obligations before reset
    const allUsers = await this.getAllUsers();
    const allSalaryPayments = await this.getSalaryPayments();
    
    let hasUnpaidSalaries = false;
    for (const user of allUsers) {
      if (user.role === 'driver' && parseFloat(user.salary || '0') > 0) {
        const userPayments = allSalaryPayments.filter(p => p.userId === user.id);
        const totalPaid = userPayments
          .filter(p => parseFloat(p.amount) > 0)
          .reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalDeductions = userPayments
          .filter(p => parseFloat(p.amount) < 0)
          .reduce((sum, p) => sum + Math.abs(parseFloat(p.amount)), 0);
        const balance = parseFloat(user.salary || '0') - totalPaid + totalDeductions;
        
        if (balance > 0) {
          hasUnpaidSalaries = true;
          break;
        }
      }
    }
    
    if (hasUnpaidSalaries) {
      throw new Error('Cannot reset financial data while there are unpaid salary obligations. Please pay all salaries first.');
    }
    
    // Delete all financial data in the correct order (respecting foreign key constraints)
    // 1. Delete expenses first (they reference journeys)
    await db.delete(expenses);
    // 2. Delete journeys (they reference users and vehicles)  
    await db.delete(journeys);
    // 3. Delete salary payments (they reference users)
    await db.delete(salaryPayments);
    // 4. Delete EMI payments and reset history
    await db.delete(emiPayments);
    await db.delete(emiResetHistory);
    
    // Reset vehicle statuses to available
    await db.update(vehicles).set({ status: 'available' });
  }

  async resetSalaryData(): Promise<void> {
    // Mark existing payments as "reset" by updating their transactionType
    // This preserves them for profit calculations but excludes them from salary balance calculations
    await db.update(salaryPayments)
      .set({ transactionType: 'reset_archived' })
      .where(not(eq(salaryPayments.transactionType, 'reset_archived')));
  }

  async createEmiPayment(payment: InsertEmiPayment): Promise<EmiPayment> {
    const [newPayment] = await db
      .insert(emiPayments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getAllEmiPayments(): Promise<EmiPayment[]> {
    return await db.select().from(emiPayments).orderBy(desc(emiPayments.createdAt));
  }

  async updateEmiPaymentStatus(id: number, status: string, paidDate?: Date): Promise<void> {
    await db.update(emiPayments)
      .set({ 
        status,
        paidDate: paidDate ? paidDate : null
      })
      .where(eq(emiPayments.id, id));
  }

  async deleteEmiPayment(id: number): Promise<void> {
    await db.delete(emiPayments).where(eq(emiPayments.id, id));
  }

  async resetEmiData(): Promise<void> {
    // Calculate total EMI payments before reset to track permanently
    const [totalPaid] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${emiPayments.amount}), 0)`
      })
      .from(emiPayments);
    
    // Record the reset amount to keep EMI deduction permanent
    if (totalPaid.total > 0) {
      await db.insert(emiResetHistory).values({
        totalAmountReset: totalPaid.total.toString(),
      });
    }
    
    // Delete all EMI payment records
    await db.delete(emiPayments);
  }

  async updateJourneyFinancials(id: number, data: { pouch?: string; security?: string }): Promise<void> {
    const updateData: any = {};
    if (data.pouch !== undefined) updateData.pouch = data.pouch;
    if (data.security !== undefined) updateData.security = data.security;
    
    await db.update(journeys)
      .set(updateData)
      .where(eq(journeys.id, id));
    
    // Recalculate journey balance after updating financials
    await this.updateJourneyTotals(id);
  }

  async updateExpense(id: number, data: { amount?: string; description?: string; category?: string }): Promise<void> {
    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    
    // Get the expense to find its journey ID for balance recalculation
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    
    await db.update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id));
    
    // Recalculate journey balance after updating expense
    if (expense && expense.journeyId !== null) {
      await this.updateJourneyTotals(expense.journeyId);
    }
  }

  async deleteExpense(id: number): Promise<void> {
    // Get the expense to find its journey ID for balance recalculation
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    
    await db.delete(expenses).where(eq(expenses.id, id));
    
    // Recalculate journey balance after deleting expense
    if (expense && expense.journeyId !== null) {
      await this.updateJourneyTotals(expense.journeyId);
    }
  }

  async deleteJourney(id: number): Promise<void> {
    // First, get the journey details before deletion
    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    if (!journey) {
      throw new Error('Journey not found');
    }

    // Delete all expenses associated with this journey first (foreign key constraint)
    await db.delete(expenses).where(eq(expenses.journeyId, id));
    
    // Delete the journey
    await db.delete(journeys).where(eq(journeys.id, id));
    
    // Update vehicle status back to available if it was in use for this journey
    if (journey.vehicleId && journey.status === 'active') {
      // Check if there are any other active journeys using this vehicle
      const activeJourneysWithVehicle = await db
        .select()
        .from(journeys)
        .where(and(
          eq(journeys.vehicleId, journey.vehicleId),
          eq(journeys.status, 'active')
        ));
      
      // If no other active journeys, set vehicle back to available
      if (activeJourneysWithVehicle.length === 0) {
        await this.updateVehicleStatus(journey.vehicleId, 'available');
      }
    }
  }

  async recalculateAllFinancials(): Promise<{ totalExpenses: number; affectedJourneys: number; message: string }> {
    try {
      // Get all journeys
      const allJourneys = await this.getAllJourneys();
      let affectedJourneys = 0;
      let totalExpensesCalculated = 0;

      console.log(`Starting comprehensive financial recalculation for ${allJourneys.length} journeys`);

      // Recalculate each journey's totals and accumulate total expenses
      for (const journey of allJourneys) {
        console.log(`Recalculating journey ${journey.id}: ${journey.destination}`);
        
        // Update journey totals (this recalculates totalExpenses for the journey)
        await this.updateJourneyTotals(journey.id);
        
        // Get the updated journey to access the recalculated totalExpenses
        const [updatedJourney] = await db.select().from(journeys).where(eq(journeys.id, journey.id));
        if (updatedJourney) {
          const journeyExpenses = parseFloat(updatedJourney.totalExpenses || '0');
          totalExpensesCalculated += journeyExpenses;
          affectedJourneys++;
        }
      }

      // Get all direct expenses (not journey-specific) for complete calculation
      const allExpenses = await this.getAllExpenses();
      const directExpenses = allExpenses
        .filter((expense: any) => expense.journeyId === null)
        .reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
      
      totalExpensesCalculated += directExpenses;

      console.log(`Comprehensive financial recalculation complete:`);
      console.log(`- Affected journeys: ${affectedJourneys}`);
      console.log(`- Total expenses calculated: ₹${totalExpensesCalculated.toLocaleString()}`);
      console.log(`- Direct expenses: ₹${directExpenses.toLocaleString()}`);

      return {
        totalExpenses: totalExpensesCalculated,
        affectedJourneys,
        message: `Financial recalculation complete: ₹${totalExpensesCalculated.toLocaleString()} total expenses across ${affectedJourneys} journeys`
      };
    } catch (error: any) {
      console.error("Comprehensive financial recalculation failed:", error);
      throw new Error(`Failed to recalculate all financials: ${error.message}`);
    }
  }
}

export const storage = new DatabaseStorage();
