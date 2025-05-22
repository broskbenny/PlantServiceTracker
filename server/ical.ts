import ical from 'ical-generator';
import { Request, Response } from 'express';
import { storage } from './storage';
import { formatDate } from '../client/src/lib/utils';
import crypto from 'crypto';

// Generate a unique iCal token for the user
export function generateICalToken(userId: number): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return crypto.createHash('sha256').update(`${userId}-${secret}-ical`).digest('hex');
}

// Verify an iCal token
export function verifyICalToken(userId: number, token: string): boolean {
  const expectedToken = generateICalToken(userId);
  return token === expectedToken;
}

// Generate iCal feed for a staff member's assigned jobs
export async function generateICalFeed(req: Request, res: Response) {
  try {
    const { userId, token } = req.params;
    const userIdNum = parseInt(userId);
    
    // Verify token
    if (!verifyICalToken(userIdNum, token)) {
      return res.status(401).send('Invalid token');
    }
    
    // Get the user
    const user = await storage.getUser(userIdNum);
    if (!user || user.role !== 'staff') {
      return res.status(404).send('Staff member not found');
    }
    
    // Create calendar
    const calendar = ical({
      name: `${user.fullName}'s Plant Service Schedule`,
      timezone: 'UTC',
      prodId: { company: 'Plant Service Work Planner', product: 'Plant Service Schedule' },
    });
    
    // Get jobs assigned to the staff member
    const jobs = await storage.getJobsForStaff(userIdNum);
    
    // Add jobs to calendar
    for (const job of jobs) {
      // Get customer details
      const customer = await storage.getCustomer(job.customerId);
      if (!customer) continue;
      
      // Create job event
      const jobEvent = calendar.createEvent({
        uid: `job-${job.id}@plantservice`,
        summary: `Plant Service @ ${customer.name}`,
        location: customer.address,
        description: `
Job #${job.id}
Customer: ${customer.name}
Plants: ${job.plantCount}
Status: ${job.status}
${job.isRecurring ? 'This is part of a recurring schedule' : ''}
        `.trim(),
        start: new Date(job.date),
        allDay: true,
      });
      
      // Add any additional details you want
      jobEvent.createAlarm({
        type: 'display',
        trigger: 3600, // 1 hour before
      });
    }
    
    // Set headers
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${user.fullName.replace(/\s+/g, '')}-schedule.ics"`);
    
    // Send calendar
    res.send(calendar.toString());
  } catch (error) {
    console.error('Error generating iCal feed:', error);
    res.status(500).send('Error generating iCal feed');
  }
}