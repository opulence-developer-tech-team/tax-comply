import { Types } from "mongoose";
import { InvoiceStatus } from "../utils/enum";
import { WHTType } from "../tax/calculator";

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category?: string;
}

export interface IInvoice {
  _id?: Types.ObjectId;
  companyId?: Types.ObjectId;
  businessId?: Types.ObjectId;
  invoiceNumber: string; 
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTIN?: string; 
  issueDate: Date;
  dueDate?: Date;
  items: IInvoiceItem[];
  subtotal: number; 
  vatRate: number; 
  vatAmount: number; 
  total: number; 
  vatCategory?: string;
  // CRITICAL: VAT exemption flag - if true, invoice is for VAT-exempt goods/services
  // For VAT-registered businesses (≥ ₦25M), this should only be true for exempt categories
  // For small businesses (< ₦25M), this can be true/false (they're not required to charge VAT)
  isVATExempted?: boolean;
  // WHT (Withholding Tax) fields - for tracking WHT deducted from invoice payments
  whtType?: WHTType; // Type of payment (determines WHT rate)
  whtRate?: number; // WHT rate applied (percentage)
  whtAmount?: number; // WHT amount deducted (if applicable)
  netAmountAfterWHT?: number; // Net amount after WHT deduction
  status: InvoiceStatus;
  notes?: string;
  pdfUrl?: string; 
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateInvoice {
  companyId: Types.ObjectId;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTIN?: string;
  issueDate: Date;
  dueDate?: Date;
  items: IInvoiceItem[];
  vatCategory?: string;
  // CRITICAL: VAT exemption flag - if true, invoice is for VAT-exempt goods/services
  // For VAT-registered businesses (≥ ₦25M), this should only be true for exempt categories
  // For small businesses (< ₦25M), this can be true/false (they're not required to charge VAT)
  isVATExempted?: boolean;
  // WHT (Withholding Tax) fields - optional
  whtType?: WHTType;
  status?: InvoiceStatus; // Optional - defaults to Pending in entity
  notes?: string;
}

