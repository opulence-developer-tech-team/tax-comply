import { Types } from "mongoose";
import { businessService } from "./service";
import { IBusinessOnboarding } from "./interface";
import { utils } from "../utils";
import { MessageResponse } from "../utils/enum";
import { logger } from "../utils/logger";
import { subscriptionService } from "../subscription/service";

class BusinessController {
  public async createBusiness(
    ownerId: Types.ObjectId,
    businessData: IBusinessOnboarding
  ) {
    try {
      // Check business limit based on subscription (similar to company limit)
      const limitCheck = await subscriptionService.checkBusinessLimit(ownerId);
      if (!limitCheck.allowed) {
        const subscription = await subscriptionService.getSubscription(ownerId);
        const currentPlan = (subscription?.plan?.toLowerCase() || "free") as string;

        const requiredPlan = limitCheck.limit === 1 ? "company" : "accountant";
        const requiredPlanPrice = requiredPlan === "company" ? 8500 : 25000;
        
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: limitCheck.message || "Business limit reached",
          data: {
            currentCount: limitCheck.currentCount,
            limit: limitCheck.limit,
            upgradeRequired: {
              feature: "multiple_businesses",
              currentPlan,
              requiredPlan,
              requiredPlanPrice,
              reason: "plan_limitation" as const,
            },
          },
        });
      }

      if (businessData.businessRegistrationNumber && businessData.businessRegistrationNumber.trim()) {
        const brnExists = await businessService.businessRegistrationNumberExists(businessData.businessRegistrationNumber);
        if (brnExists) {
          return utils.customResponse({
            status: 409,
            message: MessageResponse.Error,
            description: "A business with this registration number already exists.",
            data: null,
          });
        }
      }

      if (businessData.tin && businessData.tin.trim()) {
        const tinExists = await businessService.tinExists(businessData.tin);
        if (tinExists) {
          return utils.customResponse({
            status: 409,
            message: MessageResponse.Error,
            description: "A business with this TIN already exists.",
            data: null,
          });
        }
      }

      const business = await businessService.createBusiness(ownerId, businessData);

      if (!business._id) {
        throw new Error("Business created but _id is missing");
      }

      logger.info("Business created", {
        businessId: business._id.toString(),
        ownerId: ownerId.toString(),
      });

      return utils.customResponse({
        status: 201,
        message: MessageResponse.Success,
        description: "Business created successfully.",
        data: business,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error creating business", err, { ownerId: ownerId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to create business. Please try again.",
        data: null,
      });
    }
  }

  public async getBusiness(businessId: Types.ObjectId) {
    try {
      const business = await businessService.getBusinessById(businessId);

      if (!business) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Business not found.",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Business retrieved successfully.",
        data: business,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error getting business", err, { businessId: businessId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve business.",
        data: null,
      });
    }
  }

  public async getUserBusinesses(userId: Types.ObjectId) {
    try {
      const businesses = await businessService.getBusinessesByUser(userId);

      const subscription = await subscriptionService.getSubscription(userId);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Businesses retrieved successfully.",
        data: {
          businesses,
          subscription: subscription || null,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error getting user businesses", err, { userId: userId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve businesses.",
        data: null,
      });
    }
  }

  public async updateBusiness(
    businessId: Types.ObjectId,
    updateData: Partial<IBusinessOnboarding>
  ) {
    try {
      if (updateData.businessRegistrationNumber && updateData.businessRegistrationNumber.trim()) {
        const brnExists = await businessService.businessRegistrationNumberExists(updateData.businessRegistrationNumber, businessId);
        if (brnExists) {
          return utils.customResponse({
            status: 409,
            message: MessageResponse.Error,
            description: "A business with this registration number already exists.",
            data: null,
          });
        }
      }

      if (updateData.tin && updateData.tin.trim()) {
        const tinExists = await businessService.tinExists(updateData.tin, businessId);
        if (tinExists) {
          return utils.customResponse({
            status: 409,
            message: MessageResponse.Error,
            description: "A business with this TIN already exists.",
            data: null,
          });
        }
      }

      const business = await businessService.updateBusiness(businessId, updateData);

      if (!business) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Business not found.",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Business updated successfully.",
        data: business,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error updating business", err, { businessId: businessId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to update business.",
        data: null,
      });
    }
  }
}

export const businessController = new BusinessController();



