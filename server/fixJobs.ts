import { db } from "./db";
import { jobs, jobGroups, servicePoints } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Fix the jobs that don't have service points directly
 */
export async function fixJobs() {
  try {
    console.log("Starting to fix jobs that are missing service points...");
    
    // First, get a list of all job IDs
    const allJobs = await db.select().from(jobs);
    console.log(`Found ${allJobs.length} total jobs in database`);
    
    // Process each job
    for (const job of allJobs) {
      // First check if this job has any service points
      const existingServicePoints = await db.select().from(servicePoints).where(eq(servicePoints.jobId, job.id));
      
      if (existingServicePoints.length > 0) {
        console.log(`Job ${job.id} already has ${existingServicePoints.length} service points. Skipping.`);
        continue;
      }
      
      console.log(`Job ${job.id} has no service points. Adding some...`);
      
      // Check if job has any groups
      const existingGroups = await db.select().from(jobGroups).where(eq(jobGroups.jobId, job.id));
      
      // If no groups, create a default group
      let groupId: number;
      if (existingGroups.length === 0) {
        const [newGroup] = await db.insert(jobGroups)
          .values({
            jobId: job.id,
            name: "Main Area"
          })
          .returning();
        
        groupId = newGroup.id;
        console.log(`Created default group for job ${job.id}`);
      } else {
        groupId = existingGroups[0].id;
      }
      
      // Plant types and pot types for variety
      const plantTypes = [
        "Ficus", "Pothos", "Snake Plant", "ZZ Plant", "Monstera", 
        "Peace Lily", "Spider Plant", "Dracaena", "Rubber Plant", "Palm"
      ];
      
      const potTypes = [
        "Ceramic", "Plastic", "Terracotta", "Hanging", "Metal"
      ];
      
      // Add 4-6 service points to the job
      const pointCount = Math.floor(Math.random() * 3) + 4; // 4-6 points
      
      for (let p = 0; p < pointCount; p++) {
        // Set status based on job status
        const pointStatus = job.status === "completed" ? "completed" : 
                         p < pointCount / 2 && job.status === "in_progress" ? "completed" :
                         "pending";
        
        await db.insert(servicePoints)
          .values({
            jobId: job.id,
            groupId: groupId,
            status: pointStatus,
            plantType: plantTypes[Math.floor(Math.random() * plantTypes.length)],
            potType: potTypes[Math.floor(Math.random() * potTypes.length)]
          });
      }
      
      console.log(`Added ${pointCount} service points to job ${job.id}`);
    }
    
    console.log("Finished fixing jobs with missing service points");
    return true;
  } catch (error) {
    console.error("Error fixing jobs:", error);
    return false;
  }
}