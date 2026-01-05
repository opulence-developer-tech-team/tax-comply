import mongoose, { Schema } from "mongoose";
import { IReferral, IReferralEarning, IReferralWithdrawal, IUserBankDetails } from "./interface";
import { ReferralEarningStatus, ReferralWithdrawalStatus } from "@/lib/utils/client-enums";

// Referral Schema
const referralSchema = new Schema<IReferral>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // A user can only be referred once
      index: true,
    },
    referralId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Referral Earning Schema
const referralEarningSchema = new Schema<IReferralEarning>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    subscriptionPlan: {
      type: String,
      required: true,
      trim: true,
    },
    subscriptionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ReferralEarningStatus),
      default: ReferralEarningStatus.Pending,
      index: true,
    },
    withdrawalId: {
      type: Schema.Types.ObjectId,
      ref: "ReferralWithdrawal",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Referral Withdrawal Schema
const referralWithdrawalSchema = new Schema<IReferralWithdrawal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    bankCode: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ReferralWithdrawalStatus),
      default: ReferralWithdrawalStatus.Pending,
      index: true,
    } as any,
    monnifyReference: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
      default: null,
    },
    referralEarningIds: [{
      type: Schema.Types.ObjectId,
      ref: "ReferralEarning",
    }],
  },
  {
    timestamps: true,
  }
);

// User Bank Details Schema
const userBankDetailsSchema = new Schema<IUserBankDetails>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
referralSchema.index({ referrerId: 1, createdAt: -1 });
referralEarningSchema.index({ referrerId: 1, status: 1 });
referralEarningSchema.index({ referrerId: 1, status: 1, createdAt: -1 });
// CRITICAL: Prevent duplicate earnings for same payment (idempotency)
referralEarningSchema.index({ paymentId: 1 }, { unique: true });
referralWithdrawalSchema.index({ userId: 1, status: 1, createdAt: -1 });
// CRITICAL: Enforce single bank detail per user (unique constraint on userId)
userBankDetailsSchema.index({ userId: 1 }, { unique: true });
// CRITICAL: Prevent duplicate bank accounts across all users (account number must be unique globally)
userBankDetailsSchema.index({ accountNumber: 1 }, { unique: true });

// Disable version key
referralSchema.set("versionKey", false);
referralEarningSchema.set("versionKey", false);
referralWithdrawalSchema.set("versionKey", false);
userBankDetailsSchema.set("versionKey", false);

// Export models
export const Referral = (mongoose.models.Referral as mongoose.Model<IReferral>) ||
  mongoose.model<IReferral>("Referral", referralSchema);

export const ReferralEarning = (mongoose.models.ReferralEarning as mongoose.Model<IReferralEarning>) ||
  mongoose.model<IReferralEarning>("ReferralEarning", referralEarningSchema);

export const ReferralWithdrawal = (mongoose.models.ReferralWithdrawal as mongoose.Model<IReferralWithdrawal>) ||
  mongoose.model<IReferralWithdrawal>("ReferralWithdrawal", referralWithdrawalSchema);

export const UserBankDetails = (mongoose.models.UserBankDetails as mongoose.Model<IUserBankDetails>) ||
  mongoose.model<IUserBankDetails>("UserBankDetails", userBankDetailsSchema);


