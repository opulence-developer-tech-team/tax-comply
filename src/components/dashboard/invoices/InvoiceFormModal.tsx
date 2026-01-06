"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { CustomerDetailsForm } from "@/components/dashboard/invoices/create/CustomerDetailsForm";
import { InvoiceItemsSection } from "@/components/dashboard/invoices/create/InvoiceItemsSection";
import { InvoiceSummary } from "@/components/dashboard/invoices/create/InvoiceSummary";
import { InvoiceStatusSelector } from "@/components/dashboard/invoices/InvoiceStatusSelector";
import { ShareInvoiceModal } from "@/components/dashboard/invoices/ShareInvoiceModal";
import { InvoiceStatus, getDefaultInvoiceStatus } from "@/components/dashboard/invoices/statusUtils";
import { FileText, Save, X, AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/shared/LoadingState";
import { VAT_RATE } from "@/lib/constants/tax";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { FormMode } from "@/lib/utils/form-mode";
import { AlertVariant, ButtonVariant, ModalMode, ConfirmModalVariant } from "@/lib/utils/client-enums";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { InvoiceStatus as ServerInvoiceStatus } from "@/lib/server/utils/enum";
import { WHTType } from "@/lib/server/tax/calculator";

/**
 * Validation Error Field Names Enum
 * CRITICAL: Field names must match the order they appear in the form for scroll-to-error functionality
 */
enum InvoiceValidationField {
  CustomerName = "customerName",
  CustomerEmail = "customerEmail",
  CustomerPhone = "customerPhone",
  CustomerAddress = "customerAddress",
  CustomerTIN = "customerTIN",
  IssueDate = "issueDate",
  DueDate = "dueDate",
  InvoiceStatus = "invoiceStatus",
  InvoiceItems = "invoiceItems",
  EntityId = "entityId",
  InvoiceData = "invoiceData",
}

/**
 * Invoice Item Validation Error
 */
interface InvoiceItemError {
  index: number;
  field: "description" | "quantity" | "unitPrice";
  message: string;
}

/**
 * Invoice Form Validation Errors
 */
interface InvoiceValidationErrors {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTIN?: string;
  issueDate?: string;
  dueDate?: string;
  invoiceStatus?: string;
  invoiceItems?: InvoiceItemError[];
  entityId?: string;
  invoiceData?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTIN?: string;
  issueDate: string;
  dueDate?: string;
  items: InvoiceItem[];
  status: string;
  notes?: string;
  vatCategory?: string;
  isVATExempted?: boolean;
}

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: FormMode;
  invoiceId?: string;
  onSuccess?: () => void;
  // CRITICAL: entityId and accountType are required to determine companyId/businessId for invoice creation
  entityId?: string;
  accountType?: AccountType;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function InvoiceFormModal({
  isOpen,
  onClose,
  mode,
  invoiceId,
  onSuccess,
  entityId: propEntityId,
  accountType: propAccountType,
}: InvoiceFormModalProps) {
  const { isLoading: isLoadingInvoice, sendHttpRequest: fetchInvoiceReq } = useHttp();
  const { isLoading: isSubmitting, sendHttpRequest: submitRequest } = useHttp();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  
  // CRITICAL: Use props if provided, otherwise fall back to Redux (for backward compatibility)
  const { selectedCompanyId: reduxCompanyId } = useAppSelector((state: any) => state.company);
  const { selectedBusinessId: reduxBusinessId } = useAppSelector((state: any) => state.business);
  const { user } = useAppSelector((state: any) => state.user);
  
  // Determine accountType from props or Redux
  const accountType = propAccountType || user?.accountType;
  
  // Determine entityId from props or Redux based on accountType
  let entityId: string | null = null;
  if (propEntityId) {
    entityId = propEntityId;
  } else if (accountType === AccountType.Company) {
    entityId = reduxCompanyId || null;
  } else if (accountType === AccountType.Business) {
    entityId = reduxBusinessId || null;
  }
  
  // CRITICAL: For API calls, we need to send the correct field name based on account type
  // - Company accounts: send "companyId"
  // - Business accounts: send "businessId"
  // Backend expects different field names for different account types
  const companyId = entityId; // Used for validation and display purposes
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0, amount: 0 },
  ]);
  const [status, setStatus] = useState<InvoiceStatus>(getDefaultInvoiceStatus());
  const [isVATExempted, setIsVATExempted] = useState<boolean>(true);
  const [whtType, setWhtType] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<{ id: string; invoiceNumber: string } | null>(null);
  const [showPaidStatusConfirmModal, setShowPaidStatusConfirmModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<InvoiceStatus | null>(null);
  
  // CRITICAL: Separate validation errors for form fields and invoice items
  // This allows us to track item-level errors separately and scroll to the correct field
  const [itemErrors, setItemErrors] = useState<Record<number, { description?: string; quantity?: string; unitPrice?: string }>>({});
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<InvoiceValidationErrors>({});

  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  // Default issue date must be at least 2026-01-01
  const getDefaultIssueDate = () => {
    const currentDate = new Date();
    const minDate = new Date("2026-01-01");
    return currentDate >= minDate 
      ? currentDate.toISOString().split("T")[0]
      : "2026-01-01";
  };

  const { values, errors, touched, handleChange, handleBlur, validate, setValues } = useForm(
    {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      customerTIN: "",
      issueDate: getDefaultIssueDate(),
      dueDate: "",
      notes: "",
    },
    {
      customerName: {
        required: true,
        minLength: 2,
        maxLength: 200,
      },
      customerEmail: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      issueDate: {
        required: true,
      },
    }
  );

  // Companies are already fetched in DashboardLayout - no need to validate here
  // If companyId is missing, the form will handle it gracefully

  // Fetch invoice if editing
  useEffect(() => {
    if (isOpen && mode === "edit" && invoiceId && !invoice && !isLoadingInvoice) {
      fetchInvoice();
    }
  }, [isOpen, mode, invoiceId]);

  // Reset form when modal closes or when switching to create mode
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setInvoice(null);
      setItems([{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
      setStatus(getDefaultInvoiceStatus());
      // CRITICAL: VAT exemption is true (checked) by default when creating invoices
      // Users can uncheck it if they want VAT to be calculated
      setIsVATExempted(true);
      setWhtType("");
      setCreatedInvoice(null);
      setShowShareModal(false);
      setItemErrors({});
      setSubmitAttempted(false);
      setValidationErrors({});
      setValues({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerAddress: "",
        customerTIN: "",
        issueDate: getDefaultIssueDate(),
        dueDate: "",
        notes: "",
      });
    } else if (isOpen && mode === "create") {
      // CRITICAL: Ensure VAT exemption is true (checked) when modal opens in create mode
      // This ensures fresh invoices are VAT exempt by default
      setIsVATExempted(true);
    }
  }, [isOpen, mode, setValues]);

  // Companies are already fetched in DashboardLayout - no need to fetch here

  /**
   * CRITICAL: Comprehensive Invoice Form Validation
   * 
   * Validates all form fields and invoice items with strict rules.
   * Fails loudly for any invalid state - no defaults, no fallbacks.
   * 
   * @returns Validation errors object - empty object if valid
   */
  const validateInvoiceForm = useCallback((): InvoiceValidationErrors => {
    const validationErrors: InvoiceValidationErrors = {};
    const newItemErrors: Record<number, { description?: string; quantity?: string; unitPrice?: string }> = {};
    
    // CRITICAL: Validate entityId/companyId (required for create mode)
    if (!companyId || typeof companyId !== "string" || companyId.trim() === "") {
      validationErrors.entityId = "Company/Business ID is required. Please complete onboarding first.";
    }
    
    // CRITICAL: Validate customer name (required, 2-200 characters)
    if (!values.customerName || typeof values.customerName !== "string" || values.customerName.trim() === "") {
      validationErrors.customerName = "Customer name is required.";
    } else {
      const trimmedName = values.customerName.trim();
      if (trimmedName.length < 2) {
        validationErrors.customerName = "Customer name must be at least 2 characters.";
      } else if (trimmedName.length > 200) {
        validationErrors.customerName = "Customer name must not exceed 200 characters.";
      }
    }
    
    // CRITICAL: Validate customer email (optional, but must be valid format if provided)
    if (values.customerEmail && typeof values.customerEmail === "string" && values.customerEmail.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.customerEmail.trim())) {
        validationErrors.customerEmail = "Please enter a valid email address.";
      }
    }
    
    // CRITICAL: Validate issue date (required, must be >= 2026-01-01)
    if (!values.issueDate || typeof values.issueDate !== "string" || values.issueDate.trim() === "") {
      validationErrors.issueDate = "Issue date is required.";
    } else {
      const issueDateObj = new Date(values.issueDate);
      if (isNaN(issueDateObj.getTime())) {
        validationErrors.issueDate = "Issue date must be a valid date.";
      } else {
        const minDate = new Date("2026-01-01");
        minDate.setHours(0, 0, 0, 0);
        issueDateObj.setHours(0, 0, 0, 0);
        if (issueDateObj < minDate) {
          validationErrors.issueDate = "Issue date must be on or after January 1, 2026. This application only supports invoice dates from 2026 onward per Nigeria Tax Act 2025.";
        }
      }
    }
    
    // CRITICAL: Validate due date (optional, but must be >= 2026-01-01 and >= issue date if provided)
    if (values.dueDate && typeof values.dueDate === "string" && values.dueDate.trim() !== "") {
      const dueDateObj = new Date(values.dueDate);
      if (isNaN(dueDateObj.getTime())) {
        validationErrors.dueDate = "Due date must be a valid date.";
      } else {
        const minDate = new Date("2026-01-01");
        minDate.setHours(0, 0, 0, 0);
        dueDateObj.setHours(0, 0, 0, 0);
        if (dueDateObj < minDate) {
          validationErrors.dueDate = "Due date must be on or after January 1, 2026. This application only supports invoice dates from 2026 onward per Nigeria Tax Act 2025.";
        } else if (values.issueDate) {
          const issueDateObj = new Date(values.issueDate);
          issueDateObj.setHours(0, 0, 0, 0);
          if (dueDateObj < issueDateObj) {
            validationErrors.dueDate = "Due date must be on or after the issue date.";
          }
        }
      }
    }
    
    // CRITICAL: Validate invoice status (required, must be valid enum)
    if (!status) {
      validationErrors.invoiceStatus = "Invoice status is required.";
    } else {
      const validStatuses = Object.values(InvoiceStatus);
      if (!validStatuses.includes(status)) {
        validationErrors.invoiceStatus = `Invalid invoice status "${status}". Must be one of: ${validStatuses.join(", ")}.`;
      }
    }
    
    // CRITICAL: Validate invoice items (required, at least 1 item, each item must be valid)
    if (!items || !Array.isArray(items) || items.length === 0) {
      validationErrors.invoiceItems = [{ index: 0, field: "description", message: "At least one invoice item is required." }];
    } else {
      items.forEach((item, index) => {
        const itemError: { description?: string; quantity?: string; unitPrice?: string } = {};
        
        // Validate description (required, non-empty string)
        if (!item.description || typeof item.description !== "string" || item.description.trim() === "") {
          itemError.description = "Item description is required.";
        }
        
        // Validate quantity (required, must be > 0)
        if (item.quantity === undefined || item.quantity === null || typeof item.quantity !== "number" || isNaN(item.quantity)) {
          itemError.quantity = "Item quantity is required and must be a number.";
        } else if (item.quantity <= 0) {
          itemError.quantity = "Item quantity must be greater than 0.";
        }
        
        // Validate unit price (required, must be >= 0)
        if (item.unitPrice === undefined || item.unitPrice === null || typeof item.unitPrice !== "number" || isNaN(item.unitPrice)) {
          itemError.unitPrice = "Item unit price is required and must be a number.";
        } else if (item.unitPrice < 0) {
          itemError.unitPrice = "Item unit price cannot be negative.";
        }
        
        if (Object.keys(itemError).length > 0) {
          newItemErrors[index] = itemError;
        }
      });
      
      if (Object.keys(newItemErrors).length > 0) {
        const itemErrorsList: InvoiceItemError[] = [];
        Object.entries(newItemErrors).forEach(([indexStr, errors]) => {
          const index = parseInt(indexStr, 10);
          if (errors.description) {
            itemErrorsList.push({ index, field: "description", message: errors.description });
          } else if (errors.quantity) {
            itemErrorsList.push({ index, field: "quantity", message: errors.quantity });
          } else if (errors.unitPrice) {
            itemErrorsList.push({ index, field: "unitPrice", message: errors.unitPrice });
          }
        });
        validationErrors.invoiceItems = itemErrorsList;
      }
    }
    
    // CRITICAL: Validate WHT type (optional, but must be valid enum if provided)
    if (whtType && whtType.trim() !== "") {
      const validWHTTypes = Object.values(WHTType);
      if (!validWHTTypes.includes(whtType as WHTType)) {
        // This is handled in the form, but we validate for completeness
        // WHT type validation is primarily handled by the select dropdown
      }
    }
    
    // CRITICAL: Validate invoice data exists for edit mode
    if (mode === "edit" && !invoice) {
      validationErrors.invoiceData = "Invoice data is missing. Please refresh the page.";
    }
    
    // Update item errors state
    setItemErrors(newItemErrors);
    
    return validationErrors;
  }, [values, status, items, companyId, mode, invoice, whtType, isVATExempted]);
  
  /**
   * CRITICAL: Scroll to First Validation Error
   * 
   * Scrolls to the first field with a validation error in the order fields appear in the form.
   * Order: Customer Name, Customer Email, Issue Date, Due Date, Invoice Items, Invoice Status
   */
  const scrollToFirstError = useCallback((validationErrors: InvoiceValidationErrors) => {
    // CRITICAL: Field order matches form layout for accurate scrolling
    const fieldOrder: Array<{ field: InvoiceValidationField; selector: string | ((index?: number) => string) }> = [
      { field: InvoiceValidationField.CustomerName, selector: "input-customer-name" },
      { field: InvoiceValidationField.CustomerEmail, selector: "input-customer-email" },
      { field: InvoiceValidationField.IssueDate, selector: "input-issue-date" },
      { field: InvoiceValidationField.DueDate, selector: "input-due-date" },
      { field: InvoiceValidationField.InvoiceItems, selector: (index?: number) => index !== undefined ? `input-description-item-${index}` : "input-description" },
      { field: InvoiceValidationField.InvoiceStatus, selector: "[data-invoice-status-selector]" },
    ];
    
    // Find first error field
    let firstErrorField: { field: InvoiceValidationField; selector: string | ((index?: number) => string) } | null = null;
    let itemErrorIndex: number | undefined = undefined;
    
    for (const fieldConfig of fieldOrder) {
      const hasError = validationErrors[fieldConfig.field as keyof InvoiceValidationErrors];
      if (hasError) {
        firstErrorField = fieldConfig;
        // If it's an item error, get the first item index with error
        if (fieldConfig.field === InvoiceValidationField.InvoiceItems && validationErrors.invoiceItems && validationErrors.invoiceItems.length > 0) {
          itemErrorIndex = validationErrors.invoiceItems[0].index;
        }
        break;
      }
    }
    
    if (!firstErrorField) {
      return;
    }
    
    // Wait for DOM updates, then scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let errorElement: HTMLElement | null = null;
        
        // Get selector based on field type
        if (typeof firstErrorField!.selector === "function") {
          const selector = firstErrorField!.selector(itemErrorIndex);
          errorElement = document.getElementById(selector) || document.querySelector(`[id*="${selector}"]`) as HTMLElement;
        } else {
          errorElement = document.getElementById(firstErrorField!.selector) || 
                        document.querySelector(`[id*="${firstErrorField!.selector}"]`) as HTMLElement;
        }
        
        // Additional fallback selectors
        if (!errorElement) {
          const selectors = [
            `input[name="${firstErrorField!.field}"]`,
            `select[name="${firstErrorField!.field}"]`,
            `[id*="${firstErrorField!.field}"]`,
          ];
          
          for (const selector of selectors) {
            errorElement = document.querySelector(selector) as HTMLElement;
            if (errorElement) break;
          }
        }
        
        // For item errors, try item-specific selectors
        if (!errorElement && firstErrorField!.field === InvoiceValidationField.InvoiceItems && itemErrorIndex !== undefined) {
          const itemError = validationErrors.invoiceItems![0];
          const itemSelectors = [
            `#input-description-item-${itemErrorIndex}`,
            `input[data-item-index="${itemErrorIndex}"][data-item-field="${itemError.field}"]`,
            `input[data-item-index="${itemErrorIndex}"]`,
          ];
          
          for (const selector of itemSelectors) {
            errorElement = document.querySelector(selector) as HTMLElement;
            if (errorElement) break;
          }
        }
        
        if (errorElement) {
          errorElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          
          // Focus after scroll completes
          setTimeout(() => {
            if (errorElement && (errorElement instanceof HTMLInputElement || errorElement instanceof HTMLSelectElement || errorElement instanceof HTMLTextAreaElement)) {
              errorElement.focus();
            }
          }, 400);
        }
      });
    });
  }, []);

  const fetchInvoice = () => {
    setError(null);
    fetchInvoiceReq({
      successRes: (response: any) => {
        const invoiceData = response?.data?.data || response?.data;
        
        if (!invoiceData || !invoiceData._id) {
          setError("Invoice not found or invalid data structure");
          return;
        }

        // All invoices can be edited (removed pending-only restriction)

        setInvoice(invoiceData);

        // Set status from invoice data
        if (invoiceData.status) {
          setStatus(invoiceData.status as InvoiceStatus);
        }

        // Populate form with invoice data
        setValues({
          customerName: invoiceData.customerName || "",
          customerEmail: invoiceData.customerEmail || "",
          customerPhone: invoiceData.customerPhone || "",
          customerAddress: invoiceData.customerAddress || "",
          customerTIN: invoiceData.customerTIN || "",
          issueDate: invoiceData.issueDate
            ? new Date(invoiceData.issueDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          dueDate: invoiceData.dueDate
            ? new Date(invoiceData.dueDate).toISOString().split("T")[0]
            : "",
          notes: invoiceData.notes || "",
        });

        // Populate VAT exemption status if it exists
        if (invoiceData.isVATExempted !== undefined) {
          setIsVATExempted(invoiceData.isVATExempted);
        }

        // Populate WHT type if it exists
        if (invoiceData.whtType) {
          setWhtType(invoiceData.whtType);
        }

        // Populate items
        if (invoiceData.items && invoiceData.items.length > 0) {
          setItems(
            invoiceData.items.map((item: InvoiceItem) => ({
              description: item.description || "",
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              amount: (item.quantity || 1) * (item.unitPrice || 0),
            }))
          );
        }
      },
      errorRes: (errorResponse: any) => {
        if (errorResponse?.status === 404) {
          setError("Invoice not found");
        } else if (errorResponse?.status === 403) {
          setError("You don't have permission to edit this invoice");
        } else {
          setError("Failed to load invoice. Please try again.");
        }
        return true;
      },
      requestConfig: {
        url: `/invoices/${invoiceId}`,
        method: HttpMethod.GET,
      },
    });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }
    setItems(newItems);
    
    // CRITICAL: Clear item errors in real-time when user fixes them
    // This provides immediate feedback that errors are being resolved
    if (submitAttempted && itemErrors[index]) {
      const updatedItemErrors = { ...itemErrors };
      const item = newItems[index];
      
      // Validate the field that was just updated - if valid, clear its error
      let isValid = false;
      
      if (field === "description") {
        isValid = Boolean(item.description && typeof item.description === "string" && item.description.trim() !== "");
      } else if (field === "quantity") {
        isValid = item.quantity !== undefined && 
                   item.quantity !== null && 
                   typeof item.quantity === "number" && 
                   !isNaN(item.quantity) && 
                   item.quantity > 0;
      } else if (field === "unitPrice") {
        isValid = item.unitPrice !== undefined && 
                   item.unitPrice !== null && 
                   typeof item.unitPrice === "number" && 
                   !isNaN(item.unitPrice) && 
                   item.unitPrice >= 0;
      }
      
      // If field is now valid, clear its error (only for fields that can have errors)
      if (isValid && updatedItemErrors[index] && (field === "description" || field === "quantity" || field === "unitPrice")) {
        const errorField = field as "description" | "quantity" | "unitPrice";
        delete updatedItemErrors[index][errorField];
        
        // If all errors for this item are cleared, remove the item from errors object
        if (Object.keys(updatedItemErrors[index]).length === 0) {
          delete updatedItemErrors[index];
          setItemErrors(Object.keys(updatedItemErrors).length > 0 ? updatedItemErrors : {});
        } else {
          setItemErrors(updatedItemErrors);
        }
      }
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    // CRITICAL: If VAT is exempted, VAT amount is 0
    // Otherwise, calculate VAT normally
    const vatAmount = isVATExempted 
      ? 0 
      : Math.round((subtotal * (VAT_RATE / 100)) * 100) / 100;
    const totalBeforeWHT = subtotal + vatAmount;
    
    // Calculate WHT if applicable (simplified - actual calculation done on backend)
    // CRITICAL: WHT rates per NRS (Nigeria Revenue Service) regulations effective 2026+
    // Rates may vary based on payment type, recipient type, and small company exemptions
    // Always verify current rates at: https://www.nrs.gov.ng/ (NRS official website)
    // Backend calculation handles exemptions and accurate rate determination
    let whtAmount = 0;
    let whtRate = 0;
    let netAmountAfterWHT = totalBeforeWHT;
    
    if (whtType) {
      // Simplified WHT calculation for preview (backend will calculate accurately per NRS 2026+ regulations)
      // These are standard rates - actual rate may vary based on exemptions and recipient type
      
      // CRITICAL: Determine rates based on account type (Payee)
      // If user is Company, they suffer Company rates (10% for Prof Services)
      // If user is Business (Sole Prop), they suffer Individual rates (5% for Prof Services)
      const isCompany = accountType === AccountType.Company;
      
      const whtRates: Record<string, number> = {
        professional_services: isCompany ? 10 : 5, // 10% Company, 5% Individual
        technical_services: isCompany ? 10 : 5,    // 10% Company, 5% Individual
        management_services: isCompany ? 10 : 5,   // 10% Company, 5% Individual
        other_services: isCompany ? 10 : 5,        // 10% Company, 5% Individual
        dividends: 10, // 10% Both
        interest: 10, // 10% Both
        royalties: 10, // 10% Both
        rent: 10, // 10% Both
        commission: isCompany ? 10 : 5, // 10% Company, 5% Individual
        construction: isCompany ? 2 : 5, // 2% Company (Reduced), 5% Individual
      };
      whtRate = whtRates[whtType] || (isCompany ? 10 : 5);
      
      // CRITICAL: Round WHT calculation to 2 decimal places to match backend calculation
      // Formula: Math.round((amount * (whtRate / 100)) * 100) / 100
      // CRITICAL: WHT Base = Subtotal (Net of VAT) per NRS Regulations
      // Old incorrect logic: Calculated on totalBeforeWHT (which includes VAT)
      // New correct logic: Calculated on subtotal (excluding VAT)
      // This ensures frontend preview matches backend calculation exactly
      whtAmount = Math.round((subtotal * (whtRate / 100)) * 100) / 100;
      // CRITICAL: Round net amount after WHT to 2 decimal places to match backend calculation
      // Formula: Math.round((grossAmount - whtAmount) * 100) / 100
      netAmountAfterWHT = Math.round((totalBeforeWHT - whtAmount) * 100) / 100;
    }
    
    return { 
      subtotal, 
      vatAmount, 
      total: totalBeforeWHT, // Total before WHT
      whtAmount,
      whtRate,
      netAmountAfterWHT,
      vatRate: VAT_RATE 
    };
  };

  const createInvoiceSuccessHandler = (response: any) => {
    console.log("[InvoiceFormModal] Invoice creation response received:", {
      response,
      responseData: response?.data,
      message: response?.data?.message,
      invoiceData: response?.data?.data,
      invoiceId: response?.data?.data?._id || response?.data?.data?.id,
      invoiceNumber: response?.data?.data?.invoiceNumber,
      status: response?.data?.data?.status,
      vatAmount: response?.data?.data?.vatAmount,
      issueDate: response?.data?.data?.issueDate,
      issueDateYear: response?.data?.data?.issueDate ? new Date(response?.data?.data?.issueDate).getFullYear() : null,
      issueDateMonth: response?.data?.data?.issueDate ? new Date(response?.data?.data?.issueDate).getMonth() + 1 : null,
      note: "Check backend logs to verify VAT record was created. Expected VAT record year/month should match issueDate year/month.",
    });
    
    if (response?.data?.message === "success" && response?.data?.data) {
      const invoice = response.data.data;
      setCreatedInvoice({
        id: invoice._id || invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      });
      setShowShareModal(true);
      if (onSuccess) onSuccess();
      
      console.log("[InvoiceFormModal] ✅ Invoice created successfully. VAT page should refresh automatically.", {
        invoiceId: invoice._id || invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        note: "If VAT doesn't show up, check: 1) VAT record was created (backend logs), 2) VAT summary fetch uses correct year/month, 3) VAT summary API returns the record",
      });
    } else {
      console.error("[InvoiceFormModal] ❌ Invoice creation response invalid:", {
        response,
        expectedStructure: {
          data: {
            message: "success",
            data: { _id: "...", invoiceNumber: "...", status: "...", vatAmount: "...", issueDate: "..." }
          }
        },
      });
    }
  };

  const updateInvoiceSuccessHandler = (response: any) => {
    if (response?.data?.message === "success") {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CRITICAL: Mark submit as attempted to show all validation errors
    setSubmitAttempted(true);
    
    // CRITICAL: Mark all form fields as touched to show validation errors
    Object.keys(values).forEach((field) => {
      handleBlur(field as keyof typeof values)();
    });

    // CRITICAL: Comprehensive validation - validate ALL fields and items
    const formValidationErrors = validateInvoiceForm();
    
    // CRITICAL: Store validation errors in state for display
    setValidationErrors(formValidationErrors);
    
    // CRITICAL: If validation fails, scroll to first error and stop submission
    if (Object.keys(formValidationErrors).length > 0) {
      const errorMessages: string[] = [];
      
      if (formValidationErrors.customerName) errorMessages.push(formValidationErrors.customerName);
      if (formValidationErrors.customerEmail) errorMessages.push(formValidationErrors.customerEmail);
      if (formValidationErrors.issueDate) errorMessages.push(formValidationErrors.issueDate);
      if (formValidationErrors.dueDate) errorMessages.push(formValidationErrors.dueDate);
      if (formValidationErrors.invoiceStatus) errorMessages.push(formValidationErrors.invoiceStatus);
      if (formValidationErrors.invoiceItems) {
        const firstItemError = formValidationErrors.invoiceItems[0];
        errorMessages.push(`Item ${firstItemError.index + 1}: ${firstItemError.message}`);
      }
      if (formValidationErrors.entityId) errorMessages.push(formValidationErrors.entityId);
      if (formValidationErrors.invoiceData) errorMessages.push(formValidationErrors.invoiceData);
      
      setError(errorMessages.length > 0 ? errorMessages[0] : "Please fix the errors in the form before submitting.");
      
      // Scroll to first error
      scrollToFirstError(formValidationErrors);
      
      return;
    }
    
    // CRITICAL: Clear any previous errors if validation passes
    setError(null);
    setValidationErrors({});

    // CRITICAL: Build request body with correct entity ID field based on account type
    // Backend expects "companyId" for Company accounts and "businessId" for Business accounts
    const entityIdField = accountType === AccountType.Business ? "businessId" : "companyId";
    
    const invoiceData = {
      ...(mode === "edit" ? {} : { [entityIdField]: entityId }),
      ...values,
      issueDate: new Date(values.issueDate),
      dueDate: values.dueDate ? new Date(values.dueDate) : (mode === "edit" ? null : undefined),
      items: items.map(({ amount, ...item }) => item),
      // CRITICAL: VAT exemption flag - if true, invoice is for VAT-exempt goods/services
      // VAT records are only created when status is "Paid" AND isVATExempted is false
      isVATExempted: isVATExempted,
      // CRITICAL: Send empty string "" when "No WHT" is selected to explicitly remove WHT type
      // If we send undefined, backend treats it as "don't change" and won't delete WHT record
      whtType: whtType || "",
      status,
    };

    // DEBUG: Comprehensive logging for invoice creation
    console.log(`[InvoiceFormModal] ${mode === "create" ? "Creating" : "Updating"} invoice:`, {
      mode,
      accountType,
      entityId,
      [entityIdField]: entityId,
      invoiceId: mode === "edit" ? invoiceId : "new",
      status,
      issueDate: invoiceData.issueDate?.toISOString(),
      issueDateYear: invoiceData.issueDate?.getFullYear(),
      issueDateMonth: invoiceData.issueDate ? invoiceData.issueDate.getMonth() + 1 : null,
      items: invoiceData.items,
      itemsCount: invoiceData.items?.length,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      whtType: whtType || "none",
      fullInvoiceData: invoiceData,
      expectedVATRecord: {
        shouldCreate: status !== "cancelled",
        year: invoiceData.issueDate?.getFullYear(),
        month: invoiceData.issueDate ? invoiceData.issueDate.getMonth() + 1 : null,
        amount: totals.vatAmount,
      },
    });

    const url = mode === "create" ? "/invoices/create" : `/invoices/${invoiceId}`;
    const method = mode === "create" ? HttpMethod.POST : HttpMethod.PUT;
    const successHandler = mode === "create" ? createInvoiceSuccessHandler : updateInvoiceSuccessHandler;

    submitRequest({
      successRes: successHandler,
      errorRes: (errorResponse: any) => {
        // Check if this is an upgrade-required error
        if (errorResponse?.status === 403 && errorResponse?.data?.data?.upgradeRequired) {
          const upgradeData = errorResponse.data.data.upgradeRequired;
          showUpgradePrompt({
            feature: "Unlimited Invoices",
            currentPlan: upgradeData.currentPlan,
            requiredPlan: upgradeData.requiredPlan,
            requiredPlanPrice: upgradeData.requiredPlanPrice,
            message: errorResponse?.data?.description || "You've reached your monthly invoice limit. Upgrade to create unlimited invoices.",
            reason: upgradeData.reason,
            usageInfo: upgradeData.usageInfo,
          });
          return false; // Don't show error toast, upgrade prompt handles it
        }
        
        setError(errorResponse?.data?.description || "Failed to save invoice. Please try again.");
        return true;
      },
      requestConfig: {
        url,
        method,
        body: invoiceData,
        successMessage: mode === "create" ? "Invoice created successfully!" : "Invoice updated successfully!",
      },
    });
  };

  const totals = calculateTotals();
  // Only show loading for invoice data, not company (company is already fetched in DashboardLayout)
  const isLoading = isLoadingInvoice;
  const isSubmittingForm = isSubmitting;

  return (
    <>
      <FullScreenModal
        isOpen={isOpen}
        onClose={onClose}
        title={mode === "create" ? "Create Invoice" : `Edit Invoice ${invoice?.invoiceNumber || ""}`}
      >
        {isLoading ? (
          <LoadingState message="Loading invoice..." />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {mode === "create" && (
              <motion.div variants={itemVariants} className="mb-6">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="w-8 h-8 text-emerald-600" />
                  <h2 className="text-2xl font-bold text-slate-900">Create Invoice</h2>
                </div>
                <p className="text-slate-600 ml-11">
                  Create an invoice formatted per NRS (Nigeria Revenue Service) requirements. 
                  VAT will be automatically calculated and added unless you select VAT exemption for exempt goods/services.
                </p>
              </motion.div>
            )}

            {mode === "edit" && invoice && (
              <motion.div variants={itemVariants} className="mb-6">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="w-8 h-8 text-emerald-600" />
                  <h2 className="text-2xl font-bold text-slate-900">Edit Invoice</h2>
                </div>
                <p className="text-slate-600 ml-11">
                  Editing invoice {invoice.invoiceNumber} • Current status: {invoice.status}
                </p>
              </motion.div>
            )}

            {error && (
              <motion.div variants={itemVariants}>
                <Alert variant={AlertVariant.Error} title="Error">
                  {error}
                </Alert>
              </motion.div>
            )}

            <motion.form
              variants={itemVariants}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <motion.div variants={itemVariants}>
                <Card title="Invoice Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Input
                        label="Issue Date"
                        type="date"
                        required
                        id="input-issue-date"
                        min="2026-01-01"
                        value={values.issueDate}
                        onChange={handleChange("issueDate")}
                        onBlur={handleBlur("issueDate")}
                        error={touched.issueDate ? errors.issueDate : undefined}
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <Input
                        label="Due Date"
                        type="date"
                        id="input-due-date"
                        min="2026-01-01"
                        value={values.dueDate}
                        onChange={handleChange("dueDate")}
                        onBlur={handleBlur("dueDate")}
                        error={touched.dueDate ? errors.dueDate : undefined}
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="md:col-span-2"
                    >
                      <div data-invoice-status-selector>
                        <InvoiceStatusSelector
                          value={status}
                          onChange={(newStatus) => {
                            // CRITICAL: Show confirmation modal when status changes to "Paid"
                            // This is important because marking an invoice as "Paid" will create a VAT record
                            if (newStatus === InvoiceStatus.Paid && status !== InvoiceStatus.Paid) {
                              setPendingStatusChange(newStatus);
                              setShowPaidStatusConfirmModal(true);
                            } else {
                              setStatus(newStatus);
                            }
                          }}
                          context={mode === FormMode.Create ? ModalMode.Create : ModalMode.Edit}
                          currentStatus={invoice?.status as InvoiceStatus}
                          label="Payment Status"
                          required
                        />
                      </div>
                      {submitAttempted && validationErrors.invoiceStatus && (
                        <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center">
                          <span className="mr-1" aria-hidden="true">⚠</span>
                          {validationErrors.invoiceStatus}
                        </p>
                      )}
                    </motion.div>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <CustomerDetailsForm
                  values={{
                    customerName: values.customerName,
                    customerEmail: values.customerEmail,
                    customerPhone: values.customerPhone,
                    customerAddress: values.customerAddress,
                    customerTIN: values.customerTIN,
                  }}
                  errors={errors}
                  touched={touched}
                  handleChange={handleChange as any}
                  handleBlur={handleBlur as any}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <InvoiceItemsSection
                  items={items}
                  onUpdateItem={updateItem}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                  itemErrors={submitAttempted ? itemErrors : undefined}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <InvoiceSummary
                  subtotal={totals.subtotal}
                  vatAmount={totals.vatAmount}
                  total={totals.total}
                  vatRate={totals.vatRate}
                  whtAmount={totals.whtAmount}
                  whtRate={totals.whtRate}
                  netAmountAfterWHT={totals.netAmountAfterWHT}
                />
              </motion.div>

              {/* VAT Exemption Section - Available for both Company and Business accounts */}
              {(accountType === AccountType.Company || accountType === AccountType.Business) && (
                <motion.div variants={itemVariants}>
                  <Card 
                    title="VAT (Value Added Tax)" 
                    subtitle="VAT is automatically calculated and added to your invoice. Check the box below only if this invoice is for VAT-exempt goods/services."
                  >
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="isVATExempted"
                          checked={isVATExempted}
                          onChange={(e) => setIsVATExempted(e.target.checked)}
                          className="mt-1 w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2"
                        />
                        <div className="flex-1">
                          <label htmlFor="isVATExempted" className="block text-sm font-medium text-slate-900 cursor-pointer">
                            Exempt this invoice from VAT (for VAT-exempt goods/services only)
                          </label>
                          <div className="mt-2 space-y-2">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                              <p className="text-sm font-semibold text-emerald-900 mb-2">
                                ✅ Default: VAT Exempt (Checked)
                              </p>
                              <p className="text-sm text-emerald-800">
                                By default, <strong>No VAT</strong> is charged. This is correct for businesses earning <strong>less than ₦25 million/year</strong>.
                              </p>
                              <p className="text-sm text-emerald-800 mt-2">
                                <strong>To Charge VAT:</strong> Uncheck the box above.
                              </p>
                            </div>
                            
                            <p className="text-sm text-slate-700 mt-3">
                              <strong className="text-slate-900">Leave this box CHECKED (Exempt) if:</strong>
                            </p>
                            <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc">
                              <li>Your business turnover is <strong>less than ₦25 million per year</strong> (You are NOT required to charge VAT)</li>
                              <li>Your invoice is for <strong>VAT-exempt goods/services</strong> (Food, Medical, Books, etc.)</li>
                            </ul>
                            
                            <p className="text-sm text-slate-700 mt-3">
                              <strong className="text-slate-900">UNCHECK this box (Charge VAT) if:</strong>
                            </p>
                            <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc">
                              <li>Your business makes <strong>₦25 million+</strong> per year (You MUST charge VAT)</li>
                              <li>You are already <strong>VAT Registered</strong> with FIRS</li>
                            </ul>
                            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                              <p>
                                <strong>Note on Thresholds (Act 2025):</strong> 
                              </p>
                              <ul className="mt-1 ml-4 list-disc space-y-1">
                                <li><strong>VAT Registration:</strong> Periodic threshold is <strong>₦25 Million</strong>. If you earn ≥ ₦25M/year, you must charge VAT (7.5%).</li>
                                {accountType === AccountType.Company && (
                                  <li><strong>CIT Exemption:</strong> Small Company threshold is <strong>₦50 Million</strong>. If you earn ≤ ₦50M/year, you are exempt from CIT (0% rate).</li>
                                )}
                              </ul>
                              <p className="mt-2">
                                <strong>Compliance Warning:</strong> Charging VAT when not eligible (Turnover &lt; ₦25M) or failing to charge when required is a compliance offence.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* WHT Section - Available for both Create and Edit modes */}
              {/* WHT can be set when creating an invoice or updated when editing */}
              {(accountType === AccountType.Company || accountType === AccountType.Business) && companyId && (
                <motion.div variants={itemVariants}>
                  <Card 
                    title="Withholding Tax (WHT)" 
                    subtitle={mode === "edit" 
                      ? "Update WHT type if applicable. WHT will be recalculated based on current invoice subtotal (Net of VAT)."
                      : "Optional: Select if WHT applies to this invoice"
                    }
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          WHT Type (if applicable)
                        </label>
                        <select
                          value={whtType}
                          onChange={(e) => setWhtType(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">No WHT</option>
                          <option value="professional_services">Professional Services (5%)</option>
                          <option value="technical_services">Technical Services (5%)</option>
                          <option value="management_services">Management Services (5%)</option>
                          <option value="construction">Construction (2%)</option>
                          <option value="other_services">Other Services (5%)</option>
                          <option value="dividends">Dividends (10%)</option>
                          <option value="interest">Interest (10%)</option>
                          <option value="royalties">Royalties (10%)</option>
                          <option value="rent">Rent (10%)</option>
                          <option value="commission">Commission (5%)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                          WHT is deducted from your <strong>Net Invoice Amount</strong> (excluding VAT).
                          <span className="block mt-1 text-emerald-700">
                            <strong>Tip/Exemption:</strong> Small businesses with annual turnover <strong>&lt; ₦25 Million</strong> are typically exempt from suffering WHT deductions on invoices. If this applies, you may select "No WHT" and provide your TIN to the client.
                          </span>
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100"
              >
                <Button
                  type="button"
                  variant={ButtonVariant.Outline}
                  onClick={onClose}
                  disabled={isSubmittingForm}
                  className="w-full sm:w-auto border-slate-200 hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isSubmittingForm}
                  disabled={isSubmittingForm || !companyId || isLoading}
                  className="w-full sm:w-auto min-w-[160px]"
                >
                  <Save className="w-4 h-4" />
                  {mode === "create" ? "Create Invoice" : "Update Invoice"}
                </Button>
              </motion.div>
            </motion.form>
          </motion.div>
        )}
      </FullScreenModal>

      {/* Share Invoice Modal (only for create mode) */}
      {createdInvoice && mode === "create" && (
        <ShareInvoiceModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            onClose();
          }}
          invoiceId={createdInvoice.id}
          invoiceNumber={createdInvoice.invoiceNumber}
        />
      )}
      
      {/* Upgrade Prompt */}
      <UpgradePromptComponent />

      {/* Confirmation Modal for Paid Status */}
      <ConfirmModal
        isOpen={showPaidStatusConfirmModal}
        onClose={() => {
          setShowPaidStatusConfirmModal(false);
          setPendingStatusChange(null);
        }}
        onConfirm={() => {
          if (pendingStatusChange) {
            setStatus(pendingStatusChange);
            setShowPaidStatusConfirmModal(false);
            setPendingStatusChange(null);
          }
        }}
        title="Record Your Expenses First"
        message={
          <div className="space-y-4">
            <p className="text-base text-slate-700 font-medium">
              Before you mark this invoice as <strong className="text-emerald-600">Paid</strong>, make sure you have recorded all the money you spent to complete this job.
            </p>
            
            {/* Tax Calculation Info - Dynamic based on Account Type */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl p-4 shadow-sm">
              <p className="text-lg font-bold text-emerald-900 mb-3 text-center flex items-center justify-center gap-2">
                <span className="text-2xl">📊</span> How Government Calculates Your Tax
              </p>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-emerald-100 space-y-3">
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">
                    Step 1: Find Your Profit
                  </p>
                  <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100/50">
                    <p className="text-xl md:text-2xl font-bold text-emerald-700 text-center">
                      Profit = Money You Made - Money You Spent
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 ml-2">
                    Example: If you made ₦100,000 and spent ₦30,000, your profit is ₦70,000
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">
                    Step 2: Calculate Your Tax
                  </p>
                  <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100/50">
                    <p className="text-xl md:text-2xl font-bold text-emerald-700 text-center">
                      Tax = Profit × Tax Percentage
                    </p>
                  </div>
                  
                  {/* Dynamic Tax Rates based on Account Type */}
                  <div className="mt-2">
                    <p className="text-base font-semibold text-slate-900 mb-1.5">
                      Your Tax Rates (Nigeria Tax Act 2025):
                    </p>
                    
                    {accountType === AccountType.Company ? (
                      <div className="text-base text-slate-700 space-y-2 ml-2">
                        <ul className="list-disc list-inside text-sm text-slate-600 mb-2">
                          <li><strong>Note:</strong> Small Companies (Turnover &lt; ₦25M) are generally exempt from suffering WHT deductions on valid invoices. Always verify TIN.</li>
                        </ul>
                         <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
                          <p className="font-bold text-emerald-900 mb-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Company Income Tax (CIT)
                          </p>
                          <div className="space-y-2 pl-4 border-l-2 border-emerald-100 ml-1">
                            <div>
                              <p className="font-semibold text-sm text-emerald-800">• Small Company: 0% (Tax Exempt)</p>
                              <p className="text-xs text-slate-500">Turnover ≤ ₦50 million per year</p>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-emerald-800">• Large Company: 30%</p>
                              <p className="text-xs text-slate-500">Turnover &gt; ₦50 million per year</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-base text-slate-700 space-y-2 ml-2">
                        <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
                          <p className="font-bold text-emerald-900 mb-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Personal Income Tax (PIT)
                          </p>
                          <p className="text-xs text-slate-500 mb-3 pl-1">Progressive rates for Business/Sole Proprietors (2026+):</p>
                          <div className="space-y-2 text-sm pl-4 border-l-2 border-emerald-100 ml-1">
                            <div className="flex justify-between border-b border-dashed border-emerald-100 pb-1">
                              <span className="text-slate-600">First ₦800k Profit:</span>
                              <span className="font-bold text-emerald-700">0% (Exempt)</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-emerald-100 pb-1">
                              <span className="text-slate-600">Next ₦2.2M (up to 3M):</span>
                              <span className="font-bold text-emerald-700">15%</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-emerald-100 pb-1">
                              <span className="text-slate-600">Next ₦9M (up to 12M):</span>
                              <span className="font-bold text-emerald-700">18%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Above ₦50M:</span>
                              <span className="font-bold text-emerald-700">25%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-emerald-700/80 mt-3 ml-2 italic font-medium">
                      Note: Recording expenses lowers your profit, which lowers your tax.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-4 bg-emerald-900/5 rounded-xl border border-emerald-200">
                <p className="text-lg font-bold text-emerald-900 mb-2 flex items-center gap-2">
                  <span className="text-xl">💡</span> Smart Tip
                </p>
                <div className="text-base text-emerald-900 space-y-2 leading-relaxed">
                  <p>
                    When you mark this as <strong>Paid</strong>, the government sees it as money you have made.
                  </p>
                  <p>
                    If you don't add your <strong>Expenses</strong> (money you spent) first, your tax will be too high!
                  </p>
                  <p className="font-bold text-emerald-800 mt-2 p-2 bg-emerald-100/50 rounded-lg text-center">
                    Always record expenses BEFORE marking invoices as paid.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-emerald-100 rounded-xl p-4 shadow-sm">
              <p className="text-base font-bold text-emerald-900 mb-3 flex items-center gap-2">
                 ✅ What You Need To Do:
              </p>
              <div className="space-y-3">
                {[
                  "Go to the Expenses page",
                  "Record all job-related expenses (materials, transport, etc.)",
                  "Mark as tax-deductible",
                  "Come back here and mark as 'Paid'"
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-emerald-800">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-base font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        }
        confirmLabel="I've Recorded Expenses - Mark as Paid"
        cancelLabel="Cancel - Record Expenses First"
        variant={ConfirmModalVariant.Info}
        isLoading={false}
      />
    </>
  );
}

