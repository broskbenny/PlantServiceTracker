import { db } from "./db";
import { users, customers, jobs, jobGroups, servicePoints } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { createDemoJobs } from "./demoJobs";

/**
 * Ensures demo users exist in database
 */
export async function ensureDemoUsers() {
  try {
    // Demo password
    const demoPassword = "password123";
    const hashedPassword = await bcrypt.hash(demoPassword, 10);
    
    // Check if manager exists
    const existingManager = await db.select().from(users).where(eq(users.username, "manager"));
    
    if (existingManager.length === 0) {
      // Create manager
      await db.insert(users).values({
        username: "manager",
        password: hashedPassword,
        fullName: "Demo Manager",
        email: "manager@example.com",
        role: "manager",
      });
      
      console.log("Demo manager account created");
    } else {
      // Update password for manager to ensure it matches demo password
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, "manager"));
      
      console.log("Demo manager password updated");
    }
    
    // Check if staff exists
    const existingStaff = await db.select().from(users).where(eq(users.username, "staff"));
    
    if (existingStaff.length === 0) {
      // Create staff
      await db.insert(users).values({
        username: "staff",
        password: hashedPassword,
        fullName: "Demo Staff",
        email: "staff@example.com",
        role: "staff",
        managerId: existingManager.length > 0 ? existingManager[0].id : undefined,
      });
      
      console.log("Demo staff account created");
    } else {
      // Update password for staff to ensure it matches demo password
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, "staff"));
      
      console.log("Demo staff password updated");
    }
    
    // Create demo customers if they don't exist
    const customerCount = await db.query.customers.findMany({
      limit: 1
    });
    
    if (customerCount.length === 0) {
      console.log("Creating demo customers...");
      
      // Create some demo customers
      await db.insert(customers).values([
        {
          name: 'Acme Corp',
          address: '123 Main St, New York, NY 10001',
          contact: 'John Smith',
          phone: '555-123-4567',
          openingHours: '9:00-17:00'
        },
        {
          name: 'Tech Innovations',
          address: '456 Broadway, San Francisco, CA 94103',
          contact: 'Jane Johnson',
          phone: '555-987-6543',
          openingHours: '8:00-18:00'
        },
        {
          name: 'Green Office Solutions',
          address: '789 Peachtree St NE, Atlanta, GA 30308',
          contact: 'Michael Green',
          phone: '555-456-7890',
          openingHours: '9:00-17:00'
        }
      ]);
      console.log('Demo customers created');
    }
    
    // Create demo jobs
    await createDemoJobs();
    
    console.log("Demo users check completed");
  } catch (error) {
    console.error("Error ensuring demo users:", error);
  }
}