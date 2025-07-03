import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("driver"), // "admin" or "driver"
  salary: decimal("salary", { precision: 10, scale: 2 }).default("9000"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  licensePlate: text("license_plate").notNull().unique(),
  model: text("model").notNull(),
  status: text("status").notNull().default("available"), // "available", "in_use"
  monthlyEmi: decimal("monthly_emi", { precision: 15, scale: 2 }).default("0"),
  addedOn: timestamp("added_on").defaultNow(),
});

export const journeys = pgTable("journeys", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  licensePlate: text("license_plate").notNull(),
  destination: text("destination").notNull(),
  pouch: decimal("pouch", { precision: 15, scale: 2 }).notNull(),
  security: decimal("security", { precision: 15, scale: 2 }).default("0"),
  status: text("status").notNull().default("active"), // "active", "completed", "cancelled"
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  currentLocation: jsonb("current_location"), // {lat, lng, address}
  speed: integer("speed").default(0),
  distanceCovered: decimal("distance_covered", { precision: 15, scale: 2 }).default("0"),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }).default("0"),
  netProfit: decimal("net_profit", { precision: 15, scale: 2 }).default("0"),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0"),
  photos: jsonb("photos"), // Array of base64 photo strings
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").references(() => journeys.id),
  category: text("category").notNull(), // "fuel", "food", "toll", "maintenance", "hyd_inward", "other"
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  isCompanySecret: boolean("is_company_secret").default(false), // true for HYD Inward and Toll
  timestamp: timestamp("timestamp").defaultNow(),
});

export const salaryPayments = pgTable("salary_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(), // Can be positive (payment) or negative (debt)
  description: text("description"), // Optional description for the payment/debt
  transactionType: text("transaction_type").notNull().default("payment"), // "payment", "debt", "adjustment"
  paidAt: timestamp("paid_at").defaultNow(),
  month: text("month").notNull(),
  year: integer("year").notNull(),
});

export const emiPayments = pgTable("emi_payments", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paidDate: timestamp("paid_date"),
  status: text("status").notNull().default("pending"), // "pending", "paid", "overdue"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emiResetHistory = pgTable("emi_reset_history", {
  id: serial("id").primaryKey(),
  totalAmountReset: decimal("total_amount_reset", { precision: 15, scale: 2 }).notNull(),
  resetDate: timestamp("reset_date").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  journeys: many(journeys),
  salaryPayments: many(salaryPayments),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  journeys: many(journeys),
  emiPayments: many(emiPayments),
}));

export const journeysRelations = relations(journeys, ({ one, many }) => ({
  driver: one(users, {
    fields: [journeys.driverId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [journeys.vehicleId],
    references: [vehicles.id],
  }),
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  journey: one(journeys, {
    fields: [expenses.journeyId],
    references: [journeys.id],
  }),
}));

export const salaryPaymentsRelations = relations(salaryPayments, ({ one }) => ({
  user: one(users, {
    fields: [salaryPayments.userId],
    references: [users.id],
  }),
}));

export const emiPaymentsRelations = relations(emiPayments, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [emiPayments.vehicleId],
    references: [vehicles.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  addedOn: true,
});

export const insertJourneySchema = createInsertSchema(journeys).omit({
  id: true,
  startTime: true,
  endTime: true,
  totalExpenses: true,
  balance: true,
  netProfit: true,
  currentLocation: true,
  speed: true,
  distanceCovered: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  timestamp: true,
});

export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({
  id: true,
  paidAt: true,
}).extend({
  amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Please enter a valid amount"),
});

export const insertEmiPaymentSchema = createInsertSchema(emiPayments).omit({
  id: true,
  createdAt: true,
  paidDate: true,
}).extend({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid amount"),
  vehicleId: z.number(),
  description: z.string().optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Journey = typeof journeys.$inferSelect;
export type InsertJourney = z.infer<typeof insertJourneySchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type SalaryPayment = typeof salaryPayments.$inferSelect;
export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;
export type EmiPayment = typeof emiPayments.$inferSelect;
export type InsertEmiPayment = z.infer<typeof insertEmiPaymentSchema>;
