import mongoose, { Schema } from "mongoose";
import { IExpense } from "./interface";
import { AccountType } from "../utils/enum";

const expenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    accountType: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
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
    isTaxDeductible: {
      type: Boolean,
      default: true,
    },
    vatAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // WHT (Withholding Tax) fields - for tracking WHT deducted from expense payments
    whtType: {
      type: String,
      trim: true,
      default: "",
    },
    whtAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    whtDeducted: {
      type: Boolean,
      default: false,
    },
    // Supplier/Vendor information (REQUIRED for WHT compliance per NRS (Nigeria Revenue Service))
    supplierName: {
      type: String,
      trim: true,
      default: "",
    },
    supplierTIN: {
      type: String,
      trim: true,
      default: "",
    },
    supplierType: {
      type: String,
      enum: Object.values(AccountType),
      default: null,
    },
    isNonResident: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.set("versionKey", false);
expenseSchema.set("toJSON", { virtuals: true });
expenseSchema.set("toObject", { virtuals: true });

expenseSchema.index({ userId: 1, accountId: 1 });
expenseSchema.index({ userId: 1, month: 1, year: 1 });
expenseSchema.index({ accountId: 1, date: -1 });

const Expense =
  (mongoose.models.Expense as mongoose.Model<IExpense>) ||
  mongoose.model<IExpense>("Expense", expenseSchema);

export default Expense;











