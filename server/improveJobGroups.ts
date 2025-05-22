import { db } from "./db";
import { jobs, jobGroups, servicePoints } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Improve existing jobs to have a more realistic grouping structure
 */
export async function improveJobGroups() {
  try {
    console.log("Improving job groups to create a more realistic structure...");
    
    // Get a list of all job IDs
    const allJobs = await db.select().from(jobs);
    console.log(`Found ${allJobs.length} total jobs in database`);
    
    // Define common room and area names for different group types
    const roomNames = [
      ["Reception", "Lobby", "Waiting Area"],
      ["Conference Room", "Meeting Room", "Board Room"],
      ["Executive Office", "Manager's Office", "Director's Office"],
      ["Break Room", "Cafeteria", "Lunch Area"],
      ["Open Workspace", "Main Office", "Work Area"],
      ["Hallway", "Corridor", "Entrance"]
    ];
    
    const floorNames = [
      ["Ground Floor", "First Floor", "Level 1"],
      ["Second Floor", "Level 2", "Upper Level"],
      ["Third Floor", "Level 3", "Top Floor"],
      ["Basement", "Lower Level", "Storage Level"]
    ];
    
    const outdoorNames = [
      ["Garden", "Outdoor Patio", "Terrace"],
      ["Entrance", "Front Yard", "Walkway"]
    ];
    
    // Process each job
    for (const job of allJobs) {
      // First check existing groups
      const existingGroups = await db.select().from(jobGroups).where(eq(jobGroups.jobId, job.id));
      
      // Skip jobs with multiple groups already (more than 1)
      if (existingGroups.length > 1) {
        console.log(`Job ${job.id} already has ${existingGroups.length} groups. Skipping.`);
        continue;
      }
      
      console.log(`Enhancing groups for job ${job.id}...`);
      
      // If only one default group exists, get its service points and redistribute them
      if (existingGroups.length === 1) {
        // Get service points from the existing group
        const existingServicePoints = await db.select().from(servicePoints).where(eq(servicePoints.jobId, job.id));
        
        if (existingServicePoints.length === 0) {
          console.log(`Job ${job.id} has no service points. Skipping.`);
          continue;
        }
        
        // Determine how many groups to create (2-4)
        const groupCount = Math.floor(Math.random() * 3) + 2; // 2-4 groups
        
        // Create new group names based on customer type
        const groupNames: string[] = [];
        
        // Use all 3 categories for variety
        // Include 1-2 rooms
        const roomCount = Math.min(Math.floor(Math.random() * 2) + 1, groupCount); 
        for (let i = 0; i < roomCount; i++) {
          const roomSet = roomNames[Math.floor(Math.random() * roomNames.length)];
          const roomName = roomSet[Math.floor(Math.random() * roomSet.length)];
          groupNames.push(roomName);
        }
        
        // Include 1 floor if we have space left
        if (groupNames.length < groupCount) {
          const floorSet = floorNames[Math.floor(Math.random() * floorNames.length)];
          const floorName = floorSet[Math.floor(Math.random() * floorSet.length)];
          groupNames.push(floorName);
        }
        
        // Include 1 outdoor area if still space left
        if (groupNames.length < groupCount) {
          const outdoorSet = outdoorNames[Math.floor(Math.random() * outdoorNames.length)];
          const outdoorName = outdoorSet[Math.floor(Math.random() * outdoorSet.length)];
          groupNames.push(outdoorName);
        }
        
        // Rename the existing group
        await db.update(jobGroups)
          .set({ name: groupNames[0] })
          .where(eq(jobGroups.id, existingGroups[0].id));
        
        console.log(`Renamed existing group to "${groupNames[0]}"`);
        
        // Create additional groups
        const newGroups = [];
        for (let i = 1; i < groupNames.length; i++) {
          const [newGroup] = await db.insert(jobGroups)
            .values({
              jobId: job.id,
              name: groupNames[i]
            })
            .returning();
          
          newGroups.push(newGroup);
          console.log(`Created new group "${groupNames[i]}" for job ${job.id}`);
        }
        
        // Distribute service points across all groups
        const allGroups = [existingGroups[0], ...newGroups];
        
        // Redistribute some of the existing service points to the new groups
        for (let i = 0; i < existingServicePoints.length; i++) {
          const servicePoint = existingServicePoints[i];
          // Choose which group this service point should go to
          const targetGroupIndex = i % allGroups.length;
          const targetGroup = allGroups[targetGroupIndex];
          
          // Only move service points that aren't in the first group
          if (targetGroupIndex > 0) {
            await db.update(servicePoints)
              .set({ groupId: targetGroup.id })
              .where(eq(servicePoints.id, servicePoint.id));
          }
        }
        
        console.log(`Distributed ${existingServicePoints.length} service points across ${allGroups.length} groups for job ${job.id}`);
      }
    }
    
    console.log("Finished improving job groups");
    return true;
  } catch (error) {
    console.error("Error improving job groups:", error);
    return false;
  }
}