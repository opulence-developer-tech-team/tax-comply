import { requireAdminAuth } from "@/lib/server/middleware/admin-auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { MessageResponse } from "@/lib/server/utils/enum";
import { adminService } from "@/lib/server/admin/service";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "GET") {
      return NextResponse.json(
        { message: "error", description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    const auth = await requireAdminAuth();
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // Fetch admin data
    const admin = await adminService.getAdminById(auth.context.adminId);
    
    if (!admin) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Admin not found", data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: MessageResponse.Success,
      description: "Admin retrieved successfully",
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
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;


