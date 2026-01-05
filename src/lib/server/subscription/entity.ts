import mongoose, { Schema } from "mongoose";
import { ISubscription, IPayment, IUsageLimit } from "./interface";
import { SubscriptionPlan, PaymentStatus, PaymentMethod, SubscriptionStatus, BillingCycle } from "../utils/enum";

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One subscription per user
    },
    plan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      required: true,
    },
    billingCycle: {
      type: String,
      enum: Object.values(BillingCycle),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.Trial,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    nextBillingDate: {
      type: Date,
      default: null,
    },
    paystackSubscriptionCode: {
      type: String,
      trim: true,
      default: "",
    },
    paystackCustomerCode: {
      type: String,
      trim: true,
      default: "",
    },
    // Bonus days tracking for mid-cycle upgrades
    bonusDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    previousPlan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null, // Optional: for tracking which company the payment was for
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "NGN",
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    paystackReference: {
      type: String,
      trim: true,
      default: "",
    },
    paystackTransactionId: {
      type: String,
      trim: true,
      default: "",
    },
    monnifyTransactionReference: {
      type: String,
      trim: true,
      default: "",
    },
    monnifyPaymentReference: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.Pending,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const usageLimitSchema = new Schema<IUsageLimit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      min: 2000,
    },
    invoicesCreated: {
      type: Number,
      default: 0,
      min: 0,
    },
    invoicesLimit: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.set("versionKey", false);
subscriptionSchema.set("toJSON", { virtuals: true });
subscriptionSchema.set("toObject", { virtuals: true });

paymentSchema.set("versionKey", false);
paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

usageLimitSchema.set("versionKey", false);
usageLimitSchema.set("toJSON", { virtuals: true });
usageLimitSchema.set("toObject", { virtuals: true });

// Indexes
// Note: userId already has index: true and unique: true in field definition, so no need for explicit index here
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ companyId: 1, createdAt: -1 }); // For company-specific queries
paymentSchema.index({ paystackReference: 1 });
paymentSchema.index({ monnifyTransactionReference: 1 });
paymentSchema.index({ monnifyPaymentReference: 1 });
paymentSchema.index({ status: 1 });

// Unique index: one usage limit record per user per month/year
usageLimitSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });
// Index for querying user's usage history
usageLimitSchema.index({ userId: 1, year: -1 });

const Subscription =
  (mongoose.models.Subscription as mongoose.Model<ISubscription>) ||
  mongoose.model<ISubscription>("Subscription", subscriptionSchema);

const Payment =
  (mongoose.models.Payment as mongoose.Model<IPayment>) ||
  mongoose.model<IPayment>("Payment", paymentSchema);

const UsageLimit =
  (mongoose.models.UsageLimit as mongoose.Model<IUsageLimit>) ||
  mongoose.model<IUsageLimit>("UsageLimit", usageLimitSchema);

export { Subscription, Payment, UsageLimit };





