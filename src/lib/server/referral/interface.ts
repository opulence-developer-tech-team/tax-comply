import { Types } from "mongoose";
import { ReferralStatus } from "../utils/referral-status";
import { WithdrawalStatus } from "../utils/withdrawal-status";
import { ReferralEarningStatus } from "@/lib/utils/client-enums";

/**
 * Referral relationship between referrer and referred user
 */
export interface IReferral {
  _id?: Types.ObjectId;
  referrerId: Types.ObjectId; // User who referred
  referredUserId: Types.ObjectId; // User who was referred
  referralId: string; // The referralId used (for tracking)
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Referral earning record
 */
export interface IReferralEarning {
  _id?: Types.ObjectId;
  referrerId: Types.ObjectId; // User who earns the commission
  referredUserId: Types.ObjectId; // User whose subscription generated the earning
  subscriptionId: Types.ObjectId; // The subscription that generated this earning
  paymentId: Types.ObjectId; // The payment that generated this earning
  subscriptionPlan: string; // e.g., "starter", "company"
  subscriptionAmount: number; // Original subscription amount
  commissionPercentage: number; // Commission percentage at time of earning
  commissionAmount: number; // Calculated commission
  status: ReferralEarningStatus;
  withdrawalId?: Types.ObjectId; // If withdrawn, link to withdrawal record
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Withdrawal record for referral earnings
 */
export interface IReferralWithdrawal {
  _id?: Types.ObjectId;
  userId: Types.ObjectId; // User requesting withdrawal
  amount: number; // Withdrawal amount
  bankCode: string; // Bank code
  bankName: string; // Bank name
  accountNumber: string; // Account number
  accountName: string; // Account name (verified)
  status: WithdrawalStatus;
  monnifyReference?: string; // Monnify transaction reference
  failureReason?: string; // If failed, reason for failure
  referralEarningIds: Types.ObjectId[]; // Referral earnings included in this withdrawal
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User bank details for withdrawals
 */
export interface IUserBankDetails {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string; // Verified account name
  isDefault: boolean; // Default bank for withdrawals
  createdAt?: Date;
  updatedAt?: Date;
}


