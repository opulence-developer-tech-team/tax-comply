import mongoose, { Schema } from "mongoose";
import { ICompany } from "./interface";
import { TaxClassification, ComplianceStatus } from "../utils/enum";

const companySchema = new Schema<ICompany>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    cacNumber: {
      type: String,
      trim: true,
      default: "",
    },
    tin: {
      type: String,
      trim: true,
      default: "",
    },
    vatRegistrationNumber: {
      type: String,
      trim: true,
      default: "",
    },
    isCACRegistered: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      default: "Nigeria",
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    companyType: {
      type: String,
      trim: true,
      default: "",
    },
    fixedAssets: {
      type: Number,
      default: 0,
    },
    taxClassification: {
      type: String,
      enum: Object.values(TaxClassification),
      default: TaxClassification.SmallCompany,
    },
    complianceStatus: {
      type: String,
      enum: Object.values(ComplianceStatus),
      default: ComplianceStatus.AtRisk,
    },
    lastComplianceCheck: {
      type: Date,
      default: null,
    },
    // Privacy consent tracking for legal compliance
    privacyConsentGiven: {
      type: Boolean,
      default: false,
      required: false, // Explicitly mark as not required to allow null/undefined
    },
    privacyConsentDate: {
      type: Date,
      default: null,
      required: false,
    },
    privacyPolicyVersion: {
      type: String,
      trim: true,
      default: null,
      required: false,
    },
  },
  {
    timestamps: true,
    strict: true, // Ensure strict mode is enabled (default, but explicit)
  }
);

companySchema.set("versionKey", false);
companySchema.set("toJSON", { virtuals: true });
companySchema.set("toObject", { virtuals: true });

companySchema.index({ ownerId: 1 });
companySchema.index({ tin: 1 });
companySchema.index({ cacNumber: 1 });
companySchema.index({ vatRegistrationNumber: 1 });

const Company =
  (mongoose.models.Company as mongoose.Model<ICompany>) ||
  mongoose.model<ICompany>("Company", companySchema);

export default Company;


