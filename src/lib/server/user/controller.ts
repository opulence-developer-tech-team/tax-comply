import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { MessageResponse, UserRole } from "../utils/enum";
import { utils } from "../utils";
import { IUserSignIn, IUserSignUp } from "./interface";
import { comparePassCode, hashPassCode } from "../utils/auth";
import { userService } from "./service";
import { authService } from "../auth/service";
import { referralService } from "../referral/service";
import { logger } from "../utils/logger";
import { Types } from "mongoose";
import { userValidator } from "./validator";

const jwtSecret = process.env.JWT_SECRET || "";

class UserController {
  public async signUp(body: IUserSignUp) {
    try {
      const userExists = await userService.userExists(body.email);

      if (userExists) {
        return utils.customResponse({
          status: 409,
          message: MessageResponse.Error,
          description: "User with this email already exists.",
          data: null,
        });
      }

      // Check if usage of referral code is valid
      if (body.referralId) {
        const referrer = await referralService.findUserByReferralId(body.referralId);
        if (!referrer) {
           return utils.customResponse({
            status: 404,
            message: MessageResponse.Error,
            description: "Invalid referral code. Please check the code and try again.",
            data: null,
          });
        }
      }

      const hashedPassword = (await hashPassCode(body.password)) as string;

      const newUser = await userService.createUser({
        ...body,
        password: hashedPassword,
      });

      const token = jwt.sign(
        {
          userId: newUser._id.toString(),
          userRole: UserRole.Owner,
        },
        jwtSecret,
        {
          expiresIn: "30d",
        }
      );

      const cookieStore = await cookies();
      cookieStore.set("user_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, 
      });

      const otpResult = await authService.generateAndSendOTP(
        newUser._id,
        newUser.email,
        newUser.firstName
      );

      if (!otpResult.success) {
        logger.warn("Account created but OTP sending failed", {
          userId: newUser._id.toString(),
          email: newUser.email,
        });
        return utils.customResponse({
          status: 201,
          message: MessageResponse.Success,
          description:
            "Account created successfully! However, we couldn't send the verification email. Please use the resend OTP feature.",
          data: {
            _id: newUser._id.toString(),
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phoneNumber: newUser.phoneNumber,
            isEmailVerified: false,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
          },
        });
      }

      return utils.customResponse({
        status: 201,
        message: MessageResponse.Success,
        description:
          "Account created successfully! Please check your email for the verification code.",
        data: {
          _id: newUser._id.toString(),
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phoneNumber: newUser.phoneNumber,
          isEmailVerified: false,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error in signup", err, { email: body.email });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to create account. Please try again.",
        data: null,
      });
    }
  }

  public async signIn(body: IUserSignIn) {
    try {
      const { password, email } = body;

      const user = await userService.findUserByEmail(email);

      if (!user) {
        return utils.customResponse({
          status: 401,
          message: MessageResponse.Error,
          description: "Invalid email or password.",
          data: null,
        });
      }

      const match = comparePassCode(password, user.password);

      if (!match) {
        return utils.customResponse({
          status: 401,
          message: MessageResponse.Error,
          description: "Invalid email or password.",
          data: null,
        });
      }

      if (!user.isEmailVerified) {
        const otpResult = await authService.generateAndSendOTP(
          user._id,
          user.email,
          user.firstName
        );

        if (!otpResult.success) {
          logger.warn("Failed to send verification email during sign-in", {
            userId: user._id.toString(),
            email: user.email,
          });
        }

        return utils.customResponse({
          status: 403,
          message: MessageResponse.VerifyEmail,
          description: "Please verify your email address to continue. A verification code has been sent to your email.",
          data: {
            requiresVerification: true,
            email: user.email,
          },
        });
      }

      // User role is always Owner (simplified - no multi-user support)
      // If user owns a company, they're an owner; otherwise they're still Owner role
      const userRole = UserRole.Owner;

      // Token payload - companyId is NOT stored in token
      // Frontend will fetch companies and send companyId in API requests
      const tokenPayload: any = {
        userId: user._id.toString(),
        userRole: userRole,
        // companyId is intentionally NOT included - fetched separately and sent in requests
      };

      const token = jwt.sign(tokenPayload, jwtSecret, {
        expiresIn: "30d",
      });

      const cookieStore = await cookies();
      cookieStore.set("user_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, 
      });

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Sign in successful.",
        data: {
          _id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          isEmailVerified: user.isEmailVerified,
          accountType: user.accountType,
          role: userRole,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error in signin", err, { email: body.email });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to sign in. Please try again.",
        data: null,
      });
    }
  }



  public async logout() {
    try {
      const cookieStore = await cookies();
      cookieStore.delete("user_auth_token");

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Logged out successfully.",
        data: null,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error in logout", err);
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to logout. Please try again.",
        data: null,
      });
    }
  }

  public async changePassword(userId: string | Types.ObjectId, body: any) {
    try {
      const validation = userValidator.changePassword(body);
      if (!validation.valid) {
        return validation.response!;
      }

      const { currentPassword, newPassword } = body;

      const user = await userService.findUserWithPasswordById(new Types.ObjectId(userId));

      if (!user) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "User not found.",
          data: null,
        });
      }

      const isMatch = await comparePassCode(currentPassword, user.password);

      if (!isMatch) {
         return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Incorrect current password.",
          data: null,
        });
      }

      const hashedPassword = (await hashPassCode(newPassword)) as string;

      await userService.updatePassword(user._id, hashedPassword);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Password changed successfully.",
        data: null, 
      });

    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error in changePassword", err);
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to change password. Please try again.",
        data: null,
      });
    }
  }
}

export const userController = new UserController();





