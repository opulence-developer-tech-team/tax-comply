import axios from "axios";
import crypto from "crypto";
import { logger } from "../utils/logger";

// Monnify API configuration
const MONNIFY_BASE_URL =
  process.env.MONNIFY_BASE_URL || "https://api.monnify.com";
const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY || "";
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY || "";
const MONNIFY_CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE || "";

export interface IMonnifyCheckoutRequest {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber: string;
  paymentDescription: string;
  currencyCode?: string;
  contractCode: string;
  redirectUrl: string;
  paymentReference: string;
  paymentMethods?: string[];
  metadata?: Record<string, any>;
}

export interface IMonnifyCheckoutResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    merchantName: string;
    apiKey: string;
    enabledPaymentMethod: string[];
    checkoutUrl: string;
  };
}

export interface IMonnifyWebhookPayload {
  eventType: string;
  eventData: {
    product?: any;
    transactionReference: string;
    paymentReference: string;
    amountPaid: string;
    totalPayable: string;
    settlementAmount: string;
    paidOn: string;
    paymentStatus: string;
    paymentDescription: string;
    currency: string;
    paymentMethod: string;
    customer?: any;
    metaData?: Record<string, any>;
  };
}

class MonnifyService {
  /**
   * Validate Monnify configuration
   */
  private validateConfig(): void {
    if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY || !MONNIFY_CONTRACT_CODE) {
      throw new Error(
        "Monnify configuration is incomplete. Please ensure MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE are set in your environment variables."
      );
    }
  }

  /**
   * Format Nigerian phone number for Monnify
   * Converts +23409037865253 -> 2349037865253 (removes + and leading 0)
   */
  private formatNigerianPhone(phone: string): string {
    let cleaned = phone.replace(/\s+/g, "").replace("+", "");

    // Handle +2340... format (remove the 0 after country code)
    if (cleaned.startsWith("2340")) {
      cleaned = "234" + cleaned.slice(4);
    }

    // Handle 0... format (add country code and remove leading 0)
    if (cleaned.startsWith("0")) {
      cleaned = "234" + cleaned.slice(1);
    }

    // Ensure it starts with 234 (Nigerian country code)
    if (!cleaned.startsWith("234")) {
      cleaned = "234" + cleaned;
    }

    return cleaned;
  }

  /**
   * Generate authentication token for Monnify API
   */
  private async getAuthToken(): Promise<string> {
    this.validateConfig();
    
    try {
      const credentials = Buffer.from(
        `${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`
      ).toString("base64");
      const response = await axios.post(
        `${MONNIFY_BASE_URL}/api/v1/auth/login`,
        {},
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (
        response.data?.requestSuccessful &&
        response.data?.responseBody?.accessToken
      ) {
        logger.info("Monnify auth token obtained successfully");
        return response.data.responseBody.accessToken;
      }

      logger.error("Failed to get Monnify auth token - invalid response", undefined, {
        responseData: response.data,
        requestSuccessful: response.data?.requestSuccessful,
        hasAccessToken: !!response.data?.responseBody?.accessToken,
      });
      throw new Error(
        response.data?.responseMessage || "Failed to get Monnify authentication token"
      );
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Handle 401 specifically
      if (error.response?.status === 401) {
        logger.error("Monnify authentication failed - Invalid credentials", err, {
          status: error.response.status,
          responseData: error.response.data,
          apiKeyPrefix: MONNIFY_API_KEY?.substring(0, 8) + "...",
        });
        throw new Error(
          "Invalid Monnify authentication credentials. Please check that MONNIFY_API_KEY and MONNIFY_SECRET_KEY are correct and match your Monnify account (test or production)."
        );
      }
      
      logger.error("Error getting Monnify auth token", err, {
        status: error.response?.status,
        responseData: error.response?.data,
      });
      
      throw new Error(
        error.response?.data?.responseMessage || 
        "Failed to authenticate with Monnify. Please check your credentials and try again."
      );
    }
  }

  /**
   * Create checkout URL with Monnify
   */
  public async createCheckoutUrl(
    request: IMonnifyCheckoutRequest
  ): Promise<IMonnifyCheckoutResponse> {
    try {
      const authToken = await this.getAuthToken();
      
      // Ensure contract code is provided
      const contractCode = request.contractCode || MONNIFY_CONTRACT_CODE;
      if (!contractCode) {
        throw new Error(
          "MONNIFY_CONTRACT_CODE is required. Please set it in your environment variables."
        );
      }

      // Normalize amount to 2 decimal places
      const rawAmount =
        typeof request.amount === "string"
          ? parseFloat(request.amount)
          : request.amount;

      const amount = Math.round(rawAmount * 100) / 100;
      
      // Validate required fields
      if (!request.customerName || !request.customerEmail || !request.customerPhoneNumber) {
        throw new Error("Customer name, email, and phone number are required");
      }

      // Format phone number for Monnify
      const formattedPhone = this.formatNigerianPhone(request.customerPhoneNumber);

      // Build payload
      const payload: any = {
        amount: amount,
        customerName: request.customerName.trim(),
        customerEmail: request.customerEmail.trim(),
        customerPhoneNumber: formattedPhone,
        paymentDescription: request.paymentDescription.trim(),
        currencyCode: request.currencyCode || "NGN",
        contractCode: contractCode,
        redirectUrl: request.redirectUrl,
        paymentReference: request.paymentReference,
        paymentMethods: request.paymentMethods || ["CARD", "USSD", "ACCOUNT_TRANSFER"],
      };
      
      // Add metadata if provided
      if (request.metadata && Object.keys(request.metadata).length > 0) {
        payload.metaData = request.metadata;
      }
      
      logger.info("Creating Monnify checkout URL", {
        paymentReference: request.paymentReference,
        amount: amount,
        contractCode: contractCode.substring(0, 8) + "...",
      });

      const response = await axios.post(
        `${MONNIFY_BASE_URL}/api/v1/merchant/transactions/init-transaction`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      if (!response.data?.requestSuccessful) {
        throw new Error(
          response.data?.responseMessage || "Failed to create checkout URL"
        );
      }

      logger.info("Monnify checkout URL created successfully", {
        paymentReference: request.paymentReference,
        transactionReference: response.data?.responseBody?.transactionReference,
      });

      return response.data;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error creating Monnify checkout URL", err, {
        paymentReference: request.paymentReference,
      });

      if (error.response?.data) {
        throw new Error(
          error.response.data.responseMessage || "Failed to create checkout URL"
        );
      }

      throw new Error("Failed to create checkout URL with Monnify");
    }
  }

  /**
   * Initiate bank transfer/disbursement (withdrawal)
   */
  public async initiateDisbursement(request: {
    amount: number;
    reference: string;
    narration: string;
    destinationBankCode: string;
    destinationAccountNumber: string;
    destinationAccountName: string;
    sourceAccountNumber?: string;
    currencyCode?: string;
  }): Promise<{
    requestSuccessful: boolean;
    responseMessage: string;
    responseCode: string;
    responseBody: {
      transactionReference: string;
      paymentReference: string;
      amount: number;
      fee: number;
      status: string;
      destinationAccountNumber: string;
      destinationAccountName: string;
      destinationBankCode: string;
      destinationBankName: string;
      dateCreated: string;
    };
  }> {
    try {
      this.validateConfig();
      const authToken = await this.getAuthToken();

      const payload = {
        amount: request.amount,
        reference: request.reference,
        narration: request.narration,
        destinationBankCode: request.destinationBankCode,
        destinationAccountNumber: request.destinationAccountNumber,
        destinationAccountName: request.destinationAccountName,
        sourceAccountNumber: request.sourceAccountNumber || "",
        currencyCode: request.currencyCode || "NGN",
      };

      logger.info("Initiating Monnify disbursement", {
        reference: request.reference,
        amount: request.amount,
        destinationAccountNumber: request.destinationAccountNumber.substring(0, 4) + "****",
      });

      const response = await axios.post(
        `${MONNIFY_BASE_URL}/api/v2/disbursements/single`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 seconds for disbursements
        }
      );

      if (!response.data?.requestSuccessful) {
        throw new Error(
          response.data?.responseMessage || "Failed to initiate disbursement"
        );
      }

      logger.info("Monnify disbursement initiated successfully", {
        reference: request.reference,
        transactionReference: response.data?.responseBody?.transactionReference,
      });

      return response.data;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error initiating Monnify disbursement", err, {
        reference: request.reference,
      });

      if (error.response?.data) {
        throw new Error(
          error.response.data.responseMessage || "Failed to initiate disbursement"
        );
      }

      throw new Error("Failed to initiate disbursement with Monnify");
    }
  }

  /**
   * Get transaction status by reference (Payment Reference or Transaction Reference)
   */
  public async getTransactionStatus(reference: string): Promise<any> {
    try {
      const authToken = await this.getAuthToken();
      
      // Try searching by Transaction Reference first (standard endpoint)
      // If we are sure it's a payment reference, we should use the query endpoint
      // But usually we don't know which one it is if passed generically
      
      // Strategy: 
      // 1. Try /api/v2/transactions/{reference} (Expects Transaction Reference)
      // 2. If 404, try /api/v2/merchant/transactions/query?paymentReference={reference}
      
      try {
        const response = await axios.get(
          `${MONNIFY_BASE_URL}/api/v2/transactions/${encodeURIComponent(reference)}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          }
        );

        if (response.data?.requestSuccessful) {
          return response.data.responseBody;
        }
      } catch (error: any) {
        // If 404, it might be a payment reference, so let's try the query endpoint
        if (error.response?.status !== 404) {
          throw error; // Propagate other errors
        }
      }

      // Try searching by Payment Reference
      const queryResponse = await axios.get(
        `${MONNIFY_BASE_URL}/api/v2/merchant/transactions/query?paymentReference=${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (queryResponse.data?.requestSuccessful) {
         return queryResponse.data.responseBody;
      }
      
      throw new Error(`Transaction not found for reference: ${reference}`);

    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error getting Monnify transaction status", err, { reference });

      if (error.response?.data) {
        throw new Error(
          error.response.data.responseMessage || "Failed to get transaction status"
        );
      }

      throw new Error("Failed to get transaction status with Monnify");
    }
  }

  /**
   * Verify payment transaction with Monnify
   * @deprecated Use getTransactionStatus instead which is smarter about reference types
   */
  public async verifyTransaction(
    transactionReference: string
  ): Promise<any> {
      return this.getTransactionStatus(transactionReference);
  }

  /**
   * Verify Monnify webhook signature
   */
  public verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    try {
      const computedHash = crypto
        .createHmac("sha512", MONNIFY_SECRET_KEY)
        .update(payload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(computedHash, "hex"),
        Buffer.from(signature, "hex")
      );
    } catch (error: any) {
      logger.error("Error verifying webhook signature", error);
      return false;
    }
  }

  /**
   * Parse and validate webhook payload
   */
  public parseWebhookPayload(body: any): IMonnifyWebhookPayload | null {
    try {
      if (
        !body.eventType ||
        !body.eventData ||
        !body.eventData.transactionReference ||
        !body.eventData.paymentReference
      ) {
        return null;
      }

      return {
        eventType: body.eventType,
        eventData: {
          product: body.eventData.product || {},
          transactionReference: body.eventData.transactionReference,
          paymentReference: body.eventData.paymentReference,
          amountPaid: body.eventData.amountPaid || "0",
          totalPayable: body.eventData.totalPayable || "0",
          settlementAmount: body.eventData.settlementAmount || "0",
          paidOn: body.eventData.paidOn || "",
          paymentStatus: body.eventData.paymentStatus || "",
          paymentDescription: body.eventData.paymentDescription || "",
          currency: body.eventData.currency || "NGN",
          paymentMethod: body.eventData.paymentMethod || "",
          customer: body.eventData.customer || {},
          metaData: body.eventData.metaData || {},
        },
      };
    } catch (error: any) {
      logger.error("Error parsing webhook payload", error);
      return null;
    }
  }
}

export const monnifyService = new MonnifyService();





















