import { db } from "./db";
import { servicePoints, jobGroups } from "@shared/schema";

/**
 * This script adds service points to existing jobs that don't have any
 */
export async function addServicePointsToJobs() {
  try {
    console.log("Adding service points to jobs that don't have any...");
    
    // Get all jobs that exist in the database
    const allJobs = await db.query.jobs.findMany({
      with: {
        servicePoints: true,
        groups: true
      }
    });
    
    console.log(`Found ${allJobs.length} total jobs in database`);
    
    // Plant types and pot types for variety
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
    
    // Process each job
    for (const job of allJobs) {
      // Skip jobs that already have service points
      if (job.servicePoints && job.servicePoints.length > 0) {
        console.log(`Job ${job.id} already has ${job.servicePoints.length} service points. Skipping.`);
        continue;
      }
      
      console.log(`Adding service points to job ${job.id}...`);
      
      // If job has no groups, create one default group
      if (!job.groups || job.groups.length === 0) {
        const [newGroup] = await db.insert(jobGroups).values({
          jobId: job.id,
          name: "Main Area"
        }).returning();
        
        console.log(`Created default group for job ${job.id}`);
        
        // Add 3-6 service points to the default group
        const pointCount = Math.floor(Math.random() * 4) + 3; // 3-6 points
        
        for (let p = 0; p < pointCount; p++) {
          // Set status based on job status
          const pointStatus = job.status === "completed" ? "completed" : 
                           p < pointCount / 2 && job.status === "in_progress" ? "completed" :
                           "pending";
          
          await db.insert(servicePoints).values({
            jobId: job.id,
            groupId: newGroup.id,
            status: pointStatus,
            plantType: plantTypes[Math.floor(Math.random() * plantTypes.length)],
            potType: potTypes[Math.floor(Math.random() * potTypes.length)]
          });
        }
        
        console.log(`Added ${pointCount} service points to job ${job.id}`);
      } else {
        // Job has groups, add service points to each group
        for (const group of job.groups) {
          // Add 2-4 service points per group
          const pointCount = Math.floor(Math.random() * 3) + 2; // 2-4 points
          
          for (let p = 0; p < pointCount; p++) {
            // Set status based on job status
            const pointStatus = job.status === "completed" ? "completed" : 
                             p < pointCount / 2 && job.status === "in_progress" ? "completed" :
                             "pending";
            
            await db.insert(servicePoints).values({
              jobId: job.id,
              groupId: group.id,
              status: pointStatus,
              plantType: plantTypes[Math.floor(Math.random() * plantTypes.length)],
              potType: potTypes[Math.floor(Math.random() * potTypes.length)]
            });
          }
          
          console.log(`Added ${pointCount} service points to group ${group.id} in job ${job.id}`);
        }
      }
    }
    
    console.log("Finished adding service points to jobs");
  } catch (error) {
    console.error("Error adding service points to jobs:", error);
  }
}