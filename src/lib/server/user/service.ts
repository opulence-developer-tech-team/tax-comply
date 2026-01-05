import { Types } from "mongoose";
import User from "./entity";
import { IUserSignUp } from "./interface";
import { referralService } from "../referral/service";

class UserService {
  public async findUserByEmail(email: string) {
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    return user;
  }

  public async createUser(userData: IUserSignUp) {
    // Generate referralId from email prefix
    const baseReferralId = referralService.generateReferralId(userData.email);
    const uniqueReferralId = await referralService.ensureUniqueReferralId(baseReferralId);

    // Handle referral relationship if referralId is provided
    let referredBy: Types.ObjectId | undefined = undefined;
    if (userData.referralId) {
      const referrer = await referralService.findUserByReferralId(userData.referralId);
      if (referrer) {
        referredBy = referrer._id as Types.ObjectId;
      }
      // Note: We'll create the Referral record after user is created
    }

    const user = new User({
      ...userData,
      email: userData.email.toLowerCase().trim(),
      referralId: uniqueReferralId,
      referredBy,
      isEmailVerified: false,
      otp: null,
      otpExpiry: null,
    });

    await user.save();

    // Create referral relationship if applicable
    if (referredBy && user._id) {
      try {
        await referralService.createReferral(
          referredBy,
          user._id as Types.ObjectId,
          userData.referralId!
        );
      } catch (error) {
        // Log error but don't fail user creation
        console.error("Error creating referral relationship:", error);
      }
    }

    const userObject = user.toObject();
    const { password, ...userWithoutPassword } = userObject;

    return userWithoutPassword;
  }

  public async userExists(email: string): Promise<boolean> {
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    return !!user;
  }

  public async getUserById(userId: Types.ObjectId) {
    const user = await User.findById(userId).select("-password -otp -otpExpiry");
    
    if (!user) {
      return null;
    }

    const userObject = user.toObject();
    const { password, otp, otpExpiry, ...userWithoutSensitiveData } = userObject;

    return userWithoutSensitiveData;
  }

  public async findUserWithPasswordById(userId: Types.ObjectId) {
    const user = await User.findById(userId);
    return user;
  }

  public async updatePassword(userId: Types.ObjectId, newPasswordHash: string) {
    await User.findByIdAndUpdate(userId, {
      password: newPasswordHash,
      updatedAt: new Date(), // Ensure updatedAt is updated
    });
  }
}

export const userService = new UserService();





