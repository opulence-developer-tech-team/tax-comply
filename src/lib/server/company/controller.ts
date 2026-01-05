import { Types } from "mongoose";
import { companyService } from "./service";
import { ICompanyOnboarding } from "./interface";
import { utils } from "../utils";
import { MessageResponse } from "../utils/enum";
import { logger } from "../utils/logger";
import { subscriptionService } from "../subscription/service";

class CompanyController {
  public async createCompany(
    ownerId: Types.ObjectId,
    companyData: ICompanyOnboarding
  ) {
    try {
      // Check company limit based on subscription
      const limitCheck = await subscriptionService.checkCompanyLimit(ownerId);
      if (!limitCheck.allowed) {
        // Get user's current plan (subscriptions are user-based)
        const subscription = await subscriptionService.getSubscription(ownerId);
        const currentPlan = (subscription?.plan?.toLowerCase() || "free") as string;

        // Determine required plan based on current limit
        // If limit is 1, they need Company (3 companies) or Accountant (unlimited)
        // If limit is 3, they need Accountant (unlimited)
        const requiredPlan = limitCheck.limit === 1 ? "company" : "accountant";
        const requiredPlanPrice = requiredPlan === "company" ? 8500 : 25000;
        
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: limitCheck.message || "Company limit reached",
          data: {
            currentCount: limitCheck.currentCount,
            limit: limitCheck.limit,
            upgradeRequired: {
              feature: "multiple_companies",
              currentPlan,
              requiredPlan,
              requiredPlanPrice,
              reason: "plan_limitation" as const,
            },
          },
        });
      }

      if (companyData.cacNumber && companyData.cacNumber.trim()) {
        const cacExists = await companyService.cacNumberExists(companyData.cacNumber);
        if (cacExists) {
          return utils.customResponse({
            status: 409,
            message: MessageResponse.Error,
            description: "A company with this CAC number already exists.",
            data: null,
          });
        }
      }

      if (companyData.tin && companyData.tin.trim()) {
        const tinExists = await companyService.tinExists(companyData.tin);
        if (tinExists) {
          return utils.customResponse({
            status: 409,
            message: MessageResponse.Error,
            description: "A company with this TIN already exists.",
            data: null,
          });
        }
      }

      // DEBUG: Log what's received from frontend
      console.log("🟢 BACKEND (Controller) - Received privacy consent data:", {
        privacyConsentGiven: companyData.privacyConsentGiven,
        privacyPolicyVersion: companyData.privacyPolicyVersion,
        type_privacyConsentGiven: typeof companyData.privacyConsentGiven,
        type_privacyPolicyVersion: typeof companyData.privacyPolicyVersion,
        fullCompanyData: JSON.stringify(companyData, null, 2),
      });

      const company = await companyService.createCompany(ownerId, companyData);

      if (!company._id) {
        throw new Error("Company created but _id is missing");
      }

      logger.info("Company created", {
        companyId: company._id.toString(),
        ownerId: ownerId.toString(),
      });

      return utils.customResponse({
        status: 201,
        message: MessageResponse.Success,
        description: "Company created successfully.",
        data: company,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error creating company", err, { ownerId: ownerId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to create company. Please try again.",
        data: null,
      });
    }
  }

  public async getCompany(companyId: Types.ObjectId) {
    try {
      const company = await companyService.getCompanyById(companyId);

      if (!company) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Company not found.",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Company retrieved successfully.",
        data: company,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error getting company", err, { companyId: companyId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve company.",
        data: null,
      });
    }
  }

  public async getUserCompanies(userId: Types.ObjectId) {
    try {
      // Get all companies where user is owner or member
      const companies = await companyService.getCompaniesByUser(userId);

      // Get user's subscription (subscriptions are user-based, not company-based)
      const subscription = await subscriptionService.getSubscription(userId);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Companies retrieved successfully.",
        data: {
          companies,
          subscription: subscription || null,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error getting user companies", err, { userId: userId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve companies.",
        data: null,
      });
    }
  }

  public async updateCompany(
    companyId: Types.ObjectId,
    updateData: Partial<ICompanyOnboarding>
  ) {
    try {
      if (updateData.cacNumber && updateData.cacNumber.trim()) {
        const cacExists = await companyService.cacNumberExists(updateData.cacNumber, companyId);
        if (cacExists) {
          return utils.customResponse({
            status: 409,
            message: MessageResponse.Error,
            description: "A company with this CAC number already exists.",
            data: null,
          });
        }
      }

      if (updateData.tin && updateData.tin.trim()) {
        const tinExists = await companyService.tinExists(updateData.tin, companyId);
        if (tinExists) {
          return utils.customResponse({
            status: 409,
            message: MessageResponse.Error,
            description: "A company with this TIN already exists.",
            data: null,
          });
        }
      }

      const company = await companyService.updateCompany(companyId, updateData);

      if (!company) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Company not found.",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Company updated successfully.",
        data: company,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error updating company", err, { companyId: companyId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to update company.",
        data: null,
      });
    }
  }
}

export const companyController = new CompanyController();


