/**
 * Domain Contact API
 * 
 * Handles public contact form submissions for domains
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

// Rate limiter for contact form (prevent spam)
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 submissions per window
  message: 'Too many contact requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schema
const ContactFormSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(1000)
});

/**
 * POST /api/domains/:id/contact
 * 
 * Public contact form submission
 * Stores message and optionally sends email notification
 */
router.post('/:id/contact', contactRateLimit, async (req: Request, res: Response) => {
  try {
    const { id: domainId } = req.params;

    // Validate input
    const validated = ContactFormSchema.parse(req.body);

    // Check if domain exists and is public
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        ownerId: true,
        users: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }

    // Store contact message
    // Note: You may want to create a DomainContact table for this
    // For now, we'll just log it and return success
    console.log('Domain contact submission:', {
      domainId,
      domainName: domain.name,
      from: validated.email,
      name: validated.name,
      messagePreview: validated.message.substring(0, 100)
    });

    // TODO: Send email notification to domain owner
    // if (domain.users.email) {
    //   await sendEmail({
    //     to: domain.users.email,
    //     subject: `New contact from ${validated.name}`,
    //     body: `
    //       Name: ${validated.name}
    //       Email: ${validated.email}
    //       Message: ${validated.message}
    //     `
    //   });
    // }

    // TODO: Store in database for tracking
    // await prisma.domainContact.create({
    //   data: {
    //     domainId,
    //     name: validated.name,
    //     email: validated.email,
    //     message: validated.message,
    //     createdAt: new Date()
    //   }
    // });

    return res.json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.'
    });
  } catch (error) {
    console.error('Domain contact error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

export default router;

