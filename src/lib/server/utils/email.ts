import nodemailer from "nodemailer";
import { logger } from "./logger";

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export const emailService = {
  async sendEmail({ to, subject, html, replyTo }: SendEmailOptions): Promise<boolean> {
    try {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        logger.error(
          "Gmail SMTP credentials not configured",
          new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables"),
          {}
        );
        return false;
      }

      const transporter = createTransporter();

      await transporter.verify();

      const info = await transporter.sendMail({
        from: `"TaxComply NG" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      });

      logger.info("Email sent successfully", {
        messageId: info.messageId,
        to,
        subject,
      });

      return true;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to send email", err, {
        to,
        subject,
      });
      return false;
    }
  },

  generateOTPEmailTemplate(otp: string, firstName: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - TaxComply NG</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fafafa;">
            <tr>
              <td style="padding: 60px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #ffffff;">
                  <!-- Subtle Brand Header -->
                  <tr>
                    <td style="padding: 40px 48px 32px 48px; border-bottom: 1px solid #f0f0f0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td>
                            <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: 600; letter-spacing: -0.3px;">TaxComply NG</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 56px 48px;">
                      <p style="margin: 0 0 32px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6; font-weight: 400;">
                        Hello ${firstName},
                      </p>
                      
                      <p style="margin: 0 0 40px 0; color: #4a4a4a; font-size: 15px; line-height: 1.7;">
                        Please copy the verification code below and enter it in the application to complete your email verification.
                      </p>
                      
                      <!-- Verification Code Display -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 40px 0;">
                        <tr>
                          <td style="background-color: #f8f9fa; border: 1px solid #e8e8e8; border-radius: 6px; padding: 32px 24px;">
                            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.8px; text-align: center;">Verification Code</p>
                            <p style="margin: 0; color: #065f46; font-size: 36px; font-weight: 600; letter-spacing: 8px; font-family: 'Courier New', 'Monaco', monospace; text-align: center; line-height: 1.2;">${otp}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                        This code will expire in 10 minutes.
                      </p>
                      
                      <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                        If you did not request this verification, please disregard this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 32px 48px; background-color: #fafafa; border-top: 1px solid #f0f0f0;">
                      <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                        This email contains confidential information intended solely for the addressee. Unauthorized access, disclosure, or use is prohibited.
                      </p>
                      <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                        TaxComply NG is a NRS-compliant tax compliance platform. All communications are secured and encrypted.
                      </p>
                      <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
                        © ${new Date().getFullYear()} TaxComply NG. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  generatePasswordResetEmailTemplate(firstName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - TaxComply NG</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f0fdf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(16, 185, 129, 0.15); border: 1px solid #d1fae5;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%); padding: 24px 30px; text-align: center; position: relative; overflow: hidden;">
                      <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;"></div>
                      <div style="position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; background: rgba(255, 255, 255, 0.08); border-radius: 50%;"></div>
                      <div style="position: relative; z-index: 1;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">TaxComply NG</h1>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px; font-weight: 500;">Stay Compliant. Avoid Penalties. Sleep Well.</p>
                        <div style="margin-top: 12px; display: inline-block; padding: 5px 14px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; backdrop-filter: blur(10px);">
                          <p style="margin: 0; color: #ffffff; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">NRS-Compliant Platform</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 50px 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #064e3b; font-size: 24px; font-weight: 700;">Hello ${firstName},</h2>
                      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.7;">
                        We received a request to reset your password for your <strong style="color: #047857;">TaxComply NG</strong> account. Click the button below to securely create a new password and regain access to your tax compliance dashboard.
                      </p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 35px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">Reset Password</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.6;">
                        Or copy and paste this link: <a href="${resetUrl}" style="color: #059669; text-decoration: underline; font-weight: 500;">${resetUrl}</a>
                      </p>
                      <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                          <strong style="color: #6b7280;">⏱️ Expires in 1 hour</strong><br/>
                          This password reset link will expire in 1 hour for your security. If you didn't request a password reset, please ignore this email or contact our support team immediately.
                        </p>
                        <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                          <strong style="color: #047857;">🔒 Security Note:</strong> Never share your password reset link with anyone. TaxComply NG will never ask for your password via email.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; text-align: center; border-top: 2px solid #d1fae5;">
                      <p style="margin: 0 0 8px 0; color: #065f46; font-size: 13px; font-weight: 600;">
                        © ${new Date().getFullYear()} TaxComply NG. All rights reserved.
                      </p>
                      <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        Official NRS-Compliant Tax Compliance Platform
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  generateContactFormSubmissionTemplate(formData: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    subject: string;
    message: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission - TaxComply NG</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f0fdf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(16, 185, 129, 0.15); border: 1px solid #d1fae5;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%); padding: 24px 30px; text-align: center; position: relative; overflow: hidden;">
                      <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;"></div>
                      <div style="position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; background: rgba(255, 255, 255, 0.08); border-radius: 50%;"></div>
                      <div style="position: relative; z-index: 1;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">New Contact Form Submission</h1>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px; font-weight: 500;">TaxComply NG - Contact Request</p>
                        <div style="margin-top: 12px; display: inline-block; padding: 5px 14px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; backdrop-filter: blur(10px);">
                          <p style="margin: 0; color: #ffffff; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Action Required</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 50px 40px;">
                      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                        <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: 600;">📧 New Contact Form Submission Received</p>
                        <p style="margin: 8px 0 0 0; color: #047857; font-size: 14px;">A potential client has reached out through the contact form.</p>
                      </div>
                      
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <strong style="color: #064e3b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Name:</strong>
                            <p style="margin: 4px 0 0 0; color: #374151; font-size: 16px; font-weight: 500;">${formData.name}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <strong style="color: #064e3b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email:</strong>
                            <p style="margin: 4px 0 0 0; color: #374151; font-size: 16px;">
                              <a href="mailto:${formData.email}" style="color: #059669; text-decoration: none; font-weight: 500;">${formData.email}</a>
                            </p>
                          </td>
                        </tr>
                        ${formData.company ? `
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <strong style="color: #064e3b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Company:</strong>
                            <p style="margin: 4px 0 0 0; color: #374151; font-size: 16px; font-weight: 500;">${formData.company}</p>
                          </td>
                        </tr>
                        ` : ''}
                        ${formData.phone ? `
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <strong style="color: #064e3b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Phone:</strong>
                            <p style="margin: 4px 0 0 0; color: #374151; font-size: 16px;">
                              <a href="tel:${formData.phone}" style="color: #059669; text-decoration: none; font-weight: 500;">${formData.phone}</a>
                            </p>
                          </td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <strong style="color: #064e3b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Subject:</strong>
                            <p style="margin: 4px 0 0 0; color: #374151; font-size: 16px; font-weight: 600;">${formData.subject}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                        <strong style="color: #064e3b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 12px;">Message:</strong>
                        <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${formData.message}</p>
                      </div>
                      
                      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px;">
                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                          <strong>⏰ Response Time:</strong> Please respond within 24 hours to maintain excellent customer service standards.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; text-align: center; border-top: 2px solid #d1fae5;">
                      <p style="margin: 0 0 8px 0; color: #065f46; font-size: 13px; font-weight: 600;">
                        © ${new Date().getFullYear()} TaxComply NG. All rights reserved.
                      </p>
                      <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        Official NRS-Compliant Tax Compliance Platform
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  generateContactFormConfirmationTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thank You for Contacting Us - TaxComply NG</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f0fdf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(16, 185, 129, 0.15); border: 1px solid #d1fae5;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%); padding: 24px 30px; text-align: center; position: relative; overflow: hidden;">
                      <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;"></div>
                      <div style="position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; background: rgba(255, 255, 255, 0.08); border-radius: 50%;"></div>
                      <div style="position: relative; z-index: 1;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">TaxComply NG</h1>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px; font-weight: 500;">Stay Compliant. Avoid Penalties. Sleep Well.</p>
                        <div style="margin-top: 12px; display: inline-block; padding: 5px 14px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; backdrop-filter: blur(10px);">
                          <p style="margin: 0; color: #ffffff; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">NRS-Compliant Platform</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 50px 40px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);">
                          <span style="font-size: 40px;">✓</span>
                        </div>
                      </div>
                      <h2 style="margin: 0 0 20px 0; color: #064e3b; font-size: 24px; font-weight: 700; text-align: center;">Thank You, ${name}!</h2>
                      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.7; text-align: center;">
                        We've successfully received your message and our team will get back to you within <strong style="color: #047857;">24 hours</strong>.
                      </p>
                      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px; margin: 30px 0;">
                        <p style="margin: 0 0 16px 0; color: #065f46; font-size: 15px; font-weight: 600;">What happens next?</p>
                        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                          <li style="margin-bottom: 8px;">Our compliance experts will review your inquiry</li>
                          <li style="margin-bottom: 8px;">We'll prepare a personalized response tailored to your tax needs</li>
                          <li style="margin-bottom: 8px;">You'll receive a detailed reply via email within 24 hours</li>
                        </ul>
                      </div>
                      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-top: 30px;">
                        <p style="margin: 0 0 12px 0; color: #064e3b; font-size: 14px; font-weight: 600;">Need immediate assistance?</p>
                        <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                          For urgent tax compliance matters, call us at <a href="tel:+2348000000000" style="color: #059669; text-decoration: none; font-weight: 500;">+234 (0) 800 000 0000</a> or email <a href="mailto:support@taxcomply.com.ng" style="color: #059669; text-decoration: none; font-weight: 500;">support@taxcomply.com.ng</a>
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; text-align: center; border-top: 2px solid #d1fae5;">
                      <p style="margin: 0 0 8px 0; color: #065f46; font-size: 13px; font-weight: 600;">
                        © ${new Date().getFullYear()} TaxComply NG. All rights reserved.
                      </p>
                      <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        Official NRS-Compliant Tax Compliance Platform
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },
};

