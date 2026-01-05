import mongoose, { Schema } from "mongoose";
import { IPayroll, IPayrollSchedule, IPAYERemittance } from "./interface";
import { PayrollStatus } from "../utils/payroll-status";
import { RemittanceStatus } from "../utils/enum";

/**
 * Payroll Schema - Individual employee payroll record
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
const payrollSchema = new Schema<IPayroll>(
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
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    payrollMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    payrollYear: {
      type: Number,
      required: true,
      min: 2026, // CRITICAL: This app only supports 2026+ tax laws per Nigeria Tax Act 2025
    },
    grossSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    employeePensionContribution: {
      type: Number,
      default: 0,
      min: 0,
    },
    employerPensionContribution: {
      type: Number,
      default: 0,
      min: 0,
    },
    nhfContribution: {
      type: Number,
      default: 0,
      min: 0,
    },
    nhisContribution: {
      type: Number,
      default: 0,
      min: 0,
    },
    cra: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxableIncome: {
      type: Number,
      required: true,
      min: 0,
    },
    paye: {
      type: Number,
      required: true,
      min: 0,
    },
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(PayrollStatus),
      default: PayrollStatus.Draft,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * PayrollSchedule Schema - Only stores workflow status
 * CRITICAL: Totals are calculated on-the-fly from Payroll records
 * This eliminates data duplication while preserving workflow state
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
const payrollScheduleSchema = new Schema<IPayrollSchedule>(
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
      min: 2026, // CRITICAL: This app only supports 2026+ tax laws per Nigeria Tax Act 2025
    },
    status: {
      type: String,
      enum: Object.values(PayrollStatus),
      default: PayrollStatus.Draft,
    },
    // totalITF is calculated on-the-fly, not stored
    // CRITICAL: Total fields removed - calculated on-the-fly from Payroll records
    // This eliminates data duplication (similar to VAT refactoring)
  },
  {
    timestamps: true,
  }
);

// CRITICAL: Validation - at least one of companyId or businessId must be provided
payrollScheduleSchema.pre("save", async function() {
  if (!this.companyId && !this.businessId) {
    throw new Error("Either companyId or businessId must be provided for PayrollSchedule");
  }
  if (this.companyId && this.businessId) {
    throw new Error("PayrollSchedule cannot have both companyId and businessId");
  }
});

payrollSchema.set("versionKey", false);
payrollSchema.set("toJSON", { virtuals: true });
payrollSchema.set("toObject", { virtuals: true });

payrollScheduleSchema.set("versionKey", false);
payrollScheduleSchema.set("toJSON", { virtuals: true });
payrollScheduleSchema.set("toObject", { virtuals: true });

// CRITICAL: Validation - at least one of companyId or businessId must be provided
payrollSchema.pre("save", async function() {
  if (!this.companyId && !this.businessId) {
    throw new Error("Either companyId or businessId must be provided for Payroll");
  }
  if (this.companyId && this.businessId) {
    throw new Error("Payroll cannot have both companyId and businessId");
  }
});

// Compound unique index: one payroll per employee per entity per month/year
payrollSchema.index({ companyId: 1, employeeId: 1, payrollMonth: 1, payrollYear: 1 }, { unique: true, partialFilterExpression: { companyId: { $exists: true } } });
payrollSchema.index({ businessId: 1, employeeId: 1, payrollMonth: 1, payrollYear: 1 }, { unique: true, partialFilterExpression: { businessId: { $exists: true } } });
payrollSchema.index({ companyId: 1, payrollMonth: 1, payrollYear: 1 }, { partialFilterExpression: { companyId: { $exists: true } } });
payrollSchema.index({ businessId: 1, payrollMonth: 1, payrollYear: 1 }, { partialFilterExpression: { businessId: { $exists: true } } });
payrollSchema.index({ employeeId: 1 });

// Compound unique index: one schedule per entity per month/year
payrollScheduleSchema.index({ companyId: 1, month: 1, year: 1 }, { unique: true, partialFilterExpression: { companyId: { $exists: true } } });
payrollScheduleSchema.index({ businessId: 1, month: 1, year: 1 }, { unique: true, partialFilterExpression: { businessId: { $exists: true } } });
payrollScheduleSchema.index({ companyId: 1, year: -1 }, { partialFilterExpression: { companyId: { $exists: true } } });
payrollScheduleSchema.index({ businessId: 1, year: -1 }, { partialFilterExpression: { businessId: { $exists: true } } });

/**
 * PAYE Remittance Schema
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
const payeRemittanceSchema = new Schema<IPAYERemittance>(
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
    remittanceMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    remittanceYear: {
      type: Number,
      required: true,
      min: 2000,
    },
    totalPAYE: {
      type: Number,
      required: true,
      min: 0,
    },
    remittanceDate: {
      type: Date,
      default: null,
    },
    remittanceDeadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RemittanceStatus),
      default: RemittanceStatus.Pending,
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

payeRemittanceSchema.set("versionKey", false);
payeRemittanceSchema.set("toJSON", { virtuals: true });
payeRemittanceSchema.set("toObject", { virtuals: true });

// Compound unique index: one PAYE remittance per entity per month/year
payeRemittanceSchema.index({ companyId: 1, remittanceMonth: 1, remittanceYear: 1 }, { unique: true, partialFilterExpression: { companyId: { $exists: true } } });
payeRemittanceSchema.index({ businessId: 1, remittanceMonth: 1, remittanceYear: 1 }, { unique: true, partialFilterExpression: { businessId: { $exists: true } } });
payeRemittanceSchema.index({ companyId: 1, status: 1 }, { partialFilterExpression: { companyId: { $exists: true } } });
payeRemittanceSchema.index({ businessId: 1, status: 1 }, { partialFilterExpression: { businessId: { $exists: true } } });
payeRemittanceSchema.index({ remittanceDeadline: 1 });

const Payroll =
  (mongoose.models.Payroll as mongoose.Model<IPayroll>) ||
  mongoose.model<IPayroll>("Payroll", payrollSchema);

const PayrollSchedule =
  (mongoose.models.PayrollSchedule as mongoose.Model<IPayrollSchedule>) ||
  mongoose.model<IPayrollSchedule>("PayrollSchedule", payrollScheduleSchema);

const PAYERemittance =
  (mongoose.models.PAYERemittance as mongoose.Model<IPAYERemittance>) ||
  mongoose.model<IPAYERemittance>("PAYERemittance", payeRemittanceSchema);

export { Payroll, PayrollSchedule, PAYERemittance };









