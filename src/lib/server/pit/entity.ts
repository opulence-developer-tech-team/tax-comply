import mongoose, { Schema } from "mongoose";
import { IPITSummary, IPITRemittance, IPITEmploymentDeductions } from "./interface";

// PIT Summary Schema REMOVED - Refactored to On-The-Fly calculation
// const pitSummarySchema = ...

/**
 * PIT Remittance Schema
 * Tracks PIT remittances to NRS
 */
const pitRemittanceSchema = new Schema<any>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    taxYear: {
      type: Number,
      required: true,
      min: 2026, // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      index: true,
    },
    remittanceDate: {
      type: Date,
      required: true,
    },
    remittanceAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    remittanceReference: {
      type: String,
      required: true,
      trim: true,
    },
    receiptUrl: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "remitted", "verified"],
      required: true,
      default: "remitted",
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying remittances by account and tax year
pitRemittanceSchema.index({ accountId: 1, taxYear: 1 });

/**
 * PIT Employment Deductions Schema
 * Stores user-provided statutory deductions per tax year
 */
const pitEmploymentDeductionsSchema = new Schema<any>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    taxYear: {
      type: Number,
      required: true,
      min: 2026, // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      index: true,
    },
    annualPension: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    annualNHF: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    annualNHIS: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // New Allowable Deductions (2026+)
    annualHousingLoanInterest: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    annualLifeInsurance: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    annualRent: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    annualRentRelief: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    source: {
      type: String,
      enum: ["payslip", "employer_statement", "manual", "other"],
      required: true,
      default: "manual",
    },
    sourceOther: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: one employment deductions record per account per tax year
pitEmploymentDeductionsSchema.index({ accountId: 1, taxYear: 1 }, { unique: true });


pitRemittanceSchema.set("versionKey", false);
pitEmploymentDeductionsSchema.set("versionKey", false);
pitRemittanceSchema.set("toJSON", { virtuals: true });
pitEmploymentDeductionsSchema.set("toJSON", { virtuals: true });

// export const PITSummary = mongoose.models.PITSummary || mongoose.model<any>("PITSummary", pitSummarySchema);
export const PITSummary = null; // Deprecated/Removed
export const PITRemittance = mongoose.models.PITRemittance || mongoose.model<any>("PITRemittance", pitRemittanceSchema);
export const PITEmploymentDeductions = mongoose.models.PITEmploymentDeductions || mongoose.model<any>("PITEmploymentDeductions", pitEmploymentDeductionsSchema);
