import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { MessageResponse } from "./enum";
import { utils } from "./index";
import mongoose from "mongoose";
import { adminService } from "../admin/service";

interface DecodedAdminToken {
  adminId: string;
  role: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Verify admin authentication token
 * Returns admin ID if valid, null otherwise
 */
export async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_auth_token")?.value;

  if (!token) {
    return {
      valid: false,
      response: utils.customResponse({
        status: 401,
        message: MessageResponse.Error,
        description: "No admin token provided",
        data: null,
      }),
    };
  }

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as DecodedAdminToken;

    // CRITICAL: Verify this is an admin token
    if (!decodedToken?.adminId || !decodedToken?.isAdmin || decodedToken.role !== "admin") {
      return {
        valid: false,
        response: utils.customResponse({
          status: 401,
          message: MessageResponse.Error,
          description: "Invalid admin token",
          data: null,
        }),
      };
    }

    const adminId = mongoose.Types.ObjectId.createFromHexString(decodedToken.adminId);

    // Verify admin still exists and is active
    const admin = await adminService.getAdminById(adminId);

    if (!admin || !admin.isActive) {
      return {
        valid: false,
        response: utils.customResponse({
          status: 401,
          message: MessageResponse.Error,
          description: "Admin account not found or inactive",
          data: null,
        }),
      };
    }

    return {
      valid: true,
      adminId,
    };
  } catch (err) {
    return {
      valid: false,
      response: utils.customResponse({
        status: 401,
        message: MessageResponse.Error,
        description: "Invalid or expired admin token",
        data: null,
      }),
    };
  }
}


