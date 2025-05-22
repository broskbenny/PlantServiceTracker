import { db } from "./db";
import { jobs, jobGroups, servicePoints } from "@shared/schema";

/**
 * This file contains logic to create demo jobs for the staff user
 */

export async function createDemoJobs() {
  try {
    console.log("Creating demo jobs for staff user...");
    
    // Get staff user ID - for demo purposes using hardcoded ID 7
    const staffId = 7; // This matches the ID of the demo staff user that's in the database
    console.log(`Using demo staff user with ID: ${staffId}`);
    
    // Get all customers
    const customers = await db.query.customers.findMany();
    
    if (customers.length === 0) {
      console.log("No customers found. Skipping demo job creation.");
      return;
    }
    
    // Always clean up existing jobs and create fresh ones
    console.log("Removing existing jobs to create fresh demo jobs...");
    
    // Delete all service points first (due to foreign key constraints)
    await db.delete(servicePoints);
    
    // Delete all job groups
    await db.delete(jobGroups);
    
    // Delete all jobs
    await db.delete(jobs);
    
    console.log("Existing jobs cleaned up, creating fresh demo jobs.");
    
    // Create job dates - mix of past, present, and future
    const today = new Date();
    const dates = [
      // Past jobs
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7), // Last week
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), // Few days ago
      
      // Today and tomorrow
      new Date(today.getFullYear(), today.getMonth(), today.getDate()), // Today
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), // Tomorrow
      
      // This week
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), // 2 days from now
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3), // 3 days from now
      
      // Next week
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8), // Next week
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9), // Next week
      
      // This month
      new Date(today.getFullYear(), today.getMonth(), 28), // End of month
      
      // Next month
      new Date(today.getFullYear(), today.getMonth() + 1, 5), // Next month
      new Date(today.getFullYear(), today.getMonth() + 1, 15), // Next month
      
      // Further in the future
      new Date(today.getFullYear(), today.getMonth() + 2, 10), // Two months from now
    ];
    
    // Job statuses - mix of completed, in_progress, and pending
    const statuses = [
      "completed", "completed", // 2 completed jobs
      "in_progress", "in_progress", "in_progress", // 3 in progress
      "assigned", "assigned", "assigned", "assigned", "assigned", "assigned", "assigned" // 7 pending
    ];
    
    // Add more variety to plant types and pot types for richer demo data
    const plantTypes = [
      "Ficus", "Pothos", "Snake Plant", "ZZ Plant", "Monstera", 
      "Peace Lily", "Spider Plant", "Dracaena", "Rubber Plant", "Palm",
      "Orchid", "Succulent", "Philodendron", "Aloe Vera", "Boston Fern"
    ];
    
    const potTypes = [
      "Ceramic", "Plastic", "Terracotta", "Hanging", "Metal",
      "Concrete", "Glass", "Wood", "Wicker", "Stone", 
      "Fiberglass", "Self-Watering", "Decorative"
    ];
    
    // Job notes for variety
    const notes = [
      "Customer requested extra attention to the ficus plants", 
      "Be careful with the orchids - they're sensitive to overwatering",
      "Customer has a dog - keep gate closed at all times",
      "Access code for the building is 1234",
      "Some plants showing signs of pest infestation",
      "New installation - check all plants are secure",
      "Follow up on plant replacements from last visit",
      "Customer will be present during service",
      "Seasonal maintenance required",
      "Plants need repotting - bring extra soil",
      "Monthly maintenance - focus on pruning",
      "Special attention requested for lobby plants"
    ];
    
    // Plant counts for each job
    const plantCounts = [5, 8, 12, 3, 7, 10, 4, 6, 15, 9, 5, 11];
    
    // Create jobs - now with multiple jobs per day
    // First, create a more dense distribution of dates (5+ jobs per day)
    const denseDistributionDates = [];
    
    // Add today's date 6 times (6 jobs today)
    for (let i = 0; i < 6; i++) {
      denseDistributionDates.push(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    }
    
    // Add tomorrow's date 5 times (5 jobs tomorrow)
    for (let i = 0; i < 5; i++) {
      denseDistributionDates.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    }
    
    // Add the rest of the dates, some duplicated for more density
    denseDistributionDates.push(...dates.slice(4)); // Add the remaining original dates
    // Add some duplicates for the upcoming days
    denseDistributionDates.push(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3)
    );
    
    // Create jobs with the denser distribution
    for (let i = 0; i < denseDistributionDates.length; i++) {
      const customerId = customers[i % customers.length].id;
      
      // Format date for database
      const formattedDate = denseDistributionDates[i].toISOString().split('T')[0];
      
      // Create job
      const [newJob] = await db.insert(jobs).values({
        customerId: customerId,
        date: formattedDate,
        status: statuses[i % statuses.length], // Cycle through statuses
        assignedToId: staffId,
        plantCount: plantCounts[i % plantCounts.length], // Cycle through plant counts
        isRecurring: false,
        recurringPatternId: null
      }).returning();
      
      console.log(`Created job ${i+1} with ID: ${newJob.id} for date: ${formattedDate}`);
      
      // Create job groups (1-3 per job)
      const groupCount = (i % 3) + 1; // 1-3 groups
      
      for (let g = 0; g < groupCount; g++) {
        const [newGroup] = await db.insert(jobGroups).values({
          jobId: newJob.id,
          name: g === 0 ? "Main Area" : g === 1 ? "Secondary Area" : "Outside Area"
        }).returning();
        
        console.log(`Created job group with ID: ${newGroup.id} for job: ${newJob.id}`);
        
        // Create service points (2-5 per group)
        const pointCount = (g % 4) + 2; // 2-5 points per group
        
        for (let p = 0; p < pointCount; p++) {
          const pointStatus = statuses[i % statuses.length] === "completed" ? "completed" : 
                              p < pointCount / 2 && statuses[i % statuses.length] === "in_progress" ? "completed" :
                              "pending";
          
          await db.insert(servicePoints).values({
            jobId: newJob.id,
            groupId: newGroup.id,
            status: pointStatus,
            plantType: plantTypes[Math.floor(Math.random() * plantTypes.length)],
            potType: potTypes[Math.floor(Math.random() * potTypes.length)]
          });
        }
      }
    }
    
    console.log("Demo jobs created successfully!");
  } catch (error) {
    console.error("Error creating demo jobs:", error);
  }
}