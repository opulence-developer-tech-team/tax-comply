import { NextResponse } from "next/server";
import { emailService } from "@/lib/server/utils/email";
import { logger } from "@/lib/server/utils/logger";
import { contactValidator } from "@/lib/server/contact/validator";
import { MessageResponse } from "@/lib/server/utils/enum";

async function handler(request: Request): Promise<NextResponse> {
  try {
    if (request.method !== "POST") {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid JSON in request body",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate request body using Joi schema
    const validation = contactValidator.contactForm(body);
    if (!validation.valid) {
      return validation.response!;
    }

    // Get admin email from environment or use default
    const adminEmail = process.env.CONTACT_EMAIL || process.env.GMAIL_USER || "contact@taxcomply.com.ng";

    // Generate email templates
    const adminEmailHtml = emailService.generateContactFormSubmissionTemplate({
      name: body.name,
      email: body.email,
      company: body.company,
      phone: body.phone,
      subject: body.subject,
      message: body.message,
    });

    const confirmationEmailHtml = emailService.generateContactFormConfirmationTemplate(body.name);

    // Send email to admin/internal team
    const adminEmailSent = await emailService.sendEmail({
      to: adminEmail,
      subject: `New Contact Form Submission: ${body.subject}`,
      html: adminEmailHtml,
      replyTo: body.email,
    });

    // Send confirmation email to user
    const confirmationEmailSent = await emailService.sendEmail({
      to: body.email,
      subject: "Thank You for Contacting TaxComply NG",
      html: confirmationEmailHtml,
    });

    if (!adminEmailSent) {
      logger.error(
        "Failed to send contact form email to admin",
        new Error("Email sending failed"),
        { email: body.email, subject: body.subject }
      );
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Failed to send your message. Please try again later.",
          data: null,
        },
        { status: 500 }
      );
    }

    // Log even if confirmation fails (non-critical)
    if (!confirmationEmailSent) {
      logger.warn("Failed to send confirmation email to user", {
        email: body.email,
      });
    }

    logger.info("Contact form submission received", {
      email: body.email,
      subject: body.subject,
      name: body.name,
    });

    return NextResponse.json(
      {
        message: MessageResponse.Success,
        description: "Your message has been sent successfully. We'll get back to you within 24 hours.",
        data: null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Error processing contact form submission", err, {});
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: "An error occurred while processing your request. Please try again later.",
        data: null,
      },
      { status: 500 }
    );
  }
}

export const POST = handler;









