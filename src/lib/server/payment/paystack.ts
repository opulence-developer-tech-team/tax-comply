import axios from "axios";
import { logger } from "../utils/logger";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    reference: string;
    status: string;
    customer: {
      email: string;
    };
    metadata: any;
  };
}

class PaystackService {
  async initializePayment(
    email: string,
    amount: number, 
    reference: string,
    metadata?: Record<string, any>
  ): Promise<PaystackInitializeResponse> {
    try {
      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email,
          amount: Math.round(amount * 100), 
          reference,
          metadata,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/verify`,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error("Paystack initialization error", error, { email, amount, reference });
      throw new Error("Failed to initialize payment");
    }
  }

  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error("Paystack verification error", error, { reference });
      throw new Error("Failed to verify payment");
    }
  }

  async createSubscription(
    customerEmail: string,
    planCode: string,
    authorizationCode: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        "https://api.paystack.co/subscription",
        {
          customer: customerEmail,
          plan: planCode,
          authorization: authorizationCode,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error("Paystack subscription creation error", error, {
        customerEmail,
        planCode,
      });
      throw new Error("Failed to create subscription");
    }
  }

  getPublicKey(): string {
    return PAYSTACK_PUBLIC_KEY;
  }
}

export const paystackService = new PaystackService();










