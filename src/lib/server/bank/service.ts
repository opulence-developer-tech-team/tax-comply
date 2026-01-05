import axios from "axios";
import { logger } from "../utils/logger";
import { getAllBanks, getBankByCode, BankInfo } from "./constants";

class BankService {
  /**
   * Get Monnify bearer token for API authentication
   */
  private async getMonnifyBearerToken(): Promise<string | null> {
    // Check both MONNIFY_BASEURL and MONNIFY_BASE_URL (different projects use different naming)
    const baseUrl = process.env.MONNIFY_BASEURL || process.env.MONNIFY_BASE_URL || "https://api.monnify.com";
    const apiKey = process.env.MONNIFY_API_KEY || "";
    const secretKey = process.env.MONNIFY_SECRET_KEY || process.env.MONNIFY_SECRET || "";

    if (!apiKey || !secretKey) {
      const error = new Error("Missing Monnify environment variables");
      logger.error("Missing Monnify environment variables", error);
      console.error("❌ Missing Monnify credentials: MONNIFY_API_KEY or MONNIFY_SECRET_KEY not set");
      return null;
    }

    try {
      const encodedAuth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

      const loginResponse = await axios.post(
        `${baseUrl}/api/v1/auth/login`,
        {},
        {
          headers: {
            Authorization: `Basic ${encodedAuth}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (!loginResponse.data?.responseBody?.accessToken) {
        logger.error("Failed to retrieve Monnify access token - no token in response");
        return null;
      }

      return loginResponse.data.responseBody.accessToken;
    } catch (error: any) {
      const errorMsg = error.response?.data?.responseMessage || error.message || "Unknown error";
      const err = error instanceof Error ? error : new Error(errorMsg);
      logger.error("Failed to retrieve Monnify access token", err);
      
      // Also log to console for seed script visibility
      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        console.error(`❌ Connection error: ${errorMsg}`);
        console.error("   Check your internet connection and Monnify API availability");
      } else if (error.response?.status === 401) {
        console.error(`❌ Authentication failed: Invalid Monnify credentials`);
      } else {
        console.error(`❌ Failed to get Monnify token: ${errorMsg}`);
      }
      
      return null;
    }
  }

  /**
   * Fetch all banks from Monnify API (helper method to populate constants.ts)
   * Run this once to get the latest banks list, then copy to src/lib/server/bank/constants.ts
   * 
   * Usage:
   * const result = await bankService.fetchBanksFromAPI();
   * if (result.success) {
   *   console.log(JSON.stringify(result.banks, null, 2));
   *   // Copy the output and paste into constants.ts
   * }
   */
  async fetchBanksFromAPI(): Promise<{ success: boolean; banks?: BankInfo[]; error?: string }> {
    // Check both MONNIFY_BASEURL and MONNIFY_BASE_URL (different projects use different naming)
    const baseUrl = process.env.MONNIFY_BASEURL || process.env.MONNIFY_BASE_URL || "https://api.monnify.com";

    try {
      const accessToken = await this.getMonnifyBearerToken();
      if (!accessToken) {
        return {
          success: false,
          error: "Failed to authenticate with Monnify API",
        };
      }

      // Fetch banks from Monnify
      const response = await axios.get(`${baseUrl}/api/v1/banks`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15 second timeout
      });

      if (!response.data?.responseBody || !Array.isArray(response.data.responseBody)) {
        return {
          success: false,
          error: "Invalid response format from Monnify API",
        };
      }

      const banks = response.data.responseBody;
      
      // Filter out invalid banks and map to BankInfo format
      const validBanks: BankInfo[] = banks
        .filter((bankData: any) => bankData.code && bankData.name)
        .map((bankData: any) => ({
          code: bankData.code,
          name: bankData.name.trim(),
          ...(bankData.nipBankCode && { nipBankCode: bankData.nipBankCode }),
        }));

      if (validBanks.length === 0) {
        return {
          success: false,
          error: "No valid banks found in API response",
        };
      }

      logger.info("Banks fetched from Monnify API", {
        total: validBanks.length,
        skipped: banks.length - validBanks.length,
      });

      return {
        success: true,
        banks: validBanks,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.responseMessage || error.message || "Unknown error";
      const err = error instanceof Error ? error : new Error(errorMessage);
      logger.error("Failed to fetch banks from Monnify", err);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get all banks from constants
   */
  async getAllBanks(): Promise<BankInfo[]> {
    return getAllBanks();
  }

  /**
   * Get bank by code from constants
   */
  async getBankByCode(code: string): Promise<BankInfo | null> {
    const bank = getBankByCode(code);
    return bank || null;
  }

  /**
   * Verify account number with Monnify API
   * Returns account name if valid
   */
  async verifyAccountNumber(accountNumber: string, bankCode: string): Promise<{
    valid: boolean;
    accountName?: string;
    error?: string;
  }> {
    // Check both MONNIFY_BASEURL and MONNIFY_BASE_URL (different projects use different naming)
    const baseUrl = process.env.MONNIFY_BASEURL || process.env.MONNIFY_BASE_URL || "https://api.monnify.com";

    // Validate inputs
    if (!accountNumber || !bankCode) {
      return {
        valid: false,
        error: "Account number and bank code are required",
      };
    }

    // Normalize account number (remove spaces)
    const normalizedAccountNumber = accountNumber.trim().replace(/\s+/g, "");

    if (!/^\d{10}$/.test(normalizedAccountNumber)) {
      return {
        valid: false,
        error: "Account number must be exactly 10 digits",
      };
    }

    try {
      const accessToken = await this.getMonnifyBearerToken();
      if (!accessToken) {
        return {
          valid: false,
          error: "Failed to authenticate with Monnify API",
        };
      }

      const response = await axios.get(
        `${baseUrl}/api/v1/disbursements/account/validate?accountNumber=${normalizedAccountNumber}&bankCode=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (!response.data?.responseBody) {
        return {
          valid: false,
          error: "Invalid response from bank verification API",
        };
      }

      const { accountNumber: verifiedAccountNumber, accountName, bankCode: verifiedBankCode } =
        response.data.responseBody;

      // Verify account number matches
      if (verifiedAccountNumber?.trim() !== normalizedAccountNumber) {
        return {
          valid: false,
          error: "Account number verification failed",
        };
      }

      // Verify bank code matches
      if (verifiedBankCode?.trim() !== bankCode.trim()) {
        return {
          valid: false,
          error: "Bank code does not match account number",
        };
      }

      return {
        valid: true,
        accountName: accountName?.trim() || "",
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return {
            valid: false,
            error: "Invalid bank or account number",
          };
        }

        const errorMessage =
          error.response?.data?.responseMessage || error.message || "Bank verification failed";

        return {
          valid: false,
          error: errorMessage,
        };
      }

      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Unexpected error during bank account verification", err);

      return {
        valid: false,
        error: "An unexpected error occurred during account verification",
      };
    }
  }
}

export const bankService = new BankService();

