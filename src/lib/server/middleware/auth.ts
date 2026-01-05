import { NextResponse } from "next/server";
import { utils } from "../utils";
import { MessageResponse, UserRole, AccountType } from "../utils/enum";
import { Types } from "mongoose";
import Company from "../company/entity";
import Business from "../business/entity";
import { userService } from "../user/service";
import { logger } from "../utils/logger";

export interface AuthContext {
  userId: Types.ObjectId;
  userRole: UserRole;
  companyId?: Types.ObjectId;
}

export async function requireAuth(
  request: Request,
  options?: {
    requireCompany?: boolean;
    allowedRoles?: UserRole[];
  }
): Promise<{ authorized: boolean; context?: AuthContext; response?: NextResponse }> {
  const authResult = await utils.verifyUserAuth();

  if (!authResult.valid || !authResult.userId) {
    return {
      authorized: false,
      response: authResult.response || utils.customResponse({
        status: 401,
        message: MessageResponse.Error,
        description: "Authentication required",
        data: null,
      }),
    };
  }

  const context: AuthContext = {
    userId: authResult.userId,
    userRole: authResult.userRole!,
    companyId: authResult.companyId,
  };

  // Note: companyId is no longer stored in token
  // API endpoints should accept companyId from query/body and validate user access

  return {
    authorized: true,
    context,
  };
}

/**
 * Check if user is the owner of a company
 * Replaces CompanyMember checks - only owner can access their company
 */
export async function requireOwner(
  userId: Types.ObjectId,
  companyId: Types.ObjectId
): Promise<boolean> {
  try {
    const company = await Company.findById(companyId);
    
    if (!company) {
      return false;
    }

    // User must be the owner
    return company.ownerId.toString() === userId.toString();
  } catch (error) {
    return false;
  }
}

/**
 * Check if user is the owner of a business
 * Only owner can access their business
 */
export async function requireBusinessOwner(
  userId: Types.ObjectId,
  businessId: Types.ObjectId
): Promise<boolean> {
  try {
    const business = await Business.findById(businessId);
    
    if (!business) {
      return false;
    }

    // User must be the owner
    return business.ownerId.toString() === userId.toString();
  } catch (error) {
    return false;
  }
}

/**
 * Verify that a user has the required account type
 * Used to prevent accounts from accessing features they don't have access to
 * 
 * @param userId - The user ID to check
 * @param requiredAccountType - Single account type or array of account types ("company", "individual", or "business")
 * @returns Object with allowed boolean and optional error response
 */
export async function requireAccountType(
  userId: Types.ObjectId,
  requiredAccountType: AccountType | AccountType[]
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    const user = await userService.getUserById(userId);
    
    if (!user) {
      logger.warn("Account type check failed - user not found", {
        userId: userId.toString(),
      });
      return {
        allowed: false,
        response: utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "User not found",
          data: null,
        }),
      };
    }

    if (!user.accountType) {
      logger.warn("Account type check failed - accountType is missing", {
        userId: userId.toString(),
      });
      return {
        allowed: false,
        response: utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "User account type is required",
          data: null,
        }),
      };
    }
    
    // Handle array of account types
    const allowedTypes = Array.isArray(requiredAccountType) 
      ? requiredAccountType 
      : [requiredAccountType];
    
    if (!allowedTypes.includes(user.accountType)) {
      const allowedTypesStr = allowedTypes.length === 1 
        ? allowedTypes[0] 
        : allowedTypes.join(" or ");
      logger.warn("Account type mismatch", {
        userId: userId.toString(),
        userAccountType: user.accountType,
        requiredAccountTypes: allowedTypes,
      });
      return {
        allowed: false,
        response: utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: `This feature is only available for ${allowedTypesStr} accounts. Your account type is ${user.accountType}.`,
          data: null,
        }),
      };
    }

    return { allowed: true };
  } catch (error: any) {
    logger.error("Error checking account type", error, {
      userId: userId.toString(),
    });
    return {
      allowed: false,
      response: utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "An error occurred while verifying account type",
        data: null,
      }),
    };
  }
}





