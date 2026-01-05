import mongoose, { Schema } from "mongoose";
import { IInvoice } from "./interface";
import { InvoiceStatus } from "../utils/enum";
import { NRS_VAT_RATE } from "../../constants/nrs-constants";

const invoiceItemSchema = new Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },
    customerAddress: {
      type: String,
      trim: true,
      default: "",
    },
    customerTIN: {
      type: String,
      trim: true,
      default: "",
    },
    issueDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: {
        validator: (items: any[]) => items.length > 0,
        message: "Invoice must have at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    vatRate: {
      type: Number,
      default: NRS_VAT_RATE, 
      min: 0,
      max: 100,
    },
    vatAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    vatCategory: {
      type: String,
      trim: true,
      default: "",
    },
    // CRITICAL: VAT exemption flag - if true, invoice is for VAT-exempt goods/services
    // For VAT-registered businesses (≥ ₦25M), this should only be true for exempt categories
    // For small businesses (< ₦25M), this can be true/false (they're not required to charge VAT)
    isVATExempted: {
      type: Boolean,
      default: false,
    },
    // WHT (Withholding Tax) fields - for tracking WHT deducted from invoice payments
    whtType: {
      type: String,
      trim: true,
      default: "",
    },
    whtRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    whtAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmountAfterWHT: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.Pending,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.set("versionKey", false);
invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ companyId: 1, issueDate: -1 });
invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ customerEmail: 1 });

const Invoice =
  (mongoose.models.Invoice as mongoose.Model<IInvoice>) ||
  mongoose.model<IInvoice>("Invoice", invoiceSchema);

export default Invoice;

