import { Types } from "mongoose";
import { SubscriptionPlan, PaymentStatus, PaymentMethod, SubscriptionStatus, BillingCycle } from "../utils/enum";

export interface ISubscription {
  _id?: Types.ObjectId;
  userId: Types.ObjectId; // Subscriptions are paid for by users, not companies
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  amount: number; 
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  nextBillingDate?: Date;
  paystackSubscriptionCode?: string; 
  paystackCustomerCode?: string;
  // Bonus days tracking for mid-cycle upgrades
  bonusDays?: number; // Days added due to mid-cycle upgrade
  previousPlan?: SubscriptionPlan; // Previous plan before upgrade
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPayment {
  _id?: Types.ObjectId;
  userId: Types.ObjectId; // User who made the payment
  companyId?: Types.ObjectId; // Optional: which company this payment was for (for tracking)
  subscriptionId?: Types.ObjectId;
  amount: number;
  currency: string; 
  paymentMethod: PaymentMethod;
  paystackReference?: string;
  paystackTransactionId?: string;
  monnifyTransactionReference?: string;
  monnifyPaymentReference?: string;
  status: PaymentStatus;
  description?: string;
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUsageLimit {
  userId: Types.ObjectId; // Usage limits are per-user, matching subscription model
  month: number;
  year: number;
  invoicesCreated: number; 
  invoicesLimit: number; 
  createdAt?: Date;
  updatedAt?: Date;
}










