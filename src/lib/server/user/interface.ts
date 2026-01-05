import { Types } from "mongoose";
import { UserRole, AccountType } from "../utils/enum";

export interface IUser {
  _id?: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isEmailVerified: boolean;
  accountType: AccountType;
  role?: UserRole; // Admin role for admin users
  referralId?: string; // Unique referral ID derived from email prefix
  referredBy?: Types.ObjectId; // User who referred this user
  otp?: string | null;
  otpExpiry?: Date | null;
  emailVerificationToken?: string | null;
  emailVerificationTokenExpiry?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpiry?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserSignUp {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  accountType: AccountType;
  referralId?: string; // Optional referral ID from referrer
}

export interface IUserSignIn {
  email: string;
  password: string;
}










