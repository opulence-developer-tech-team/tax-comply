import mongoose, { Schema } from "mongoose";
import { IEmployee } from "./interface";

/**
 * Employee Schema - Individual employee record
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
const employeeSchema = new Schema<IEmployee>(
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
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: false,
    },
    phoneNumber: {
      type: String,
      trim: true,
      required: false,
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    dateOfEmployment: {
      type: Date,
      required: true,
    },
    salary: {
      type: Number,
      required: true,
      min: 0,
    },
    taxIdentificationNumber: {
      type: String,
      trim: true,
      required: false,
    },
    bankCode: {
      type: String,
      trim: true,
      required: false,
      index: true,
    },
    bankName: {
      type: String,
      trim: true,
      required: false,
    },
    accountNumber: {
      type: String,
      trim: true,
      required: false,
    },
    accountName: {
      type: String,
      trim: true,
      required: false,
    },
    isActive: {
      type: Boolean,
      required: true,
    },
    // CRITICAL: Benefit flags - indicates if company provides these statutory benefits for this employee
    // Must be explicitly provided - no defaults
    hasPension: {
      type: Boolean,
      required: true,
    },
    hasNHF: {
      type: Boolean,
      required: true,
    },
    hasNHIS: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL: Validation - at least one of companyId or businessId must be provided
employeeSchema.pre("save", async function() {
  if (!this.companyId && !this.businessId) {
    throw new Error("Either companyId or businessId must be provided for Employee");
  }
  if (this.companyId && this.businessId) {
    throw new Error("Employee cannot have both companyId and businessId");
  }
});

employeeSchema.set("versionKey", false);
employeeSchema.set("toJSON", { virtuals: true });
employeeSchema.set("toObject", { virtuals: true });

// Compound unique index: one employee per entity per employeeId
employeeSchema.index({ companyId: 1, employeeId: 1 }, { unique: true, partialFilterExpression: { companyId: { $exists: true } } });
employeeSchema.index({ businessId: 1, employeeId: 1 }, { unique: true, partialFilterExpression: { businessId: { $exists: true } } });
employeeSchema.index({ companyId: 1, isActive: 1 }, { partialFilterExpression: { companyId: { $exists: true } } });
employeeSchema.index({ businessId: 1, isActive: 1 }, { partialFilterExpression: { businessId: { $exists: true } } });
employeeSchema.index({ email: 1 });

const Employee =
  (mongoose.models.Employee as mongoose.Model<IEmployee>) ||
  mongoose.model<IEmployee>("Employee", employeeSchema);

export default Employee;









