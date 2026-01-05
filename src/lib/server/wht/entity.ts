import mongoose, { Schema } from "mongoose";
import { IWHTRecord, IWHTRemittance, IWHTCredit, IWHTSummary } from "./interface";
import { RemittanceStatus, WHTCreditStatus, AccountType, TransactionType } from "../utils/enum";
import { WHTType } from "../tax/calculator";

/**
 * WHT Record Schema
 * Stores individual WHT deductions from payments
 */
const whtRecordSchema = new Schema<IWHTRecord>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    payeeName: {
      type: String,
      required: true,
      trim: true,
    },
    payeeTIN: {
      type: String,
      trim: true,
      default: "",
    },
    paymentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    whtType: {
      type: String,
      required: true,
    },
    whtRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    whtAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      required: true,
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
    description: {
      type: String,
      required: true,
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

/**
 * WHT Remittance Schema
 * Tracks WHT remittances to NRS (Nigeria Revenue Service)
 */
const whtRemittanceSchema = new Schema<IWHTRemittance>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    remittanceMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    remittanceYear: {
      type: Number,
      required: true,
      min: 2026, // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    },
    totalWHTAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    remittanceDeadline: {
      type: Date,
      required: true,
    },
    remittanceDate: {
      type: Date,
      default: null,
    },
    remittanceReference: {
      type: String,
      trim: true,
      default: "",
    },
    remittanceReceipt: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(RemittanceStatus),
      required: true,
      default: RemittanceStatus.Pending,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * WHT Credit Schema
 * Tracks WHT credits for payees (used to offset PIT or CIT)
 */
const whtCreditSchema = new Schema<IWHTCredit>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
    },
    whtRecordId: {
      type: Schema.Types.ObjectId,
      ref: "WHTRecord",
      required: true,
      unique: true, // One credit per WHT record
      index: true,
    },
    whtAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    taxYear: {
      type: Number,
      required: true,
      min: 2026, // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      index: true,
    },
    appliedToPIT: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    appliedToCIT: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    remainingCredit: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(WHTCreditStatus),
      required: true,
      default: WHTCreditStatus.Available,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * WHT Summary Schema
 * Aggregated WHT data per month/year for companies
 */
const whtSummarySchema = new Schema<IWHTSummary>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 0, // 0 = yearly summary, 1-12 = monthly
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2026, // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    },
    totalWHTDeducted: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalWHTRemitted: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalWHTPending: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    whtRecordsCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(RemittanceStatus),
      required: true,
      default: RemittanceStatus.Pending,
    },
  },
  {
    timestamps: true,
  }
);

// Set schema options
whtRecordSchema.set("versionKey", false);
whtRecordSchema.set("toJSON", { virtuals: true });
whtRecordSchema.set("toObject", { virtuals: true });

whtRemittanceSchema.set("versionKey", false);
whtRemittanceSchema.set("toJSON", { virtuals: true });
whtRemittanceSchema.set("toObject", { virtuals: true });

whtCreditSchema.set("versionKey", false);
whtCreditSchema.set("toJSON", { virtuals: true });
whtCreditSchema.set("toObject", { virtuals: true });

whtSummarySchema.set("versionKey", false);
whtSummarySchema.set("toJSON", { virtuals: true });
whtSummarySchema.set("toObject", { virtuals: true });

// Create indexes
// WHT Record indexes
whtRecordSchema.index({ companyId: 1, year: -1, month: -1 });
whtRecordSchema.index({ companyId: 1, transactionId: 1, transactionType: 1 }, { unique: true }); // Prevent duplicate WHT records for same transaction
whtRecordSchema.index({ accountId: 1, year: -1 });
whtRecordSchema.index({ paymentDate: -1 });

// WHT Remittance indexes
whtRemittanceSchema.index({ companyId: 1, remittanceMonth: 1, remittanceYear: 1 }, { unique: true });
whtRemittanceSchema.index({ companyId: 1, remittanceYear: -1 });

// WHT Credit indexes
whtCreditSchema.index({ accountId: 1, taxYear: 1 });
whtCreditSchema.index({ accountId: 1, status: 1 });

// WHT Summary indexes
whtSummarySchema.index({ companyId: 1, month: 1, year: 1 }, { unique: true });
whtSummarySchema.index({ companyId: 1, year: -1 });

// Create models
const WHTRecord =
  (mongoose.models.WHTRecord as mongoose.Model<IWHTRecord>) ||
  mongoose.model<IWHTRecord>("WHTRecord", whtRecordSchema);

const WHTRemittance =
  (mongoose.models.WHTRemittance as mongoose.Model<IWHTRemittance>) ||
  mongoose.model<IWHTRemittance>("WHTRemittance", whtRemittanceSchema);

const WHTCredit =
  (mongoose.models.WHTCredit as mongoose.Model<IWHTCredit>) ||
  mongoose.model<IWHTCredit>("WHTCredit", whtCreditSchema);

const WHTSummary =
  (mongoose.models.WHTSummary as mongoose.Model<IWHTSummary>) ||
  mongoose.model<IWHTSummary>("WHTSummary", whtSummarySchema);

export { WHTRecord, WHTRemittance, WHTCredit, WHTSummary };



