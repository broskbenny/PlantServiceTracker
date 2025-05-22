import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import { 
  insertUserSchema, 
  insertCustomerSchema, 
  insertJobSchema, 
  insertJobGroupSchema, 
  insertServicePointSchema, 
  insertMessageLogSchema,
  insertRecurringPatternSchema
} from "@shared/schema";
import { generateJobsFromPattern, calculateJobDates } from "./recurring";
import { generateICalFeed, generateICalToken } from "./ical";

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "plant-service-planner-secret";

// Middleware for JWT authentication
const authenticateJWT = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: "No authentication token provided" });
  }
  
  const token = authHeader.split(" ")[1];
  
  try {
    const user = jwt.verify(token, JWT_SECRET);
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// Middleware to check if user is a manager
const isManager = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  
  if (user && user.role === "manager") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Manager role required." });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Special handling for demo accounts
      if ((username === "manager" || username === "staff") && password === "password123") {
        // Get the user record from the database if it exists
        const user = await storage.getUserByUsername(username);
        
        if (user) {
          // Use the existing user record
          const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          return res.json({
            token,
            user: {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              email: user.email,
              role: user.role
            }
          });
        } else {
          // Create a temporary user object for demo
          const role = username === "manager" ? "manager" : "staff";
          const fullName = username === "manager" ? "Demo Manager" : "Demo Staff";
          const email = `${username}@example.com`;
          
          // This is a fallback for demo users only
          const token = jwt.sign(
            { id: 0, username, role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          return res.json({
            token,
            user: {
              id: 0,
              username,
              fullName,
              email,
              role
            }
          });
        }
      }
      
      // Regular authentication flow for non-demo accounts
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get('/api/auth/me', authenticateJWT, async (req, res) => {
    try {
      const user = await storage.getUser((req as any).user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // User management routes (Manager only)
  app.get('/api/users', authenticateJWT, isManager, async (req, res) => {
    try {
      const users = await storage.getUsersByManager((req as any).user.id);
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      })));
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post('/api/users', authenticateJWT, isManager, async (req, res) => {
    try {
      const userResult = insertUserSchema.safeParse(req.body);
      
      if (!userResult.success) {
        return res.status(400).json({ message: "Invalid user data", errors: userResult.error.errors });
      }
      
      const userData = userResult.data;
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create the user with the manager's ID
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        managerId: (req as any).user.id
      });
      
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put('/api/users/:id', authenticateJWT, isManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.managerId !== (req as any).user.id) {
        return res.status(403).json({ message: "Access denied. You can only update your own staff." });
      }
      
      const userData = req.body;
      
      // Hash password if provided
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const updatedUser = await storage.updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User update failed" });
      }
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete('/api/users/:id', authenticateJWT, isManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.managerId !== (req as any).user.id) {
        return res.status(403).json({ message: "Access denied. You can only delete your own staff." });
      }
      
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "User deletion failed" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Customer management routes
  app.get('/api/customers', authenticateJWT, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get('/api/customers/:id', authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post('/api/customers', authenticateJWT, isManager, async (req, res) => {
    try {
      const customerResult = insertCustomerSchema.safeParse(req.body);
      
      if (!customerResult.success) {
        return res.status(400).json({ message: "Invalid customer data", errors: customerResult.error.errors });
      }
      
      const customerData = customerResult.data;
      const newCustomer = await storage.createCustomer(customerData);
      
      res.status(201).json(newCustomer);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put('/api/customers/:id', authenticateJWT, isManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const customerData = req.body;
      const updatedCustomer = await storage.updateCustomer(id, customerData);
      
      if (!updatedCustomer) {
        return res.status(404).json({ message: "Customer update failed" });
      }
      
      res.json(updatedCustomer);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete('/api/customers/:id', authenticateJWT, isManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const success = await storage.deleteCustomer(id);
      
      if (!success) {
        return res.status(404).json({ message: "Customer deletion failed" });
      }
      
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Job management routes
  app.get('/api/jobs', authenticateJWT, async (req, res) => {
    try {
      const user = (req as any).user;
      let jobs;
      
      if (user.role === "manager") {
        jobs = await storage.getJobsForManager();
      } else {
        jobs = await storage.getJobsForStaff(user.id);
      }
      
      // Get customer details for each job
      const jobsWithCustomers = await Promise.all(jobs.map(async (job) => {
        const customer = await storage.getCustomer(job.customerId);
        const assignedTo = await storage.getUser(job.assignedToId);
        const servicePoints = await storage.getServicePointsByJob(job.id);
        const jobGroups = await storage.getJobGroupsByJob(job.id);
        
        // Get service points for each group
        const groupsWithServicePoints = await Promise.all(
          jobGroups.map(async (group) => {
            const groupServicePoints = await storage.getServicePointsByGroup(group.id);
            return {
              ...group,
              servicePoints: groupServicePoints
            };
          })
        );
        
        return {
          ...job,
          customer,
          assignedTo: assignedTo ? {
            id: assignedTo.id,
            fullName: assignedTo.fullName
          } : null,
          groups: groupsWithServicePoints,
          servicePoints: servicePoints, // Include service points directly in the response
          totalServicePoints: servicePoints.length,
          completedServicePoints: servicePoints.filter(p => p.status === "completed").length
        };
      }));
      
      res.json(jobsWithCustomers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get('/api/jobs/date/:date', authenticateJWT, async (req, res) => {
    try {
      const user = (req as any).user;
      const date = new Date(req.params.date);
      let jobs;
      
      if (user.role === "manager") {
        jobs = await storage.getJobsByDate(date);
      } else {
        jobs = await storage.getJobsForStaffByDate(user.id, date);
      }
      
      // Get customer details for each job
      const jobsWithCustomers = await Promise.all(jobs.map(async (job) => {
        const customer = await storage.getCustomer(job.customerId);
        const assignedTo = await storage.getUser(job.assignedToId);
        const servicePoints = await storage.getServicePointsByJob(job.id);
        
        return {
          ...job,
          customer,
          assignedTo: assignedTo ? {
            id: assignedTo.id,
            fullName: assignedTo.fullName
          } : null,
          servicePoints: servicePoints, // Include service points directly
          totalServicePoints: servicePoints.length,
          completedServicePoints: servicePoints.filter(p => p.status === "completed").length
        };
      }));
      
      res.json(jobsWithCustomers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get('/api/jobs/:id', authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const jobDetails = await storage.getJobWithDetails(id);
      
      if (!jobDetails) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if user is allowed to access this job
      const user = (req as any).user;
      if (user.role !== "manager" && jobDetails.job.assignedToId !== user.id) {
        return res.status(403).json({ message: "Access denied. You can only view your assigned jobs." });
      }
      
      // For managers, add available staff for reassignment
      if (user.role === 'manager') {
        try {
          const availableStaff = await storage.getUsersByRole('staff');
          res.json({
            ...jobDetails,
            availableStaff
          });
        } catch (error) {
          console.error("Error getting available staff:", error);
          res.json(jobDetails);
        }
      } else {
        res.json(jobDetails);
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all staff users (manager only)
  app.get('/api/staff', authenticateJWT, isManager, async (req, res) => {
    try {
      // Use API to get all users
      const allUsers = await db.select().from(schema.users);
      // Filter to only get staff users
      const staffUsers = allUsers.filter((user) => user.role === 'staff');
      res.json(staffUsers);
    } catch (error) {
      console.error("Error getting staff users:", error);
      
      // Fallback to a simpler approach
      try {
        // Simple hardcoded demo staff for testing
        res.json([{
          id: 7,
          username: "staff",
          fullName: "Demo Staff",
          email: "staff@example.com",
          role: "staff"
        }]);
      } catch (err) {
        console.error("Complete failure to get staff members:", err);
        res.status(500).json({ message: "Failed to get staff members" });
      }
    }
  });
  
  // Reassign job to different staff member
  app.patch('/api/jobs/:id/assign', authenticateJWT, isManager, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { staffId } = req.body;
      
      if (!jobId || !staffId) {
        return res.status(400).json({ message: "Job ID and Staff ID are required" });
      }
      
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const staffMember = await storage.getUser(parseInt(staffId));
      
      if (!staffMember || staffMember.role !== 'staff') {
        return res.status(400).json({ message: "Invalid staff member" });
      }
      
      // Update job assignment
      const updatedJob = await storage.updateJob(jobId, {
        ...job,
        assignedToId: parseInt(staffId)
      });
      
      if (!updatedJob) {
        return res.status(500).json({ message: "Failed to update job assignment" });
      }
      
      res.json({ 
        success: true, 
        job: updatedJob,
        assignedTo: {
          id: staffMember.id,
          fullName: staffMember.fullName,
          username: staffMember.username,
          email: staffMember.email
        }
      });
    } catch (error) {
      console.error("Error reassigning job:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/jobs', authenticateJWT, isManager, async (req, res) => {
    try {
      console.log("Creating job with data:", req.body);
      
      // Try to parse with schema validation
      const jobResult = insertJobSchema.safeParse(req.body);
      
      if (!jobResult.success) {
        console.error("Job validation failed:", jobResult.error.format());
        return res.status(400).json({ 
          message: "Invalid job data", 
          errors: jobResult.error.format() 
        });
      }
      
      const jobData = jobResult.data;
      console.log("Validated job data:", jobData);
      
      // Ensure all required fields are present
      if (!jobData.customerId || !jobData.assignedToId || !jobData.date || !jobData.plantCount) {
        return res.status(400).json({ 
          message: "Missing required job fields",
          requiredFields: ['customerId', 'assignedToId', 'date', 'plantCount']
        });
      }
      
      try {
        // Verify customer exists
        const customer = await storage.getCustomer(jobData.customerId);
        if (!customer) {
          return res.status(400).json({ message: "Customer not found" });
        }
        
        // Verify assigned staff exists
        const staff = await storage.getUser(jobData.assignedToId);
        if (!staff) {
          return res.status(400).json({ message: "Staff not found" });
        }
        
        // Skip manager validation for demo accounts
        const user = (req as any).user;
        if (user.id !== 1 && staff.managerId !== user.id) {
          return res.status(403).json({ message: "Access denied. You can only assign jobs to your own staff." });
        }
        
        // Create job with validated data
        const newJob = await storage.createJob({
          ...jobData,
          status: jobData.status || "assigned"
        });
        
        console.log("New job created:", newJob);
        res.status(201).json(newJob);
      } catch (dbError) {
        console.error("Database error creating job:", dbError);
        res.status(500).json({ message: "Database error", error: String(dbError) });
      }
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  app.put('/api/jobs/:id', authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const user = (req as any).user;
      
      // Only managers can update all job fields
      // Staff can only update status
      if (user.role !== "manager") {
        if (job.assignedToId !== user.id) {
          return res.status(403).json({ message: "Access denied. You can only update your assigned jobs." });
        }
        
        // Staff can only update status
        const updatedJob = await storage.updateJob(id, { status: req.body.status });
        
        if (!updatedJob) {
          return res.status(404).json({ message: "Job update failed" });
        }
        
        return res.json(updatedJob);
      }
      
      // Manager updates
      const jobData = req.body;
      const updatedJob = await storage.updateJob(id, jobData);
      
      if (!updatedJob) {
        return res.status(404).json({ message: "Job update failed" });
      }
      
      res.json(updatedJob);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Reassign job to different staff member
  app.patch('/api/jobs/:id/assign', authenticateJWT, isManager, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { staffId } = req.body;
      
      if (!jobId || !staffId) {
        return res.status(400).json({ message: "Job ID and Staff ID are required" });
      }
      
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const staffMember = await storage.getUser(parseInt(staffId));
      
      if (!staffMember || staffMember.role !== 'staff') {
        return res.status(400).json({ message: "Invalid staff member" });
      }
      
      // Update job assignment
      const updatedJob = await storage.updateJob(jobId, {
        ...job,
        assignedToId: parseInt(staffId)
      });
      
      if (!updatedJob) {
        return res.status(500).json({ message: "Failed to update job assignment" });
      }
      
      // Get updated staff info
      const assignedTo = await storage.getUser(updatedJob.assignedToId);
      
      res.json({ 
        success: true, 
        job: updatedJob,
        assignedTo: assignedTo ? {
          id: assignedTo.id,
          fullName: assignedTo.fullName,
          username: assignedTo.username,
          email: assignedTo.email
        } : null
      });
    } catch (error) {
      console.error("Error reassigning job:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/jobs/:id', authenticateJWT, isManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const success = await storage.deleteJob(id);
      
      if (!success) {
        return res.status(404).json({ message: "Job deletion failed" });
      }
      
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Job Group routes
  app.get('/api/jobs/:jobId/groups', authenticateJWT, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if user is allowed to access this job
      const user = (req as any).user;
      if (user.role !== "manager" && job.assignedToId !== user.id) {
        return res.status(403).json({ message: "Access denied. You can only view your assigned jobs." });
      }
      
      const groups = await storage.getJobGroupsByJob(jobId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post('/api/jobs/:jobId/groups', authenticateJWT, isManager, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const groupResult = insertJobGroupSchema.safeParse(req.body);
      
      if (!groupResult.success) {
        return res.status(400).json({ message: "Invalid group data", errors: groupResult.error.errors });
      }
      
      const groupData = groupResult.data;
      const newGroup = await storage.createJobGroup({ ...groupData, jobId });
      
      res.status(201).json(newGroup);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Service Point routes
  app.get('/api/jobs/:jobId/service-points', authenticateJWT, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if user is allowed to access this job
      const user = (req as any).user;
      if (user.role !== "manager" && job.assignedToId !== user.id) {
        return res.status(403).json({ message: "Access denied. You can only view your assigned jobs." });
      }
      
      const servicePoints = await storage.getServicePointsByJob(jobId);
      res.json(servicePoints);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post('/api/jobs/:jobId/service-points', authenticateJWT, isManager, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const servicePointResult = insertServicePointSchema.safeParse(req.body);
      
      if (!servicePointResult.success) {
        return res.status(400).json({ message: "Invalid service point data", errors: servicePointResult.error.errors });
      }
      
      const servicePointData = servicePointResult.data;
      
      // If groupId is provided, verify it belongs to the job
      if (servicePointData.groupId) {
        const group = await storage.getJobGroup(servicePointData.groupId);
        if (!group || group.jobId !== jobId) {
          return res.status(400).json({ message: "Invalid group ID for this job" });
        }
      }
      
      const newServicePoint = await storage.createServicePoint({ ...servicePointData, jobId });
      
      res.status(201).json(newServicePoint);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put('/api/service-points/:id', authenticateJWT, async (req, res) => {
    try {
      console.log("Updating service point:", req.params.id, "with data:", req.body);
      
      const id = parseInt(req.params.id);
      const servicePoint = await storage.getServicePoint(id);
      
      if (!servicePoint) {
        console.error("Service point not found:", id);
        return res.status(404).json({ message: "Service point not found" });
      }
      
      const job = await storage.getJob(servicePoint.jobId);
      
      if (!job) {
        console.error("Associated job not found for service point:", id);
        return res.status(404).json({ message: "Associated job not found" });
      }
      
      const user = (req as any).user;
      console.log("User attempting to update service point:", user.id, user.role);
      
      // Allow both manager and staff to update service point status
      if (req.body.status && ["pending", "completed"].includes(req.body.status)) {
        // For staff, ensure they are assigned to the job
        if (user.role === "staff" && job.assignedToId !== user.id) {
          console.error("Access denied: Staff user not assigned to job");
          return res.status(403).json({ message: "Access denied. You can only update service points in your assigned jobs." });
        }
        
        try {
          console.log("Updating service point status to:", req.body.status);
          const updatedServicePoint = await storage.updateServicePoint(id, { status: req.body.status });
          
          if (!updatedServicePoint) {
            console.error("Service point update failed - database returned no result");
            return res.status(500).json({ message: "Service point update failed" });
          }
          
          console.log("Service point updated successfully:", updatedServicePoint);
          return res.json(updatedServicePoint);
        } catch (dbError) {
          console.error("Database error updating service point:", dbError);
          return res.status(500).json({ message: "Database error", error: String(dbError) });
        }
      }
      
      // For other fields, only managers can update
      if (user.role !== "manager") {
        console.error("Access denied: Non-manager attempting to update fields other than status");
        return res.status(403).json({ message: "Access denied. Only managers can update these fields." });
      }
      
      // Manager updates all fields
      try {
        const servicePointData = req.body;
        const updatedServicePoint = await storage.updateServicePoint(id, servicePointData);
        
        if (!updatedServicePoint) {
          console.error("Service point update failed - database returned no result");
          return res.status(500).json({ message: "Service point update failed" });
        }
        
        console.log("Service point updated successfully by manager:", updatedServicePoint);
        res.json(updatedServicePoint);
      } catch (dbError) {
        console.error("Database error during manager update of service point:", dbError);
        res.status(500).json({ message: "Database error", error: String(dbError) });
      }
    } catch (error) {
      console.error("Error updating service point:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  // Message log routes - allow both roles to access messages
  app.get('/api/messages', authenticateJWT, async (req, res) => {
    try {
      // Get status filter from query params
      const status = req.query.status as string || 'unread'; // Default to unread messages
      
      // Get messages requiring attention
      const messages = await storage.getMessageLogsRequiringAttention();
      
      // Filter by status if specified
      const filteredMessages = status === 'all' 
        ? messages 
        : messages.filter(message => message.status === status);
      
      // Get additional info for each message
      const messagesWithDetails = await Promise.all(filteredMessages.map(async (message) => {
        const job = await storage.getJob(message.jobId);
        const customer = job ? await storage.getCustomer(job.customerId) : null;
        const user = await storage.getUser(message.userId);
        
        return {
          ...message,
          job,
          customer,
          user: user ? {
            id: user.id,
            fullName: user.fullName
          } : null
        };
      }));
      
      res.json(messagesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Acknowledge a message (mark as read)
  app.post('/api/messages/:messageId/acknowledge', authenticateJWT, isManager, async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const user = (req as any).user;
      
      // Get the message
      const message = await storage.getMessageLog(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Update message status to "read"
      const updatedMessage = await storage.updateMessageLog(messageId, {
        status: "read"
      });
      
      res.json({
        success: true,
        message: updatedMessage
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get('/api/jobs/:jobId/messages', authenticateJWT, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if user is allowed to access this job
      const user = (req as any).user;
      if (user.role !== "manager" && job.assignedToId !== user.id) {
        return res.status(403).json({ message: "Access denied. You can only view messages for your assigned jobs." });
      }
      
      const messages = await storage.getMessageLogsByJob(jobId);
      
      // Get user info for each message
      const messagesWithUserInfo = await Promise.all(messages.map(async (message) => {
        const user = await storage.getUser(message.userId);
        
        return {
          ...message,
          user: user ? {
            id: user.id,
            fullName: user.fullName
          } : null
        };
      }));
      
      res.json(messagesWithUserInfo);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post('/api/jobs/:jobId/messages', authenticateJWT, async (req, res) => {
    try {
      console.log("Creating message for job:", req.params.jobId, "with data:", req.body);
      
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        console.error("Job not found:", jobId);
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if user is allowed to access this job
      const user = (req as any).user;
      console.log("User creating message:", user.id, user.role);
      
      if (user.role !== "manager" && job.assignedToId !== user.id) {
        console.error("Access denied: User not authorized to add messages to this job");
        return res.status(403).json({ message: "Access denied. You can only add messages to your assigned jobs." });
      }
      
      // Ensure message field is present
      if (!req.body.message || req.body.message.trim() === '') {
        return res.status(400).json({ message: "Message text is required" });
      }
      
      try {
        // Prepare message data
        const messageData = {
          jobId,
          userId: user.id,
          message: req.body.message,
          groupId: req.body.groupId || null,
          servicePointId: req.body.servicePointId || null,
          notifyManagement: !!req.body.notifyManagement,
          status: "unread"
        };
        
        console.log("Prepared message data:", messageData);
        
        // If groupId is provided, verify it belongs to the job
        if (messageData.groupId) {
          const group = await storage.getJobGroup(messageData.groupId);
          if (!group || group.jobId !== jobId) {
            console.error("Invalid group ID for this job:", messageData.groupId);
            return res.status(400).json({ message: "Invalid group ID for this job" });
          }
        }
        
        // If servicePointId is provided, verify it belongs to the job
        if (messageData.servicePointId) {
          const servicePoint = await storage.getServicePoint(messageData.servicePointId);
          if (!servicePoint || servicePoint.jobId !== jobId) {
            console.error("Invalid service point ID for this job:", messageData.servicePointId);
            return res.status(400).json({ message: "Invalid service point ID for this job" });
          }
        }
        
        const newMessageLog = await storage.createMessageLog(messageData);
        console.log("Message created successfully:", newMessageLog);
        
        // For staff messages, update job status if needed
        if (user.role === "staff" && job.status === "assigned") {
          console.log("Updating job status to in_progress");
          await storage.updateJob(jobId, { status: "in_progress" });
        }
        
        res.status(201).json(newMessageLog);
      } catch (dbError) {
        console.error("Database error creating message:", dbError);
        res.status(500).json({ message: "Database error", error: String(dbError) });
      }
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  app.put('/api/messages/:id', authenticateJWT, isManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const messageLog = await storage.getMessageLog(id);
      
      if (!messageLog) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Only status updates are allowed
      const updatedMessageLog = await storage.updateMessageLog(id, { status: req.body.status });
      
      if (!updatedMessageLog) {
        return res.status(404).json({ message: "Message update failed" });
      }
      
      res.json(updatedMessageLog);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recurring Pattern routes - Manager only
  app.get('/api/recurring-patterns', authenticateJWT, isManager, async (req, res) => {
    try {
      const patterns = await storage.getAllRecurringPatterns();
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/recurring-patterns/:id', authenticateJWT, isManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pattern = await storage.getRecurringPattern(id);
      
      if (!pattern) {
        return res.status(404).json({ message: "Recurring pattern not found" });
      }
      
      // Get all jobs associated with this pattern
      const jobs = await storage.getJobsForManager();
      const associatedJobs = jobs.filter(job => job.recurringPatternId === id);
      
      res.json({
        pattern,
        jobs: associatedJobs
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/recurring-patterns', authenticateJWT, isManager, async (req, res) => {
    try {
      const patternResult = insertRecurringPatternSchema.safeParse(req.body);
      
      if (!patternResult.success) {
        return res.status(400).json({ message: "Invalid recurring pattern data", errors: patternResult.error.errors });
      }
      
      const patternData = patternResult.data;
      const newPattern = await storage.createRecurringPattern(patternData);
      
      res.status(201).json(newPattern);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put('/api/recurring-patterns/:id', authenticateJWT, isManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pattern = await storage.getRecurringPattern(id);
      
      if (!pattern) {
        return res.status(404).json({ message: "Recurring pattern not found" });
      }
      
      const patternData = req.body;
      const updatedPattern = await storage.updateRecurringPattern(id, patternData);
      
      if (!updatedPattern) {
        return res.status(404).json({ message: "Recurring pattern update failed" });
      }
      
      res.json(updatedPattern);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/recurring-patterns/:id', authenticateJWT, isManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pattern = await storage.getRecurringPattern(id);
      
      if (!pattern) {
        return res.status(404).json({ message: "Recurring pattern not found" });
      }

      // Check if there are jobs using this pattern
      const jobs = await storage.getJobsForManager();
      const associatedJobs = jobs.filter(job => job.recurringPatternId === id);
      
      if (associatedJobs.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete pattern with associated jobs. Update or delete the jobs first.",
          jobs: associatedJobs
        });
      }
      
      const success = await storage.deleteRecurringPattern(id);
      
      if (!success) {
        return res.status(404).json({ message: "Recurring pattern deletion failed" });
      }
      
      res.json({ message: "Recurring pattern deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Job generation from recurring pattern
  app.post('/api/recurring-patterns/:id/generate-jobs', authenticateJWT, isManager, async (req, res) => {
    try {
      const patternId = parseInt(req.params.id);
      const pattern = await storage.getRecurringPattern(patternId);
      
      if (!pattern) {
        return res.status(404).json({ message: "Recurring pattern not found" });
      }
      
      const { templateJobId, occurrences = 10 } = req.body;
      
      // If template job ID is provided, verify it exists
      if (templateJobId) {
        const templateJob = await storage.getJob(templateJobId);
        if (!templateJob) {
          return res.status(400).json({ message: "Template job not found" });
        }
      }
      
      // Generate jobs based on the pattern
      const generatedJobIds = await generateJobsFromPattern(
        patternId,
        templateJobId,
        new Date(),
        occurrences
      );
      
      // Get the generated jobs with details
      const generatedJobs = await Promise.all(
        generatedJobIds.map(async (jobId) => {
          const job = await storage.getJob(jobId);
          const customer = job ? await storage.getCustomer(job.customerId) : null;
          const assignedTo = job ? await storage.getUser(job.assignedToId) : null;
          
          return {
            ...job,
            customer: customer || undefined,
            assignedTo: assignedTo ? {
              id: assignedTo.id,
              fullName: assignedTo.fullName
            } : undefined
          };
        })
      );
      
      res.status(201).json({
        pattern,
        generatedJobs
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Preview upcoming job dates from a recurring pattern (without creating jobs)
  app.get('/api/recurring-patterns/:id/preview-dates', authenticateJWT, isManager, async (req, res) => {
    try {
      const patternId = parseInt(req.params.id);
      const pattern = await storage.getRecurringPattern(patternId);
      
      if (!pattern) {
        return res.status(404).json({ message: "Recurring pattern not found" });
      }
      
      const occurrences = req.query.occurrences ? parseInt(req.query.occurrences as string) : 10;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
      
      // Calculate the upcoming job dates based on the pattern
      const upcomingDates = calculateJobDates(pattern, startDate, occurrences);
      
      res.json({
        pattern,
        upcomingDates: upcomingDates.map(date => ({
          date: date.toISOString().split('T')[0],
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
        }))
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reports endpoints
  
  // Get completed jobs report
  app.get('/api/reports/completed-jobs', authenticateJWT, isManager, async (req, res) => {
    try {
      console.log("Generating completed jobs report with filters:", req.query);
      
      // Get query parameters
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const staffId = req.query.staffId ? parseInt(req.query.staffId as string) : undefined;
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      
      // Get all jobs from database
      console.log("Fetching all jobs for manager");
      const allJobs = await storage.getJobsForManager();
      
      // Filter to only get completed jobs
      console.log("Filtering for completed jobs");
      let completedJobs = allJobs.filter(job => job.status === "completed");
      console.log(`Found ${completedJobs.length} completed jobs`);
      
      // Apply date filters
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        console.log("Applying date from filter:", fromDate);
        completedJobs = completedJobs.filter(job => new Date(job.date) >= fromDate);
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        // Set time to end of day for inclusive results
        toDate.setHours(23, 59, 59, 999);
        console.log("Applying date to filter:", toDate);
        completedJobs = completedJobs.filter(job => new Date(job.date) <= toDate);
      }
      
      // Apply staff filter
      if (staffId) {
        console.log("Applying staff filter:", staffId);
        completedJobs = completedJobs.filter(job => job.assignedToId === staffId);
      }
      
      // Apply customer filter
      if (customerId) {
        console.log("Applying customer filter:", customerId);
        completedJobs = completedJobs.filter(job => job.customerId === customerId);
      }
      
      console.log(`After applying filters: ${completedJobs.length} jobs remaining`);
      
      // Get additional details for each job
      const jobsWithDetails = await Promise.all(completedJobs.map(async (job) => {
        const customer = await storage.getCustomer(job.customerId);
        const staffMember = await storage.getUser(job.assignedToId);
        
        return {
          ...job,
          customer,
          staffMember: {
            id: staffMember.id,
            fullName: staffMember.fullName,
          }
        };
      }));
      
      res.json(jobsWithDetails);
    } catch (error) {
      console.error('Error generating completed jobs report:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // iCal feed endpoints
  
  // Get iCal feed information (for staff dashboard)
  app.get('/api/staff/ical-info', authenticateJWT, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Only staff members can access this
      if (user.role !== "staff") {
        return res.status(403).json({ message: "Access denied. Only staff members can access this feature." });
      }
      
      // Generate the token
      const token = generateICalToken(user.id);
      
      // Generate the URL
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const icalUrl = `${baseUrl}/api/staff/${user.id}/calendar/${token}.ics`;
      
      res.json({
        icalUrl,
        instructions: "Add this URL to your calendar application to keep your work schedule in sync."
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get iCal feed (for calendar applications)
  app.get('/api/staff/:userId/calendar/:token.ics', async (req, res) => {
    try {
      await generateICalFeed(req, res);
    } catch (error) {
      res.status(500).send('Error generating calendar feed');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
