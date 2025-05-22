import { pgTable, text, serial, integer, boolean, date, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("staff"), // "manager" or "staff"
  managerId: integer("manager_id").references(() => users.id),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  contact: text("contact").notNull(),
  phone: text("phone").notNull(),
  openingHours: text("opening_hours").notNull(),
  entryCode: text("entry_code"),
  siteNotes: text("site_notes"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  date: date("date").notNull(),
  status: text("status").notNull().default("assigned"), // "assigned", "in_progress", "completed"
  assignedToId: integer("assigned_to_id").notNull().references(() => users.id),
  plantCount: integer("plant_count").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPatternId: integer("recurring_pattern_id").references(() => recurringPatterns.id),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
});

// Recurring patterns table
export const recurringPatterns = pgTable("recurring_patterns", {
  id: serial("id").primaryKey(),
  frequency: text("frequency").notNull(), // "daily", "weekly", "biweekly", "monthly", "custom"
  customInterval: integer("custom_interval"), // Number of days if custom
  daysOfWeek: jsonb("days_of_week"), // Array of days of week for weekly/monthly
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  endAfterOccurrences: integer("end_after_occurrences"),
});

export const insertRecurringPatternSchema = createInsertSchema(recurringPatterns).omit({
  id: true,
});

// Job groups table
export const jobGroups = pgTable("job_groups", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  name: text("name").notNull(),
});

export const insertJobGroupSchema = createInsertSchema(jobGroups).omit({
  id: true,
});

// Service points table
export const servicePoints = pgTable("service_points", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  groupId: integer("group_id").references(() => jobGroups.id),
  plantType: text("plant_type"),
  potType: text("pot_type"),
  status: text("status").notNull().default("pending"), // "pending", "completed"
});

export const insertServicePointSchema = createInsertSchema(servicePoints).omit({
  id: true,
});

// Message logs table
export const messageLogs = pgTable("message_logs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  groupId: integer("group_id").references(() => jobGroups.id),
  servicePointId: integer("service_point_id").references(() => servicePoints.id),
  userId: integer("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  notifyManagement: boolean("notify_management").notNull().default(false),
  status: text("status").notNull().default("unread"), // "unread", "read"
});

export const insertMessageLogSchema = createInsertSchema(messageLogs).omit({
  id: true,
  timestamp: true,
});

// Define relations between tables
export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id]
  }),
  staff: many(users, {
    relationName: "manager"
  }),
  assignedJobs: many(jobs, {
    relationName: "assignedTo"
  }),
  messageLogs: many(messageLogs, {
    relationName: "user"
  })
}));

export const customersRelations = relations(customers, ({ many }) => ({
  jobs: many(jobs, {
    relationName: "customer"
  })
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(customers, {
    fields: [jobs.customerId],
    references: [customers.id]
  }),
  assignedTo: one(users, {
    fields: [jobs.assignedToId],
    references: [users.id]
  }),
  recurringPattern: one(recurringPatterns, {
    fields: [jobs.recurringPatternId],
    references: [recurringPatterns.id]
  }),
  jobGroups: many(jobGroups, {
    relationName: "job"
  }),
  servicePoints: many(servicePoints, {
    relationName: "job"
  }),
  messageLogs: many(messageLogs, {
    relationName: "job"
  })
}));

export const recurringPatternsRelations = relations(recurringPatterns, ({ many }) => ({
  jobs: many(jobs, {
    relationName: "recurringPattern"
  })
}));

export const jobGroupsRelations = relations(jobGroups, ({ one, many }) => ({
  job: one(jobs, {
    fields: [jobGroups.jobId],
    references: [jobs.id]
  }),
  servicePoints: many(servicePoints, {
    relationName: "group"
  }),
  messageLogs: many(messageLogs, {
    relationName: "group"
  })
}));

export const servicePointsRelations = relations(servicePoints, ({ one, many }) => ({
  job: one(jobs, {
    fields: [servicePoints.jobId],
    references: [jobs.id]
  }),
  group: one(jobGroups, {
    fields: [servicePoints.groupId],
    references: [jobGroups.id]
  }),
  messageLogs: many(messageLogs, {
    relationName: "servicePoint"
  })
}));

export const messageLogsRelations = relations(messageLogs, ({ one }) => ({
  job: one(jobs, {
    fields: [messageLogs.jobId],
    references: [jobs.id]
  }),
  group: one(jobGroups, {
    fields: [messageLogs.groupId],
    references: [jobGroups.id]
  }),
  servicePoint: one(servicePoints, {
    fields: [messageLogs.servicePointId],
    references: [servicePoints.id]
  }),
  user: one(users, {
    fields: [messageLogs.userId],
    references: [users.id]
  })
}));

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type RecurringPattern = typeof recurringPatterns.$inferSelect;
export type InsertRecurringPattern = z.infer<typeof insertRecurringPatternSchema>;

export type JobGroup = typeof jobGroups.$inferSelect;
export type InsertJobGroup = z.infer<typeof insertJobGroupSchema>;

export type ServicePoint = typeof servicePoints.$inferSelect;
export type InsertServicePoint = z.infer<typeof insertServicePointSchema>;

export type MessageLog = typeof messageLogs.$inferSelect;
export type InsertMessageLog = z.infer<typeof insertMessageLogSchema>;
