import { storage } from "./storage";

/**
 * Creates sample message logs for demo jobs
 */
export async function createSampleMessageLogs() {
  console.log("Creating sample message logs...");
  
  // Get today's jobs
  const today = "2025-05-21"; // Hardcoded to match demo job dates
  const jobs = await storage.getJobsByDate(new Date(today));
  const demoJobs = jobs.slice(0, 5);
  
  console.log(`Found ${demoJobs.length} jobs to add sample messages to`);
  
  // Get user IDs
  const manager = await storage.getUserByUsername("manager");
  const staff = await storage.getUserByUsername("staff");
  
  if (!manager || !staff) {
    console.log("Demo users not found");
    return;
  }
  
  // Sample messages for each job
  for (const job of demoJobs) {
    // Message from staff to manager
    await storage.createMessageLog({
      jobId: job.id,
      userId: staff.id,
      message: `Need clarification about access to customer site. The gate code doesn't seem to be working.`,
      notifyManagement: true,
      status: "unread"
    });
    
    // Response from manager
    await storage.createMessageLog({
      jobId: job.id,
      userId: manager.id,
      message: `The code was updated last week. Use 4321# instead. Let me know if you have any other issues.`,
      notifyManagement: false,
      status: "unread"
    });
    
    // Follow up from staff
    await storage.createMessageLog({
      jobId: job.id,
      userId: staff.id,
      message: `Thanks, that worked! I've started on the first floor plants.`,
      notifyManagement: false,
      status: "unread"
    });
    
    console.log(`Added sample messages for job ${job.id}`);
  }
  
  // Add specific scenario messages to one job for variety
  if (demoJobs.length > 0) {
    const specialJob = demoJobs[0];
    
    await storage.createMessageLog({
      jobId: specialJob.id,
      userId: staff.id,
      message: `Found several plants with pest issues in the main lobby. Will need treatment on next visit.`,
      notifyManagement: true,
      status: "unread"
    });
    
    await storage.createMessageLog({
      jobId: specialJob.id,
      userId: manager.id,
      message: `I'll add pest treatment to the next scheduled visit. Please take photos of the affected plants so we can monitor.`,
      notifyManagement: false,
      status: "unread"
    });
  }
  
  console.log("Sample message logs created successfully!");
}