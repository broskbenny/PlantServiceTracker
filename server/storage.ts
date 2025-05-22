import { 
  User, InsertUser, 
  Customer, InsertCustomer, 
  Job, InsertJob, 
  RecurringPattern, InsertRecurringPattern, 
  JobGroup, InsertJobGroup, 
  ServicePoint, InsertServicePoint, 
  MessageLog, InsertMessageLog 
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByManager(managerId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Customer operations
  getCustomer(id: number): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;

  // Job operations
  getJob(id: number): Promise<Job | undefined>;
  getJobsForManager(): Promise<Job[]>;
  getJobsForStaff(staffId: number): Promise<Job[]>;
  getJobsByDate(date: Date): Promise<Job[]>;
  getJobsForStaffByDate(staffId: number, date: Date): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<Job>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;

  // Recurring pattern operations
  getRecurringPattern(id: number): Promise<RecurringPattern | undefined>;
  createRecurringPattern(pattern: InsertRecurringPattern): Promise<RecurringPattern>;
  updateRecurringPattern(id: number, pattern: Partial<RecurringPattern>): Promise<RecurringPattern | undefined>;
  deleteRecurringPattern(id: number): Promise<boolean>;

  // Job group operations
  getJobGroup(id: number): Promise<JobGroup | undefined>;
  getJobGroupsByJob(jobId: number): Promise<JobGroup[]>;
  createJobGroup(group: InsertJobGroup): Promise<JobGroup>;
  updateJobGroup(id: number, group: Partial<JobGroup>): Promise<JobGroup | undefined>;
  deleteJobGroup(id: number): Promise<boolean>;

  // Service point operations
  getServicePoint(id: number): Promise<ServicePoint | undefined>;
  getServicePointsByJob(jobId: number): Promise<ServicePoint[]>;
  getServicePointsByGroup(groupId: number): Promise<ServicePoint[]>;
  createServicePoint(point: InsertServicePoint): Promise<ServicePoint>;
  updateServicePoint(id: number, point: Partial<ServicePoint>): Promise<ServicePoint | undefined>;
  deleteServicePoint(id: number): Promise<boolean>;

  // Message log operations
  getMessageLog(id: number): Promise<MessageLog | undefined>;
  getMessageLogsByJob(jobId: number): Promise<MessageLog[]>;
  getMessageLogsRequiringAttention(): Promise<MessageLog[]>;
  createMessageLog(log: InsertMessageLog): Promise<MessageLog>;
  updateMessageLog(id: number, log: Partial<MessageLog>): Promise<MessageLog | undefined>;
  deleteMessageLog(id: number): Promise<boolean>;

  // Complex operations
  getJobWithDetails(jobId: number): Promise<{
    job: Job;
    customer: Customer;
    groups: Array<{
      group: JobGroup;
      servicePoints: ServicePoint[];
    }>;
    servicePoints: ServicePoint[];
    assignedTo: User;
  } | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private customers: Map<number, Customer>;
  private jobs: Map<number, Job>;
  private recurringPatterns: Map<number, RecurringPattern>;
  private jobGroups: Map<number, JobGroup>;
  private servicePoints: Map<number, ServicePoint>;
  private messageLogs: Map<number, MessageLog>;
  
  private currentIds: {
    users: number;
    customers: number;
    jobs: number;
    recurringPatterns: number;
    jobGroups: number;
    servicePoints: number;
    messageLogs: number;
  };

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.jobs = new Map();
    this.recurringPatterns = new Map();
    this.jobGroups = new Map();
    this.servicePoints = new Map();
    this.messageLogs = new Map();
    
    this.currentIds = {
      users: 1,
      customers: 1,
      jobs: 1,
      recurringPatterns: 1,
      jobGroups: 1,
      servicePoints: 1,
      messageLogs: 1,
    };
    
    // Create initial manager user
    this.createUser({
      username: "manager",
      password: "$2b$10$ETwdCD6/HBIxLQX2AaUWwOq9bkB4eYY8aNX7DIclHhgTlY2PJIkeK", // hashed "password123"
      fullName: "Manager User",
      email: "manager@example.com",
      role: "manager",
      managerId: null
    });
    
    // Create initial staff user
    this.createUser({
      username: "staff",
      password: "$2b$10$ETwdCD6/HBIxLQX2AaUWwOq9bkB4eYY8aNX7DIclHhgTlY2PJIkeK", // hashed "password123"
      fullName: "Staff User",
      email: "staff@example.com",
      role: "staff",
      managerId: 1
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUsersByManager(managerId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.managerId === managerId,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.currentIds.customers++;
    const newCustomer: Customer = { ...customer, id };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) return undefined;
    
    const updatedCustomer = { ...existingCustomer, ...customer };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    return this.customers.delete(id);
  }

  // Job operations
  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobsForManager(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async getJobsForStaff(staffId: number): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(
      (job) => job.assignedToId === staffId,
    );
  }

  async getJobsByDate(date: Date): Promise<Job[]> {
    const formattedDate = date.toISOString().split('T')[0];
    return Array.from(this.jobs.values()).filter(
      (job) => job.date.toString() === formattedDate,
    );
  }

  async getJobsForStaffByDate(staffId: number, date: Date): Promise<Job[]> {
    const formattedDate = date.toISOString().split('T')[0];
    return Array.from(this.jobs.values()).filter(
      (job) => job.assignedToId === staffId && job.date.toString() === formattedDate,
    );
  }

  async createJob(job: InsertJob): Promise<Job> {
    const id = this.currentIds.jobs++;
    const newJob: Job = { ...job, id };
    this.jobs.set(id, newJob);
    return newJob;
  }

  async updateJob(id: number, job: Partial<Job>): Promise<Job | undefined> {
    const existingJob = this.jobs.get(id);
    if (!existingJob) return undefined;
    
    const updatedJob = { ...existingJob, ...job };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: number): Promise<boolean> {
    return this.jobs.delete(id);
  }

  // Recurring pattern operations
  async getRecurringPattern(id: number): Promise<RecurringPattern | undefined> {
    return this.recurringPatterns.get(id);
  }

  async createRecurringPattern(pattern: InsertRecurringPattern): Promise<RecurringPattern> {
    const id = this.currentIds.recurringPatterns++;
    const newPattern: RecurringPattern = { ...pattern, id };
    this.recurringPatterns.set(id, newPattern);
    return newPattern;
  }

  async updateRecurringPattern(id: number, pattern: Partial<RecurringPattern>): Promise<RecurringPattern | undefined> {
    const existingPattern = this.recurringPatterns.get(id);
    if (!existingPattern) return undefined;
    
    const updatedPattern = { ...existingPattern, ...pattern };
    this.recurringPatterns.set(id, updatedPattern);
    return updatedPattern;
  }

  async deleteRecurringPattern(id: number): Promise<boolean> {
    return this.recurringPatterns.delete(id);
  }

  // Job group operations
  async getJobGroup(id: number): Promise<JobGroup | undefined> {
    return this.jobGroups.get(id);
  }

  async getJobGroupsByJob(jobId: number): Promise<JobGroup[]> {
    return Array.from(this.jobGroups.values()).filter(
      (group) => group.jobId === jobId,
    );
  }

  async createJobGroup(group: InsertJobGroup): Promise<JobGroup> {
    const id = this.currentIds.jobGroups++;
    const newGroup: JobGroup = { ...group, id };
    this.jobGroups.set(id, newGroup);
    return newGroup;
  }

  async updateJobGroup(id: number, group: Partial<JobGroup>): Promise<JobGroup | undefined> {
    const existingGroup = this.jobGroups.get(id);
    if (!existingGroup) return undefined;
    
    const updatedGroup = { ...existingGroup, ...group };
    this.jobGroups.set(id, updatedGroup);
    return updatedGroup;
  }

  async deleteJobGroup(id: number): Promise<boolean> {
    return this.jobGroups.delete(id);
  }

  // Service point operations
  async getServicePoint(id: number): Promise<ServicePoint | undefined> {
    return this.servicePoints.get(id);
  }

  async getServicePointsByJob(jobId: number): Promise<ServicePoint[]> {
    return Array.from(this.servicePoints.values()).filter(
      (point) => point.jobId === jobId,
    );
  }

  async getServicePointsByGroup(groupId: number): Promise<ServicePoint[]> {
    return Array.from(this.servicePoints.values()).filter(
      (point) => point.groupId === groupId,
    );
  }

  async createServicePoint(point: InsertServicePoint): Promise<ServicePoint> {
    const id = this.currentIds.servicePoints++;
    const newPoint: ServicePoint = { ...point, id };
    this.servicePoints.set(id, newPoint);
    return newPoint;
  }

  async updateServicePoint(id: number, point: Partial<ServicePoint>): Promise<ServicePoint | undefined> {
    const existingPoint = this.servicePoints.get(id);
    if (!existingPoint) return undefined;
    
    const updatedPoint = { ...existingPoint, ...point };
    this.servicePoints.set(id, updatedPoint);
    return updatedPoint;
  }

  async deleteServicePoint(id: number): Promise<boolean> {
    return this.servicePoints.delete(id);
  }

  // Message log operations
  async getMessageLog(id: number): Promise<MessageLog | undefined> {
    return this.messageLogs.get(id);
  }

  async getMessageLogsByJob(jobId: number): Promise<MessageLog[]> {
    return Array.from(this.messageLogs.values()).filter(
      (log) => log.jobId === jobId,
    );
  }

  async getMessageLogsRequiringAttention(): Promise<MessageLog[]> {
    return Array.from(this.messageLogs.values()).filter(
      (log) => log.notifyManagement && log.status === "unread",
    );
  }

  async createMessageLog(log: InsertMessageLog): Promise<MessageLog> {
    const id = this.currentIds.messageLogs++;
    const newLog: MessageLog = { 
      ...log, 
      id, 
      timestamp: new Date()
    };
    this.messageLogs.set(id, newLog);
    return newLog;
  }

  async updateMessageLog(id: number, log: Partial<MessageLog>): Promise<MessageLog | undefined> {
    const existingLog = this.messageLogs.get(id);
    if (!existingLog) return undefined;
    
    const updatedLog = { ...existingLog, ...log };
    this.messageLogs.set(id, updatedLog);
    return updatedLog;
  }

  async deleteMessageLog(id: number): Promise<boolean> {
    return this.messageLogs.delete(id);
  }

  // Complex operations
  async getJobWithDetails(jobId: number): Promise<{
    job: Job;
    customer: Customer;
    groups: Array<{
      group: JobGroup;
      servicePoints: ServicePoint[];
    }>;
    servicePoints: ServicePoint[];
    assignedTo: User;
  } | undefined> {
    const job = await this.getJob(jobId);
    if (!job) return undefined;
    
    const customer = await this.getCustomer(job.customerId);
    if (!customer) return undefined;
    
    const assignedTo = await this.getUser(job.assignedToId);
    if (!assignedTo) return undefined;
    
    const groups = await this.getJobGroupsByJob(jobId);
    const servicePoints = await this.getServicePointsByJob(jobId);
    
    const groupsWithServicePoints = await Promise.all(
      groups.map(async (group) => {
        const points = await this.getServicePointsByGroup(group.id);
        return {
          group,
          servicePoints: points,
        };
      })
    );
    
    return {
      job,
      customer,
      groups: groupsWithServicePoints,
      servicePoints,
      assignedTo,
    };
  }
}

import { db } from "./db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<schema.User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user || undefined;
  }

  async getUsersByManager(managerId: number): Promise<schema.User[]> {
    return await db.select().from(schema.users).where(eq(schema.users.managerId, managerId));
  }
  
  async getUsersByRole(role: string): Promise<schema.User[]> {
    try {
      const users = await db.select().from(schema.users).where(eq(schema.users.role, role));
      return users;
    } catch (error) {
      console.error("Error getting users by role:", error);
      return [];
    }
  }

  async createUser(insertUser: schema.InsertUser): Promise<schema.User> {
    const [user] = await db
      .insert(schema.users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userUpdate: Partial<schema.User>): Promise<schema.User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set(userUpdate)
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    
    return result.length > 0;
  }

  // Other methods will be implemented similarly using db queries
  // For now, we'll still use MemStorage for non-user operations
  // This allows us to test login functionality first
  
  // Customer operations
  async getCustomer(id: number): Promise<schema.Customer | undefined> {
    const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, id));
    return customer || undefined;
  }
  
  async getAllCustomers(): Promise<schema.Customer[]> {
    return await db.select().from(schema.customers);
  }
  
  async createCustomer(customer: schema.InsertCustomer): Promise<schema.Customer> {
    const [result] = await db
      .insert(schema.customers)
      .values(customer)
      .returning();
    return result;
  }
  
  async updateCustomer(id: number, customer: Partial<schema.Customer>): Promise<schema.Customer | undefined> {
    const [updatedCustomer] = await db
      .update(schema.customers)
      .set(customer)
      .where(eq(schema.customers.id, id))
      .returning();
    return updatedCustomer || undefined;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.customers)
      .where(eq(schema.customers.id, id))
      .returning({ id: schema.customers.id });
    
    return result.length > 0;
  }
  // Job operations
  async getJob(id: number): Promise<schema.Job | undefined> {
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id));
    return job || undefined;
  }
  
  async getJobsForManager(): Promise<schema.Job[]> {
    return await db.select().from(schema.jobs);
  }
  
  async getJobsForStaff(staffId: number): Promise<schema.Job[]> {
    return await db.select()
      .from(schema.jobs)
      .where(eq(schema.jobs.assignedToId, staffId));
  }
  
  async getJobsByDate(date: Date): Promise<schema.Job[]> {
    // Format date to match SQL date format (YYYY-MM-DD)
    const formattedDate = date.toISOString().split('T')[0];
    
    return await db.select()
      .from(schema.jobs)
      .where(eq(schema.jobs.date, formattedDate));
  }
  
  async getJobsByStatus(status: string): Promise<schema.Job[]> {
    return await db.select()
      .from(schema.jobs)
      .where(eq(schema.jobs.status, status));
  }
  
  async getJobsForStaffByDate(staffId: number, date: Date): Promise<schema.Job[]> {
    // Format date to match SQL date format (YYYY-MM-DD)
    const formattedDate = date.toISOString().split('T')[0];
    
    // Get all jobs for this staff member regardless of date
    // We're intentionally not filtering by date to show all jobs assigned to staff
    return await db.select()
      .from(schema.jobs)
      .where(
        eq(schema.jobs.assignedToId, staffId)
      );
  }
  
  async createJob(job: schema.InsertJob): Promise<schema.Job> {
    const [result] = await db
      .insert(schema.jobs)
      .values(job)
      .returning();
    return result;
  }
  
  async updateJob(id: number, job: Partial<schema.Job>): Promise<schema.Job | undefined> {
    const [updatedJob] = await db
      .update(schema.jobs)
      .set(job)
      .where(eq(schema.jobs.id, id))
      .returning();
    return updatedJob || undefined;
  }
  
  async deleteJob(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.jobs)
      .where(eq(schema.jobs.id, id))
      .returning({ id: schema.jobs.id });
    
    return result.length > 0;
  }
  // Recurring Pattern operations
  async getRecurringPattern(id: number): Promise<schema.RecurringPattern | undefined> {
    const [pattern] = await db.select().from(schema.recurringPatterns).where(eq(schema.recurringPatterns.id, id));
    return pattern || undefined;
  }
  
  async getAllRecurringPatterns(): Promise<schema.RecurringPattern[]> {
    return await db.select().from(schema.recurringPatterns);
  }
  
  async createRecurringPattern(pattern: schema.InsertRecurringPattern): Promise<schema.RecurringPattern> {
    const [result] = await db
      .insert(schema.recurringPatterns)
      .values(pattern)
      .returning();
    return result;
  }
  
  async updateRecurringPattern(id: number, pattern: Partial<schema.RecurringPattern>): Promise<schema.RecurringPattern | undefined> {
    const [updatedPattern] = await db
      .update(schema.recurringPatterns)
      .set(pattern)
      .where(eq(schema.recurringPatterns.id, id))
      .returning();
    return updatedPattern || undefined;
  }
  
  async deleteRecurringPattern(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.recurringPatterns)
      .where(eq(schema.recurringPatterns.id, id))
      .returning({ id: schema.recurringPatterns.id });
    
    return result.length > 0;
  }
  // Job Group operations
  async getJobGroup(id: number): Promise<schema.JobGroup | undefined> {
    const [group] = await db.select().from(schema.jobGroups).where(eq(schema.jobGroups.id, id));
    return group || undefined;
  }
  
  async getJobGroupsByJob(jobId: number): Promise<schema.JobGroup[]> {
    return await db.select()
      .from(schema.jobGroups)
      .where(eq(schema.jobGroups.jobId, jobId));
  }
  
  async createJobGroup(group: schema.InsertJobGroup): Promise<schema.JobGroup> {
    const [result] = await db
      .insert(schema.jobGroups)
      .values(group)
      .returning();
    return result;
  }
  
  async updateJobGroup(id: number, group: Partial<schema.JobGroup>): Promise<schema.JobGroup | undefined> {
    const [updatedGroup] = await db
      .update(schema.jobGroups)
      .set(group)
      .where(eq(schema.jobGroups.id, id))
      .returning();
    return updatedGroup || undefined;
  }
  
  async deleteJobGroup(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.jobGroups)
      .where(eq(schema.jobGroups.id, id))
      .returning({ id: schema.jobGroups.id });
    
    return result.length > 0;
  }
  
  // Service Point operations
  async getServicePoint(id: number): Promise<schema.ServicePoint | undefined> {
    const [point] = await db.select().from(schema.servicePoints).where(eq(schema.servicePoints.id, id));
    return point || undefined;
  }
  
  async getServicePointsByJob(jobId: number): Promise<schema.ServicePoint[]> {
    return await db.select()
      .from(schema.servicePoints)
      .where(eq(schema.servicePoints.jobId, jobId));
  }
  
  async getServicePointsByGroup(groupId: number): Promise<schema.ServicePoint[]> {
    return await db.select()
      .from(schema.servicePoints)
      .where(eq(schema.servicePoints.groupId, groupId));
  }
  
  async createServicePoint(point: schema.InsertServicePoint): Promise<schema.ServicePoint> {
    const [result] = await db
      .insert(schema.servicePoints)
      .values(point)
      .returning();
    return result;
  }
  
  async updateServicePoint(id: number, point: Partial<schema.ServicePoint>): Promise<schema.ServicePoint | undefined> {
    const [updatedPoint] = await db
      .update(schema.servicePoints)
      .set(point)
      .where(eq(schema.servicePoints.id, id))
      .returning();
    return updatedPoint || undefined;
  }
  
  async deleteServicePoint(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.servicePoints)
      .where(eq(schema.servicePoints.id, id))
      .returning({ id: schema.servicePoints.id });
    
    return result.length > 0;
  }
  // Message Log operations
  async getMessageLog(id: number): Promise<schema.MessageLog | undefined> {
    const [log] = await db.select().from(schema.messageLogs).where(eq(schema.messageLogs.id, id));
    return log || undefined;
  }
  
  async getMessageLogsByJob(jobId: number): Promise<schema.MessageLog[]> {
    return await db.select()
      .from(schema.messageLogs)
      .where(eq(schema.messageLogs.jobId, jobId));
  }
  
  async getMessageLogsRequiringAttention(): Promise<schema.MessageLog[]> {
    return await db.select()
      .from(schema.messageLogs)
      .where(
        eq(schema.messageLogs.notifyManagement, true)
      );
    // Note: We've simplified the query for now
    // Will implement additional 'unread' filtering in a future version
  }
  
  async createMessageLog(log: schema.InsertMessageLog): Promise<schema.MessageLog> {
    const [result] = await db
      .insert(schema.messageLogs)
      .values(log)
      .returning();
    return result;
  }
  
  async updateMessageLog(id: number, log: Partial<schema.MessageLog>): Promise<schema.MessageLog | undefined> {
    const [updatedLog] = await db
      .update(schema.messageLogs)
      .set(log)
      .where(eq(schema.messageLogs.id, id))
      .returning();
    return updatedLog || undefined;
  }
  
  async deleteMessageLog(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.messageLogs)
      .where(eq(schema.messageLogs.id, id))
      .returning({ id: schema.messageLogs.id });
    
    return result.length > 0;
  }
  // Complex query to get job with all related details
  async getJobWithDetails(jobId: number): Promise<{
    job: schema.Job;
    customer: schema.Customer;
    groups: Array<{
      group: schema.JobGroup;
      servicePoints: schema.ServicePoint[];
    }>;
    servicePoints: schema.ServicePoint[];
    assignedTo: schema.User;
  } | undefined> {
    // Get the job
    const job = await this.getJob(jobId);
    if (!job) return undefined;
    
    // Get the customer
    const customer = await this.getCustomer(job.customerId);
    if (!customer) return undefined;
    
    // Get the assigned user
    const assignedTo = await this.getUser(job.assignedToId);
    if (!assignedTo) return undefined;
    
    // Get all service points for this job
    const servicePoints = await this.getServicePointsByJob(jobId);
    
    // Get all groups for this job
    const jobGroups = await this.getJobGroupsByJob(jobId);
    
    // Create array of groups with their service points
    const groups = await Promise.all(
      jobGroups.map(async (group) => {
        const groupServicePoints = await this.getServicePointsByGroup(group.id);
        return {
          group,
          servicePoints: groupServicePoints
        };
      })
    );
    
    // Return the complete job details
    return {
      job,
      customer,
      groups,
      servicePoints,
      assignedTo
    };
  }
}

// Create a hybrid storage that uses DatabaseStorage for user operations
// and MemStorage for everything else
class HybridStorage implements IStorage {
  private dbStorage: DatabaseStorage;
  private memStorage: MemStorage;

  constructor() {
    this.dbStorage = new DatabaseStorage();
    this.memStorage = new MemStorage();
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return this.dbStorage.getUsersByRole(role);
  }

  // User operations use database
  async getUser(id: number): Promise<User | undefined> {
    return this.dbStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.dbStorage.getUserByUsername(username);
  }

  async getUsersByManager(managerId: number): Promise<User[]> {
    return this.dbStorage.getUsersByManager(managerId);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.dbStorage.createUser(user);
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    return this.dbStorage.updateUser(id, user);
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.dbStorage.deleteUser(id);
  }

  // Customer operations now use database
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.dbStorage.getCustomer(id);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return this.dbStorage.getAllCustomers();
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return this.dbStorage.createCustomer(customer);
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    return this.dbStorage.updateCustomer(id, customer);
  }

  async deleteCustomer(id: number): Promise<boolean> {
    return this.dbStorage.deleteCustomer(id);
  }

  // Job operations now use database
  async getJob(id: number): Promise<Job | undefined> {
    return this.dbStorage.getJob(id);
  }

  async getJobsForManager(): Promise<Job[]> {
    return this.dbStorage.getJobsForManager();
  }

  async getJobsForStaff(staffId: number): Promise<Job[]> {
    return this.dbStorage.getJobsForStaff(staffId);
  }

  async getJobsByDate(date: Date): Promise<Job[]> {
    return this.dbStorage.getJobsByDate(date);
  }

  async getJobsForStaffByDate(staffId: number, date: Date): Promise<Job[]> {
    return this.dbStorage.getJobsForStaffByDate(staffId, date);
  }

  async createJob(job: InsertJob): Promise<Job> {
    return this.dbStorage.createJob(job);
  }

  async updateJob(id: number, job: Partial<Job>): Promise<Job | undefined> {
    return this.dbStorage.updateJob(id, job);
  }

  async deleteJob(id: number): Promise<boolean> {
    return this.dbStorage.deleteJob(id);
  }

  // RecurringPattern operations now use database
  async getRecurringPattern(id: number): Promise<RecurringPattern | undefined> {
    return this.dbStorage.getRecurringPattern(id);
  }

  async getAllRecurringPatterns(): Promise<RecurringPattern[]> {
    return this.dbStorage.getAllRecurringPatterns();
  }

  async createRecurringPattern(pattern: InsertRecurringPattern): Promise<RecurringPattern> {
    return this.dbStorage.createRecurringPattern(pattern);
  }

  async updateRecurringPattern(id: number, pattern: Partial<RecurringPattern>): Promise<RecurringPattern | undefined> {
    return this.dbStorage.updateRecurringPattern(id, pattern);
  }

  async deleteRecurringPattern(id: number): Promise<boolean> {
    return this.dbStorage.deleteRecurringPattern(id);
  }

  // Job Group operations use database
  async getJobGroup(id: number): Promise<JobGroup | undefined> {
    return this.dbStorage.getJobGroup(id);
  }

  async getJobGroupsByJob(jobId: number): Promise<JobGroup[]> {
    return this.dbStorage.getJobGroupsByJob(jobId);
  }

  async createJobGroup(group: InsertJobGroup): Promise<JobGroup> {
    return this.dbStorage.createJobGroup(group);
  }

  async updateJobGroup(id: number, group: Partial<JobGroup>): Promise<JobGroup | undefined> {
    return this.dbStorage.updateJobGroup(id, group);
  }

  async deleteJobGroup(id: number): Promise<boolean> {
    return this.dbStorage.deleteJobGroup(id);
  }

  // Service Point operations use database
  async getServicePoint(id: number): Promise<ServicePoint | undefined> {
    return this.dbStorage.getServicePoint(id);
  }

  async getServicePointsByJob(jobId: number): Promise<ServicePoint[]> {
    return this.dbStorage.getServicePointsByJob(jobId);
  }

  async getServicePointsByGroup(groupId: number): Promise<ServicePoint[]> {
    return this.dbStorage.getServicePointsByGroup(groupId);
  }

  async createServicePoint(point: InsertServicePoint): Promise<ServicePoint> {
    return this.dbStorage.createServicePoint(point);
  }

  async updateServicePoint(id: number, point: Partial<ServicePoint>): Promise<ServicePoint | undefined> {
    return this.dbStorage.updateServicePoint(id, point);
  }

  async deleteServicePoint(id: number): Promise<boolean> {
    return this.dbStorage.deleteServicePoint(id);
  }

  // Message Log operations use database
  async getMessageLog(id: number): Promise<MessageLog | undefined> {
    return this.dbStorage.getMessageLog(id);
  }

  async getMessageLogsByJob(jobId: number): Promise<MessageLog[]> {
    return this.dbStorage.getMessageLogsByJob(jobId);
  }

  async getMessageLogsRequiringAttention(): Promise<MessageLog[]> {
    return this.dbStorage.getMessageLogsRequiringAttention();
  }

  async createMessageLog(log: InsertMessageLog): Promise<MessageLog> {
    return this.dbStorage.createMessageLog(log);
  }

  async updateMessageLog(id: number, log: Partial<MessageLog>): Promise<MessageLog | undefined> {
    return this.dbStorage.updateMessageLog(id, log);
  }

  async deleteMessageLog(id: number): Promise<boolean> {
    return this.dbStorage.deleteMessageLog(id);
  }

  // Complex job details query uses database
  async getJobWithDetails(jobId: number): Promise<{
    job: Job;
    customer: Customer;
    groups: Array<{
      group: JobGroup;
      servicePoints: ServicePoint[];
    }>;
    servicePoints: ServicePoint[];
    assignedTo: User;
  } | undefined> {
    return this.dbStorage.getJobWithDetails(jobId);
  }
}

// Use HybridStorage for now - we'll gradually migrate all operations to database
export const storage = new HybridStorage();
