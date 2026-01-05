import mongoose, { Schema } from "mongoose";
import { IBusiness } from "./interface";
import { TaxClassification, ComplianceStatus } from "../utils/enum";

const businessSchema = new Schema<IBusiness>(
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
    businessRegistrationNumber: {
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
    isRegistered: {
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
    businessType: {
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
      required: false,
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
    strict: true,
  }
);

businessSchema.set("versionKey", false);
businessSchema.set("toJSON", { virtuals: true });
businessSchema.set("toObject", { virtuals: true });

businessSchema.index({ ownerId: 1 });
businessSchema.index({ tin: 1 });
businessSchema.index({ businessRegistrationNumber: 1 });
businessSchema.index({ vatRegistrationNumber: 1 });

const Business =
  (mongoose.models.Business as mongoose.Model<IBusiness>) ||
  mongoose.model<IBusiness>("Business", businessSchema);

export default Business;



