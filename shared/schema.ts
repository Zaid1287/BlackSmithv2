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
  addedOn: timestamp("added_on").defaultNow(),
});

export const journeys = pgTable("journeys", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  licensePlate: text("license_plate").notNull(),
  destination: text("destination").notNull(),
  pouch: decimal("pouch", { precision: 10, scale: 2 }).notNull(),
  security: decimal("security", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("active"), // "active", "completed", "cancelled"
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  currentLocation: jsonb("current_location"), // {lat, lng, address}
  speed: integer("speed").default(0),
  distanceCovered: decimal("distance_covered", { precision: 10, scale: 2 }).default("0"),
  totalExpenses: decimal("total_expenses", { precision: 10, scale: 2 }).default("0"),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").references(() => journeys.id),
  category: text("category").notNull(), // "fuel", "food", "toll", "maintenance", "hyd_inward", "other"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  isCompanySecret: boolean("is_company_secret").default(false), // true for HYD Inward and Toll
  timestamp: timestamp("timestamp").defaultNow(),
});

export const salaryPayments = pgTable("salary_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at").defaultNow(),
  month: text("month").notNull(),
  year: integer("year").notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  journeys: many(journeys),
  salaryPayments: many(salaryPayments),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  journeys: many(journeys),
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
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  timestamp: true,
});

export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({
  id: true,
  paidAt: true,
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
