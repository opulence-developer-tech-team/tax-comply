import { NextResponse } from "next/server";
import { verifyAdminAuth } from "../utils/admin-auth";
import { Types } from "mongoose";

export interface AdminAuthContext {
  adminId: Types.ObjectId;
}

/**
 * Middleware to require admin authentication
 * Returns admin context if authorized, error response otherwise
 */
export async function requireAdminAuth(): Promise<{
  authorized: boolean;
  context?: AdminAuthContext;
  response?: NextResponse;
}> {
  const authResult = await verifyAdminAuth();

  if (!authResult.valid || !authResult.adminId) {
    return {
      authorized: false,
      response: authResult.response!,
    };
  }

  return {
    authorized: true,
    context: {
      adminId: authResult.adminId,
    },
  };
}


