import mongoose, { Schema } from "mongoose";
import { IIncome } from "./interface";

const incomeSchema = new Schema<IIncome>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["individual", "company"],
      required: true,
      index: true,
    },
    taxYear: {
      type: Number,
      required: true,
      min: 2026, // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      index: true,
    },
    month: {
      type: Number,
      required: false,
      min: 1,
      max: 12,
      index: true,
      default: null, // null represents yearly/annual income
    },
    annualIncome: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one income record per account per tax year per month
// month: null represents yearly income, month: 1-12 represents monthly income
incomeSchema.index({ accountId: 1, entityType: 1, taxYear: 1, month: 1 }, { unique: true });

incomeSchema.set("versionKey", false);
incomeSchema.set("toJSON", { virtuals: true });

const Income =
  (mongoose.models.Income as mongoose.Model<IIncome>) ||
  mongoose.model<IIncome>("Income", incomeSchema);

export default Income;

