import mongoose, { Schema } from "mongoose";
import { IVATSummary, IVATRemittance } from "./interface";
import { RemittanceStatus } from "../utils/enum";
import { VATStatus } from "../utils/vat-status";

/**
 * VATSummary Schema - Calculated on-the-fly from invoices and expenses, cached for performance
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
const vatSummarySchema = new Schema<IVATSummary>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: false, // Optional - used for Company accounts
      index: true,
      default: null,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: false, // Optional - used for Business accounts
      index: true,
      default: null,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2026, // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    },
    inputVAT: {
      type: Number,
      default: 0,
      min: 0,
    },
    outputVAT: {
      type: Number,
      default: 0,
      min: 0,
    },
    netVAT: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(VATStatus),
      default: VATStatus.Zero,
    },
    // CRITICAL: Compliance Fields for 2026 Turnover Threshold (₦25M)
    annualTurnover: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVATExempt: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL: Validation - at least one of companyId or businessId must be provided
vatSummarySchema.pre("save", async function(this: IVATSummary & mongoose.Document) {
  if (!this.companyId && !this.businessId) {
    throw new Error("Either companyId or businessId must be provided for VAT summary");
  }
  if (this.companyId && this.businessId) {
    throw new Error("VAT summary cannot have both companyId and businessId");
  }
});

vatSummarySchema.set("versionKey", false);
vatSummarySchema.set("toJSON", { virtuals: true });
vatSummarySchema.set("toObject", { virtuals: true });

// Compound unique index: one summary per entity per month/year
vatSummarySchema.index({ companyId: 1, month: 1, year: 1 }, { unique: true, partialFilterExpression: { companyId: { $type: "objectId" } } });
vatSummarySchema.index({ businessId: 1, month: 1, year: 1 }, { unique: true, partialFilterExpression: { businessId: { $type: "objectId" } } });
vatSummarySchema.index({ companyId: 1, year: -1 }, { partialFilterExpression: { companyId: { $type: "objectId" } } });
vatSummarySchema.index({ businessId: 1, year: -1 }, { partialFilterExpression: { businessId: { $type: "objectId" } } });

const VATSummary =
  (mongoose.models.VATSummary as mongoose.Model<IVATSummary>) ||
  mongoose.model<IVATSummary>("VATSummary", vatSummarySchema);

/**
 * VAT Remittance Schema
 * Stores user-entered VAT remittance records for companies and businesses.
 * These are actual payments made to NRS for VAT liability.
 * 
 * CRITICAL: VAT remittances are monthly/quarterly, not annual like CIT.
 * Multiple remittances per year are allowed (one per month/quarter).
 * 
 * CRITICAL: Supports both Company and Business accounts.
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
const vatRemittanceSchema = new Schema<IVATRemittance>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: false, // Optional - used for Company accounts
      index: true,
      default: null,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: false, // Optional - used for Business accounts
      index: true,
      default: null,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },
    year: {
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

// CRITICAL: Validation - at least one of companyId or businessId must be provided
vatRemittanceSchema.pre("save", async function(this: IVATRemittance & mongoose.Document) {
  if (!this.companyId && !this.businessId) {
    throw new Error("Either companyId or businessId must be provided for VAT remittance");
  }
  if (this.companyId && this.businessId) {
    throw new Error("VAT remittance cannot have both companyId and businessId");
  }
});

// Compound index: one remittance record per entity per month/year per reference
// Note: Multiple remittances for the same month/year are allowed (user can make multiple payments)
vatRemittanceSchema.index({ companyId: 1, month: 1, year: 1, remittanceReference: 1 }, { 
  unique: true,
  partialFilterExpression: { companyId: { $exists: true } }
});
vatRemittanceSchema.index({ businessId: 1, month: 1, year: 1, remittanceReference: 1 }, { 
  unique: true,
  partialFilterExpression: { businessId: { $exists: true } }
});

// Index for querying all remittances for an entity/month/year
vatRemittanceSchema.index({ companyId: 1, month: 1, year: 1 });
vatRemittanceSchema.index({ businessId: 1, month: 1, year: 1 });

vatRemittanceSchema.set("versionKey", false);
vatRemittanceSchema.set("toJSON", { virtuals: true });
vatRemittanceSchema.set("toObject", { virtuals: true });

const VATRemittance =
  (mongoose.models.VATRemittance as mongoose.Model<IVATRemittance>) ||
  mongoose.model<IVATRemittance>("VATRemittance", vatRemittanceSchema);

export { VATSummary, VATRemittance };












