import mongoose, { Schema } from "mongoose";

export interface IBank {
  _id?: mongoose.Types.ObjectId;
  code: string; // Bank code (e.g., "058" for GTBank)
  nipBankCode?: string; // NIP bank code (alternative code)
  name: string; // Bank name (e.g., "GTBank")
  isActive: boolean; // Whether bank is currently active/available
  createdAt?: Date;
  updatedAt?: Date;
}

const bankSchema = new Schema<IBank>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    nipBankCode: {
      type: String,
      trim: true,
      sparse: true, // Allows multiple nulls but enforces uniqueness for non-null values
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster lookups
bankSchema.index({ code: 1, isActive: 1 });
bankSchema.index({ nipBankCode: 1, isActive: 1 });

bankSchema.set("versionKey", false);
bankSchema.set("toJSON", { virtuals: true });

const Bank =
  (mongoose.models.Bank as mongoose.Model<IBank>) ||
  mongoose.model<IBank>("Bank", bankSchema);

export default Bank;













