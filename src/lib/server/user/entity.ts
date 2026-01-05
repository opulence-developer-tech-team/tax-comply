import mongoose, { Schema } from "mongoose";
import { IUser } from "./interface";
import { AccountType } from "../utils/enum";

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true, // This automatically creates an index
      trim: true,
      lowercase: true,
    },
    password: {
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
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      trim: true,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    emailVerificationToken: {
      type: String,
      trim: true,
      default: null,
    },
    emailVerificationTokenExpiry: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      trim: true,
      default: null,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
    },
    accountType: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      index: true,
    },
    referralId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values but enforces uniqueness for non-null values
      trim: true,
      lowercase: true,
      immutable: true, // Once set, cannot be changed
      index: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true, 
  }
);

userSchema.set("versionKey", false);
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// email index is automatically created by unique: true above
// Only add indexes for fields without unique constraint
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export default User;





