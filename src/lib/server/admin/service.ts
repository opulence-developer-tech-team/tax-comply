import { Types } from "mongoose";
import Admin from "./entity";
import { IAdminCreate } from "./interface";

class AdminService {
  public async findAdminByEmail(email: string) {
    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    });

    return admin;
  }

  public async findActiveAdminByEmail(email: string) {
    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
      isActive: true,
    });

    return admin;
  }

  public async createAdmin(adminData: IAdminCreate) {
    const admin = new Admin({
      ...adminData,
      email: adminData.email.toLowerCase().trim(),
      isActive: true,
    });

    await admin.save();

    const adminObject = admin.toObject();
    const { password, ...adminWithoutPassword } = adminObject;

    return adminWithoutPassword;
  }

  public async adminExists(email: string): Promise<boolean> {
    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    });

    return !!admin;
  }

  public async getAdminById(adminId: Types.ObjectId) {
    const admin = await Admin.findById(adminId).select("-password");

    if (!admin) {
      return null;
    }

    const adminObject = admin.toObject();
    const { password, ...adminWithoutPassword } = adminObject;

    return adminWithoutPassword;
  }

  public async updateLastLogin(adminId: Types.ObjectId) {
    await Admin.findByIdAndUpdate(adminId, {
      lastLogin: new Date(),
    });
  }

  public async updateAdminStatus(
    adminId: Types.ObjectId,
    isActive: boolean
  ): Promise<boolean> {
    try {
      await Admin.findByIdAndUpdate(adminId, {
        isActive,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  public async getAllAdmins() {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });

    return admins;
  }
}

export const adminService = new AdminService();











