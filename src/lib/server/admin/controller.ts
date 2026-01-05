import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { MessageResponse } from "../utils/enum";
import { utils } from "../utils";
import { comparePassCode } from "../utils/auth";
import { adminService } from "./service";
import { logger } from "../utils/logger";
import { IAdminSignIn } from "./interface";

const jwtSecret = process.env.JWT_SECRET || "";

class AdminController {
  public async signIn(body: IAdminSignIn) {
    try {
      const { password, email } = body;

      // Validate input
      if (!email || !password) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Email and password are required.",
          data: null,
        });
      }

      // Find active admin by email
      const admin = await adminService.findActiveAdminByEmail(email);

      if (!admin) {
        logger.warn("Admin login attempt with invalid email or inactive account", {
          email,
        });
        return utils.customResponse({
          status: 401,
          message: MessageResponse.Error,
          description: "Invalid email or password.",
          data: null,
        });
      }

      // Verify password
      const isPasswordValid = await comparePassCode(password, admin.password);
      if (!isPasswordValid) {
        logger.warn("Invalid password attempt for admin", {
          email,
          adminId: admin._id?.toString(),
        });
        return utils.customResponse({
          status: 401,
          message: MessageResponse.Error,
          description: "Invalid email or password.",
          data: null,
        });
      }

      // Update last login
      if (admin._id) {
        await adminService.updateLastLogin(admin._id);
      }

      // Create admin token (separate from user token)
      const tokenPayload: any = {
        adminId: admin._id.toString(),
        role: "admin",
        isAdmin: true, // Explicit admin flag
      };

      const token = jwt.sign(tokenPayload, jwtSecret, {
        expiresIn: "30d",
      });

      // Store admin token in separate cookie (isolated from user auth)
      const cookieStore = await cookies();
      cookieStore.set("admin_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      logger.info("Admin login successful", {
        email,
        adminId: admin._id.toString(),
      });

      const adminObject = admin.toObject();
      const { password: _, ...adminWithoutPassword } = adminObject;

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Admin sign in successful.",
        data: {
          _id: admin._id.toString(),
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          phoneNumber: admin.phoneNumber,
          isActive: admin.isActive,
          lastLogin: admin.lastLogin,
          permissions: admin.permissions || [],
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error in admin signin", err, { email: body.email });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to sign in. Please try again.",
        data: null,
      });
    }
  }

  public async logout() {
    try {
      const cookieStore = await cookies();
      cookieStore.delete("admin_auth_token");

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Logged out successfully.",
        data: null,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error in admin logout", err);
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to log out. Please try again.",
        data: null,
      });
    }
  }
}

export const adminController = new AdminController();


