import mongoose, { Schema } from "mongoose";
import { ICITRemittance } from "./remittance-interface";
import { RemittanceStatus } from "../utils/enum";

/**
 * CIT Remittance Schema
 * Stores user-entered CIT remittance records for companies.
 * These are actual payments made by the company to NRS for CIT liability.
 * 
 * CRITICAL: This collection stores ONLY user-entered data (remittances).
 * All calculated CIT values (revenue, expenses, taxable profit, CIT liability) are computed on-the-fly.
 */
const citRemittanceSchema = new Schema<ICITRemittance>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    taxYear: {
      type: Number,
      required: true,
      min: 2026, // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      index: true,
    },
    
    // Remittance Details
    remittanceAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    remittanceDate: {
      type: Date,
      required: true,
    },
    remittanceReference: {
      type: String,
      required: true,
      trim: true,
    },
    remittanceReceipt: {
      type: String,
      required: false,
      trim: true,
    },
    
    // Status
    // CRITICAL: Default is RemittanceStatus.Remitted for user-entered records
    // This is because if a user is manually entering a remittance, they have already made the payment.
    // However, the service layer explicitly sets this to Remitted, so this default should never be used.
    status: {
      type: String,
      enum: Object.values(RemittanceStatus),
      required: true,
      default: RemittanceStatus.Remitted,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: one remittance record per company per tax year per reference
// Note: Multiple remittances for the same tax year are allowed (user can make multiple payments)
citRemittanceSchema.index({ companyId: 1, taxYear: 1, remittanceReference: 1 }, { unique: true });

// Index for querying all remittances for a company/tax year
citRemittanceSchema.index({ companyId: 1, taxYear: 1 });

const CITRemittance =
  (mongoose.models.CITRemittance as mongoose.Model<ICITRemittance>) ||
  mongoose.model<ICITRemittance>("CITRemittance", citRemittanceSchema);

export { CITRemittance };

