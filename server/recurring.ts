import { RecurringPattern, InsertJob, Job } from "@shared/schema";
import { storage } from "./storage";

// Day constants for reference
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Calculates the next job dates based on a recurring pattern
 * @param pattern The recurring pattern to calculate dates for
 * @param startDate Start date to calculate from (usually today)
 * @param occurrences Number of occurrences to generate (default 10)
 * @returns Array of dates for the next job occurrences
 */
export function calculateJobDates(
  pattern: RecurringPattern, 
  startDate: Date = new Date(), 
  occurrences: number = 10
): Date[] {
  const dates: Date[] = [];
  const patternStartDate = new Date(pattern.startDate);
  
  // If the pattern start date is in the future, use that as our reference
  const referenceDate = patternStartDate > startDate ? patternStartDate : startDate;
  
  // Clone the reference date to avoid modifying it
  let currentDate = new Date(referenceDate);
  
  // Ensure we start with the beginning of the day
  currentDate.setHours(0, 0, 0, 0);
  
  switch (pattern.frequency) {
    case 'daily':
      // For daily patterns, simply add days
      for (let i = 0; i < occurrences; i++) {
        // Skip to the next day
        if (i > 0) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Check if we've hit the end date
        if (pattern.endDate && new Date(pattern.endDate) < currentDate) {
          break;
        }
        
        dates.push(new Date(currentDate));
      }
      break;
      
    case 'weekly':
      // For weekly patterns, we need to check the days of the week
      const daysOfWeek = pattern.daysOfWeek as string[];
      
      while (dates.length < occurrences) {
        const dayName = DAYS_OF_WEEK[currentDate.getDay()];
        
        // If this day is in our pattern, add it
        if (daysOfWeek.includes(dayName)) {
          // Check if we've hit the end date
          if (pattern.endDate && new Date(pattern.endDate) < currentDate) {
            break;
          }
          
          dates.push(new Date(currentDate));
        }
        
        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Safety check to prevent infinite loops
        if (dates.length === 0 && currentDate > new Date(referenceDate.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          // If we've gone 30 days without finding a match, there's likely an issue with the pattern
          break;
        }
      }
      break;
      
    case 'biweekly':
      // Biweekly means every two weeks on the same day(s) of the week
      const biweeklyDays = pattern.daysOfWeek as string[];
      let weekCounter = 0;
      
      while (dates.length < occurrences) {
        const dayName = DAYS_OF_WEEK[currentDate.getDay()];
        
        // If this day is in our pattern and it's the right week
        if (biweeklyDays.includes(dayName) && weekCounter % 2 === 0) {
          // Check if we've hit the end date
          if (pattern.endDate && new Date(pattern.endDate) < currentDate) {
            break;
          }
          
          dates.push(new Date(currentDate));
        }
        
        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // If we've moved to a new Sunday, increment the week counter
        if (currentDate.getDay() === 0) {
          weekCounter++;
        }
        
        // Safety check
        if (dates.length === 0 && currentDate > new Date(referenceDate.getTime() + 60 * 24 * 60 * 60 * 1000)) {
          break;
        }
      }
      break;
      
    case 'monthly':
      // For monthly patterns, we use the same day of the month
      const dayOfMonth = patternStartDate.getDate();
      
      for (let i = 0; i < occurrences; i++) {
        if (i > 0) {
          // Move to the next month
          currentDate.setMonth(currentDate.getMonth() + 1);
          // Reset to the same day of month
          currentDate.setDate(Math.min(dayOfMonth, getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())));
        } else {
          // For the first occurrence, make sure we're on the right day of month
          currentDate.setDate(Math.min(dayOfMonth, getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())));
        }
        
        // Check if we've hit the end date
        if (pattern.endDate && new Date(pattern.endDate) < currentDate) {
          break;
        }
        
        dates.push(new Date(currentDate));
      }
      break;
      
    case 'custom':
      // For custom intervals, use the specified number of days
      const interval = pattern.customInterval || 1; // Default to 1 if not specified
      
      for (let i = 0; i < occurrences; i++) {
        if (i > 0) {
          // Add the custom interval in days
          currentDate.setDate(currentDate.getDate() + interval);
        }
        
        // Check if we've hit the end date
        if (pattern.endDate && new Date(pattern.endDate) < currentDate) {
          break;
        }
        
        dates.push(new Date(currentDate));
      }
      break;
  }
  
  return dates;
}

/**
 * Helper function to get the number of days in a month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Generates job instances from a recurring pattern
 * @param patternId ID of the recurring pattern to generate jobs for
 * @param templateJobId ID of the template job to use as a base (optional)
 * @param startDate Start date to calculate from (usually today)
 * @param occurrences Number of occurrences to generate
 * @returns Array of created job IDs
 */
export async function generateJobsFromPattern(
  patternId: number, 
  templateJobId?: number,
  startDate: Date = new Date(),
  occurrences: number = 10
): Promise<number[]> {
  // Get the recurring pattern
  const pattern = await storage.getRecurringPattern(patternId);
  if (!pattern) {
    throw new Error(`Recurring pattern with ID ${patternId} not found`);
  }
  
  // If a template job ID is provided, use that as the basis for the new jobs
  let templateJob: Job | undefined;
  if (templateJobId) {
    templateJob = await storage.getJob(templateJobId);
    if (!templateJob) {
      throw new Error(`Template job with ID ${templateJobId} not found`);
    }
  }
  
  // Calculate the dates for the recurring job
  const jobDates = calculateJobDates(pattern, startDate, occurrences);
  
  // Create a job for each date
  const createdJobIds: number[] = [];
  
  for (const date of jobDates) {
    // Format the date as a string
    const formattedDate = date.toISOString().split('T')[0];
    
    // Create a new job based on the template or with default values
    const newJob: InsertJob = templateJob ? {
      customerId: templateJob.customerId,
      date: formattedDate,
      status: 'assigned',
      assignedToId: templateJob.assignedToId,
      plantCount: templateJob.plantCount,
      isRecurring: true,
      recurringPatternId: patternId
    } : {
      customerId: 1, // Default to first customer if no template
      date: formattedDate,
      status: 'assigned',
      assignedToId: 1, // Default to first staff member if no template
      plantCount: 0,
      isRecurring: true,
      recurringPatternId: patternId
    };
    
    // Create the job in the database
    const createdJob = await storage.createJob(newJob);
    createdJobIds.push(createdJob.id);
    
    // If we have a template job, also copy any groups and service points
    if (templateJob) {
      await copyJobDetailsFromTemplate(createdJob.id, templateJob.id);
    }
  }
  
  return createdJobIds;
}

/**
 * Copy job groups and service points from a template job to a new job
 * @param newJobId The ID of the newly created job
 * @param templateJobId The ID of the template job to copy from
 */
async function copyJobDetailsFromTemplate(newJobId: number, templateJobId: number): Promise<void> {
  // Get all groups from the template job
  const templateGroups = await storage.getJobGroupsByJob(templateJobId);
  
  // Map of template group IDs to new group IDs (for later use with service points)
  const groupIdMap = new Map<number, number>();
  
  // Create new groups for each template group
  for (const templateGroup of templateGroups) {
    const newGroup = await storage.createJobGroup({
      jobId: newJobId,
      name: templateGroup.name
    });
    
    // Store the mapping of template group ID to new group ID
    groupIdMap.set(templateGroup.id, newGroup.id);
    
    // Get service points for this template group
    const templateServicePoints = await storage.getServicePointsByGroup(templateGroup.id);
    
    // Create new service points for each template service point
    for (const templatePoint of templateServicePoints) {
      await storage.createServicePoint({
        jobId: newJobId,
        groupId: newGroup.id,
        plantType: templatePoint.plantType,
        potType: templatePoint.potType,
        status: 'pending'
      });
    }
  }
  
  // Handle service points that don't belong to any group
  const templateServicePoints = await storage.getServicePointsByJob(templateJobId);
  const ungroupedPoints = templateServicePoints.filter(point => !point.groupId);
  
  // Create new service points for each ungrouped template service point
  for (const templatePoint of ungroupedPoints) {
    await storage.createServicePoint({
      jobId: newJobId,
      groupId: null,
      plantType: templatePoint.plantType,
      potType: templatePoint.potType,
      status: 'pending'
    });
  }
}