import { Types } from "mongoose";
import crypto from "crypto";
import User from "../user/entity";
import { emailService } from "../utils/email";
import { logger } from "../utils/logger";
import { hashPassCode } from "../utils/auth";

class AuthService {
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateOTPExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    return expiry;
  }

  async sendOTPToEmail(
    email: string,
    firstName: string,
    otp: string,
    verificationLink: string
  ): Promise<boolean> {
    try {
      const emailHtml = emailService.generateOTPEmailTemplate(otp, firstName, verificationLink);
      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "Email Verification Code - TaxComply NG",
        html: emailHtml,
      });

      if (!emailSent) {
        logger.error(
          "Failed to send OTP email",
          new Error("Email service returned false"),
          { email }
        );
        return false;
      }

      return true;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error sending OTP email", err, { email });
      return false;
    }
  }

  async saveOTPToUser(
    userId: Types.ObjectId,
    otp: string,
    otpExpiry: Date
  ): Promise<boolean> {
    try {
      await User.findByIdAndUpdate(userId, {
        otp,
        otpExpiry,
      });

      return true;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error saving OTP to user", err, { userId });
      return false;
    }
  }

  generateVerificationTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    return expiry;
  }

  async saveVerificationTokenToUser(
    userId: Types.ObjectId,
    verificationToken: string,
    tokenExpiry: Date
  ): Promise<boolean> {
    try {
      await User.findByIdAndUpdate(userId, {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: tokenExpiry,
      });

      return true;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error saving verification token to user", err, { userId });
      return false;
    }
  }

  async generateAndSendOTP(
    userId: Types.ObjectId,
    email: string,
    firstName: string
  ): Promise<{ success: boolean }> {
    try {
      const otp = this.generateOTP();
      const otpExpiry = this.generateOTPExpiry();

      const verificationToken = this.generateResetToken();
      const tokenExpiry = this.generateVerificationTokenExpiry();

      const saved = await this.saveOTPToUser(userId, otp, otpExpiry);
      if (!saved) {
        return { success: false };
      }

      const tokenSaved = await this.saveVerificationTokenToUser(userId, verificationToken, tokenExpiry);
      if (!tokenSaved) {
        logger.warn("OTP saved but verification token save failed", { userId, email });
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const verificationLink = `${baseUrl}/verify-email/${encodeURIComponent(email)}/${otp}`;

      const emailSent = await this.sendOTPToEmail(email, firstName, otp, verificationLink);
      if (!emailSent) {
        logger.warn("OTP saved but email sending failed", { userId, email });
        return { success: false };
      }

      return { success: true };
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error generating and sending OTP", err, { userId, email });
      return { success: false };
    }
  }

  async verifyOTP(email: string, otp: string): Promise<{
    success: boolean;
    message: string;
    user?: any;
  }> {
    try {
      const user = await User.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!user) {
        return {
          success: false,
          message: "User not found.",
        };
      }

      if (user.isEmailVerified) {
        const userObject = user.toObject();
        const { password, ...userWithoutPassword } = userObject;
        return {
          success: true,
          message: "Email is already verified.",
          user: userWithoutPassword,
        };
      }

      if (!user.otp) {
        return {
          success: false,
          message: "No OTP found. Please request a new OTP.",
        };
      }

      if (!user.otpExpiry || new Date() > user.otpExpiry) {
        return {
          success: false,
          message: "OTP has expired. Please request a new OTP.",
        };
      }

      if (user.otp !== otp) {
        return {
          success: false,
          message: "Invalid OTP. Please check and try again.",
        };
      }

      user.isEmailVerified = true;
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      const userObject = user.toObject();
      const { password, ...userWithoutPassword } = userObject;

      return {
        success: true,
        message: "Email verified successfully!",
        user: userWithoutPassword,
      };
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error verifying OTP", err, { email });
      return {
        success: false,
        message: "An error occurred while verifying OTP. Please try again.",
      };
    }
  }

  async resendOTP(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const user = await User.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!user) {
        return {
          success: false,
          message: "User not found.",
        };
      }

      if (user.isEmailVerified) {
        return {
          success: false,
          message: "Email is already verified.",
        };
      }

      const result = await this.generateAndSendOTP(
        user._id,
        user.email,
        user.firstName
      );

      if (!result.success) {
        return {
          success: false,
          message: "Failed to send OTP. Please try again later.",
        };
      }

      return {
        success: true,
        message: "OTP has been sent to your email.",
      };
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error resending OTP", err, { email });
      return {
        success: false,
        message: "An error occurred while resending OTP. Please try again.",
      };
    }
  }

  async verifyEmailByToken(token: string): Promise<{
    success: boolean;
    message: string;
    user?: any;
  }> {
    try {
      const user = await User.findOne({
        emailVerificationToken: token,
      });

      if (!user) {
        return {
          success: false,
          message: "Invalid or expired verification link.",
        };
      }

      if (user.isEmailVerified) {
        const userObject = user.toObject();
        const { password, ...userWithoutPassword } = userObject;
        return {
          success: true,
          message: "Email is already verified.",
          user: userWithoutPassword,
        };
      }

      if (!user.emailVerificationTokenExpiry || new Date() > user.emailVerificationTokenExpiry) {
        await User.findByIdAndUpdate(user._id, {
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
        });
        return {
          success: false,
          message: "Verification link has expired. Please login to request a new verification link.",
        };
      }

      user.isEmailVerified = true;
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      const userObject = user.toObject();
      const { password, ...userWithoutPassword } = userObject;

      return {
        success: true,
        message: "Email verified successfully!",
        user: userWithoutPassword,
      };
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error verifying email by token", err, { token });
      return {
        success: false,
        message: "An error occurred while verifying your email. Please try again.",
      };
    }
  }

  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateResetTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    return expiry;
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    try {
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
      const emailHtml = emailService.generatePasswordResetEmailTemplate(
        firstName,
        resetUrl
      );
      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "Reset Your Password - TaxComply NG",
        html: emailHtml,
      });

      if (!emailSent) {
        logger.error(
          "Failed to send password reset email",
          new Error("Email service returned false"),
          { email }
        );
        return false;
      }

      return true;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error sending password reset email", err, { email });
      return false;
    }
  }

  async saveResetTokenToUser(
    userId: Types.ObjectId,
    resetToken: string,
    resetTokenExpiry: Date
  ): Promise<boolean> {
    try {
      await User.findByIdAndUpdate(userId, {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetTokenExpiry,
      });

      return true;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error saving reset token to user", err, { userId });
      return false;
    }
  }

  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const user = await User.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!user) {
        return {
          success: true,
          message: "If an account with that email exists, a password reset link has been sent.",
        };
      }

      const resetToken = this.generateResetToken();
      const resetTokenExpiry = this.generateResetTokenExpiry();

      const saved = await this.saveResetTokenToUser(
        user._id,
        resetToken,
        resetTokenExpiry
      );
      if (!saved) {
        return {
          success: false,
          message: "Failed to process password reset request. Please try again later.",
        };
      }

      const emailSent = await this.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken
      );
      if (!emailSent) {
        logger.warn("Reset token saved but email sending failed", {
          userId: user._id,
          email: user.email,
        });
        return {
          success: false,
          message: "Failed to send password reset email. Please try again later.",
        };
      }

      return {
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      };
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error requesting password reset", err, { email });
      return {
        success: false,
        message: "An error occurred while processing your request. Please try again.",
      };
    }
  }

  async verifyResetToken(token: string): Promise<{
    valid: boolean;
    message: string;
    userId?: Types.ObjectId;
  }> {
    try {
      const user = await User.findOne({
        passwordResetToken: token,
      });

      if (!user) {
        return {
          valid: false,
          message: "Invalid or expired reset token.",
        };
      }

      if (!user.passwordResetExpiry || new Date() > user.passwordResetExpiry) {
        await User.findByIdAndUpdate(user._id, {
          passwordResetToken: null,
          passwordResetExpiry: null,
        });
        return {
          valid: false,
          message: "Reset token has expired. Please request a new password reset.",
        };
      }

      return {
        valid: true,
        message: "Reset token is valid.",
        userId: user._id,
      };
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error verifying reset token", err, { token });
      return {
        valid: false,
        message: "An error occurred while verifying the reset token. Please try again.",
      };
    }
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const tokenVerification = await this.verifyResetToken(token);
      if (!tokenVerification.valid || !tokenVerification.userId) {
        return {
          success: false,
          message: tokenVerification.message,
        };
      }

      const hashedPassword = (await hashPassCode(newPassword)) as string;

      await User.findByIdAndUpdate(tokenVerification.userId, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      });

      logger.info("Password reset successful", {
        userId: tokenVerification.userId.toString(),
      });

      return {
        success: true,
        message: "Password has been reset successfully. You can now sign in with your new password.",
      };
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error resetting password", err, { token });
      return {
        success: false,
        message: "An error occurred while resetting your password. Please try again.",
      };
    }
  }
}

export const authService = new AuthService();

