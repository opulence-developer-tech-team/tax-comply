import { Types } from "mongoose";
import mongoose from "mongoose";
import { Referral, ReferralEarning, ReferralWithdrawal, UserBankDetails } from "./entity";
import { IReferral, IReferralEarning, IReferralWithdrawal, IUserBankDetails } from "./interface";
import { calculateReferralCommission, REFERRAL_CONFIG } from "./config";
import { logger } from "../utils/logger";
import User from "../user/entity";
import { ReferralStatus } from "../utils/referral-status";
import { WithdrawalStatus } from "../utils/withdrawal-status";

class ReferralService {
  /**
   * Generate a unique referralId from email prefix
   * Format: email prefix (before @) in lowercase, sanitized
   */
  public generateReferralId(email: string): string {
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email format");
    }
    const emailPrefix = email.split("@")[0].toLowerCase();
    // Remove any special characters, keep only alphanumeric
    return emailPrefix.replace(/[^a-z0-9]/g, "");
  }

  /**
   * Ensure referralId is unique by appending a number if needed
   * OPTIMIZED: Uses findOne with projection to reduce data transfer
   */
  public async ensureUniqueReferralId(baseReferralId: string): Promise<string> {
    if (!baseReferralId || baseReferralId.length === 0) {
      throw new Error("Base referralId cannot be empty");
    }

    let referralId = baseReferralId;
    let counter = 1;
    const maxAttempts = 1000; // Prevent infinite loops

    // Use projection to only fetch _id, reducing data transfer
    while (counter < maxAttempts && await User.findOne({ referralId }).select("_id").lean()) {
      referralId = `${baseReferralId}${counter}`;
      counter++;
    }

    if (counter >= maxAttempts) {
      throw new Error("Unable to generate unique referralId after maximum attempts");
    }

    return referralId;
  }

  /**
   * Find user by referralId
   * OPTIMIZED: Uses lean() for read-only queries
   */
  public async findUserByReferralId(referralId: string) {
    if (!referralId || referralId.trim().length === 0) {
      return null;
    }
    return await User.findOne({ referralId: referralId.toLowerCase().trim() }).lean();
  }

  /**
   * Create referral relationship
   * FIXED: Added duplicate check and proper error handling
   * FIXED: Uses transaction to prevent race conditions
   */
  public async createReferral(
    referrerId: Types.ObjectId,
    referredUserId: Types.ObjectId,
    referralId: string
  ): Promise<IReferral> {
    // Validate inputs
    if (!Types.ObjectId.isValid(referrerId) || !Types.ObjectId.isValid(referredUserId)) {
      throw new Error("Invalid user IDs provided");
    }

    if (referrerId.equals(referredUserId)) {
      throw new Error("User cannot refer themselves");
    }

    // Check if referral already exists (pre-check before transaction)
    const existing = await Referral.findOne({ referredUserId }).lean();
    if (existing) {
      logger.warn("Referral already exists", {
        referrerId: referrerId.toString(),
        referredUserId: referredUserId.toString(),
      });
      return existing;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Double-check within transaction (handle race condition)
      const existingInTx = await Referral.findOne({ referredUserId }).session(session).lean();
      if (existingInTx) {
        await session.abortTransaction();
        return existingInTx;
      }

      const referral = new Referral({
        referrerId,
        referredUserId,
        referralId: referralId.toLowerCase().trim(),
      });

      await referral.save({ session });
      await session.commitTransaction();

      return referral.toObject();
    } catch (error: any) {
      await session.abortTransaction();
      
      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        const existing = await Referral.findOne({ referredUserId }).lean();
        if (existing) {
          return existing;
        }
      }
      
      logger.error("Error creating referral", error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get referral relationship by referred user
   * OPTIMIZED: Uses lean() for read-only query
   */
  public async getReferralByReferredUser(referredUserId: Types.ObjectId): Promise<IReferral | null> {
    const referral = await Referral.findOne({ referredUserId }).lean();
    return referral;
  }

  /**
   * Get all referrals for a referrer
   * OPTIMIZED: Uses lean() and limits populated fields
   */
  public async getReferralsByReferrer(referrerId: Types.ObjectId): Promise<IReferral[]> {
    const referrals = await Referral.find({ referrerId })
      .populate("referredUserId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();
    return referrals;
  }

  /**
   * Create referral earning when subscription payment is successful
   * FIXED: Added duplicate check to prevent double-earning
   */
  public async createReferralEarning(
    referrerId: Types.ObjectId,
    referredUserId: Types.ObjectId,
    subscriptionId: Types.ObjectId,
    paymentId: Types.ObjectId,
    subscriptionPlan: string,
    subscriptionAmount: number
  ): Promise<IReferralEarning> {
    // Validate inputs
    if (!Types.ObjectId.isValid(referrerId) || !Types.ObjectId.isValid(referredUserId)) {
      throw new Error("Invalid user IDs provided");
    }

    if (subscriptionAmount <= 0) {
      throw new Error("Subscription amount must be greater than zero");
    }

    // Check if earning already exists for this payment (idempotency)
    // Do this BEFORE transaction to avoid unnecessary transaction overhead
    const existing = await ReferralEarning.findOne({ paymentId }).lean();
    if (existing) {
      logger.warn("Referral earning already exists for payment", {
        paymentId: paymentId.toString(),
        earningId: existing._id?.toString(),
      });
      return existing;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Double-check within transaction (handle race condition)
      const existingInTx = await ReferralEarning.findOne({ paymentId }).session(session).lean();
      if (existingInTx) {
        await session.abortTransaction();
        return existingInTx;
      }

      const commissionPercentage = REFERRAL_CONFIG.COMMISSION_PERCENTAGE;
      const commissionAmount = calculateReferralCommission(subscriptionAmount);

      const earning = new ReferralEarning({
        referrerId,
        referredUserId,
        subscriptionId,
        paymentId,
        subscriptionPlan,
        subscriptionAmount,
        commissionPercentage,
        commissionAmount,
        status: ReferralStatus.Available, // Available immediately after successful payment
      });

      await earning.save({ session });
      await session.commitTransaction();

      logger.info("Referral earning created", {
        referrerId: referrerId.toString(),
        referredUserId: referredUserId.toString(),
        earningId: earning._id.toString(),
        commissionAmount,
        subscriptionPlan,
      });

      return earning.toObject();
    } catch (error: any) {
      await session.abortTransaction();
      
      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        const existing = await ReferralEarning.findOne({ paymentId }).lean();
        if (existing) {
          return existing;
        }
      }
      
      logger.error("Error creating referral earning", error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all earnings for a referrer with pagination
   * OPTIMIZED: Uses lean() for read-only query
   * OPTIMIZED: Supports pagination for large datasets
   */
  public async getEarningsByReferrer(
    referrerId: Types.ObjectId,
    options?: {
      status?: ReferralStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{ earnings: IReferralEarning[]; total: number; page: number; limit: number; pages: number }> {
    const query: any = { referrerId };
    if (options?.status) {
      query.status = options.status;
    }

    // CRITICAL: Enforce pagination limits to prevent abuse
    const { REFERRAL_CONFIG } = await import("@/lib/server/referral/config");
    const page = Math.max(
      REFERRAL_CONFIG.PAGINATION.MIN_PAGE,
      Math.min(options?.page || REFERRAL_CONFIG.PAGINATION.DEFAULT_PAGE, Number.MAX_SAFE_INTEGER)
    );
    const limit = Math.max(
      REFERRAL_CONFIG.PAGINATION.MIN_LIMIT,
      Math.min(
        options?.limit || REFERRAL_CONFIG.PAGINATION.DEFAULT_LIMIT,
        REFERRAL_CONFIG.PAGINATION.MAX_LIMIT
      )
    );
    const skip = (page - 1) * limit;

    const [earnings, total] = await Promise.all([
      ReferralEarning.find(query)
        .populate("referredUserId", "firstName lastName email")
        .populate("subscriptionId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReferralEarning.countDocuments(query),
    ]);

    return {
      earnings,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get total available balance for a referrer
   * CRITICAL FIX: Uses MongoDB aggregation instead of loading all records
   */
  public async getAvailableBalance(referrerId: Types.ObjectId): Promise<number> {
    const result = await ReferralEarning.aggregate([
      {
        $match: {
          referrerId: new Types.ObjectId(referrerId),
          status: ReferralStatus.Available,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$commissionAmount" },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get total withdrawn amount for a referrer
   * CRITICAL FIX: Uses MongoDB aggregation instead of loading all records
   */
  public async getTotalWithdrawn(referrerId: Types.ObjectId): Promise<number> {
    const result = await ReferralEarning.aggregate([
      {
        $match: {
          referrerId: new Types.ObjectId(referrerId),
          status: ReferralStatus.Withdrawn,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$commissionAmount" },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Add or update user bank details
   * CRITICAL: Users can only have ONE bank detail (always default)
   * CRITICAL FIX: Uses transaction to prevent race conditions
   * CRITICAL FIX: Deletes existing bank details before creating new one
   */
  public async saveUserBankDetails(
    userId: Types.ObjectId,
    bankData: {
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }
  ): Promise<IUserBankDetails> {
    // Validate inputs
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    if (!bankData.bankCode?.trim() || !bankData.bankName?.trim() || 
        !bankData.accountNumber?.trim() || !bankData.accountName?.trim()) {
      throw new Error("All bank details are required");
    }

    // Normalize account number (remove spaces, ensure it's numeric)
    const normalizedAccountNumber = bankData.accountNumber.trim().replace(/\s/g, "");
    if (!/^\d{10}$/.test(normalizedAccountNumber)) {
      throw new Error("Account number must be exactly 10 digits");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // CRITICAL: Users can only have ONE bank detail
      // Delete all existing bank details for this user atomically
      await UserBankDetails.deleteMany({ userId }).session(session);

      // Check if bank details already exist for this account number (different user)
      // This prevents account number conflicts across users
      const existingForAccount = await UserBankDetails.findOne({
        accountNumber: normalizedAccountNumber,
      }).session(session);

      if (existingForAccount && !existingForAccount.userId.equals(userId)) {
        await session.abortTransaction();
        throw new Error("This account number is already registered by another user");
      }

      // Create new bank detail (always default since it's the only one)
      const newBankDetails = new UserBankDetails({
        userId,
        bankCode: bankData.bankCode.trim(),
        bankName: bankData.bankName.trim(),
        accountNumber: normalizedAccountNumber,
        accountName: bankData.accountName.trim(),
        isDefault: true, // Always default since it's the only bank detail
      });

      await newBankDetails.save({ session });
      await session.commitTransaction();

      logger.info("Bank details saved (single bank detail enforced)", {
        userId: userId.toString(),
        bankDetailsId: newBankDetails._id.toString(),
      });

      return newBankDetails.toObject();
    } catch (error) {
      await session.abortTransaction();
      logger.error("Error saving bank details", error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get user bank details
   * CRITICAL: Users can only have ONE bank detail, so this returns a single item or empty array
   * OPTIMIZED: Uses lean() for read-only query
   */
  public async getUserBankDetails(userId: Types.ObjectId): Promise<IUserBankDetails[]> {
    const bankDetails = await UserBankDetails.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    // CRITICAL: Enforce single bank detail - if multiple exist (shouldn't happen), return only the first
    // This is a safety check in case of data inconsistency
    if (bankDetails.length > 1) {
      logger.warn("Multiple bank details found for user (should only be one)", {
        userId: userId.toString(),
        count: bankDetails.length,
      });
      return [bankDetails[0]]; // Return only the first one
    }
    return bankDetails;
  }

  /**
   * Get default bank details for user
   * CRITICAL: Since users can only have ONE bank detail, this is the same as getUserBankDetails[0]
   * OPTIMIZED: Uses lean() for read-only query
   */
  public async getDefaultBankDetails(userId: Types.ObjectId): Promise<IUserBankDetails | null> {
    // Since users can only have one bank detail, just get the first one
    const bankDetails = await UserBankDetails.findOne({ userId }).lean();
    return bankDetails;
  }

  /**
   * Delete user bank details
   * FIXED: Uses transaction to prevent race conditions
   */
  public async deleteUserBankDetails(
    userId: Types.ObjectId,
    bankDetailsId: Types.ObjectId
  ): Promise<boolean> {
    // Validate inputs
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(bankDetailsId)) {
      throw new Error("Invalid IDs provided");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify ownership within transaction
      const bankDetails = await UserBankDetails.findOne({
        _id: bankDetailsId,
        userId,
      }).session(session);

      if (!bankDetails) {
        await session.abortTransaction();
        throw new Error("Bank details not found or access denied");
      }

      await UserBankDetails.deleteOne({ _id: bankDetailsId }).session(session);
      await session.commitTransaction();
      
      logger.info("Bank details deleted", {
        userId: userId.toString(),
        bankDetailsId: bankDetailsId.toString(),
      });

      return true;
    } catch (error) {
      await session.abortTransaction();
      logger.error("Error deleting bank details", error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create withdrawal request
   * CRITICAL FIX: Uses transaction to ensure atomicity and prevent double-spending
   * CRITICAL FIX: Uses findOneAndUpdate with status check to prevent race conditions
   */
  public async createWithdrawal(
    userId: Types.ObjectId,
    amount: number,
    bankDetails: {
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }
  ): Promise<{ withdrawal: IReferralWithdrawal; earnings: IReferralEarning[] }> {
    // Validate inputs
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    if (typeof amount !== "number" || amount <= 0 || !isFinite(amount)) {
      throw new Error("Amount must be a positive number");
    }

    // Validate minimum withdrawal amount
    if (amount < REFERRAL_CONFIG.MIN_WITHDRAWAL_AMOUNT) {
      throw new Error(
        `Minimum withdrawal amount is ₦${REFERRAL_CONFIG.MIN_WITHDRAWAL_AMOUNT}`
      );
    }

    // Validate maximum withdrawal amount if set
    if (REFERRAL_CONFIG.MAX_WITHDRAWAL_AMOUNT && amount > REFERRAL_CONFIG.MAX_WITHDRAWAL_AMOUNT) {
      throw new Error(
        `Maximum withdrawal amount is ₦${REFERRAL_CONFIG.MAX_WITHDRAWAL_AMOUNT}`
      );
    }

    // Validate bank details
    if (!bankDetails.bankCode?.trim() || !bankDetails.bankName?.trim() ||
        !bankDetails.accountNumber?.trim() || !bankDetails.accountName?.trim()) {
      throw new Error("All bank details are required");
    }

    // CRITICAL: Validate account number format (Nigerian accounts are 10 digits)
    const normalizedAccountNumber = bankDetails.accountNumber.trim().replace(/\s/g, "");
    if (!/^\d{10}$/.test(normalizedAccountNumber)) {
      throw new Error("Account number must be exactly 10 digits");
    }

    // CRITICAL: Verify user has saved bank details before allowing withdrawal
    // This is a hard backend validation that cannot be bypassed
    const savedBankDetails = await this.getUserBankDetails(userId);
    if (!savedBankDetails || savedBankDetails.length === 0) {
      throw new Error("You must add bank details before withdrawing. Please add your bank account first.");
    }

    // CRITICAL: Validate that withdrawal bank details match saved bank details
    // This prevents users from withdrawing to unauthorized accounts
    const savedBank = savedBankDetails[0];
    if (
      savedBank.bankCode !== bankDetails.bankCode.trim() ||
      savedBank.accountNumber !== normalizedAccountNumber
    ) {
      throw new Error(
        "Withdrawal bank details must match your saved bank account. Please use your saved bank details or update them first."
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // CRITICAL: Get available balance using aggregation (fast, accurate)
      // This prevents loading all earnings into memory
      // NOTE: Aggregation pipelines with sessions require passing session as option
      const balanceResult = await ReferralEarning.aggregate([
        {
          $match: {
            referrerId: new Types.ObjectId(userId),
            status: ReferralStatus.Available,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$commissionAmount" },
          },
        },
      ]).session(session);

      const totalAvailable = balanceResult.length > 0 ? balanceResult[0].total : 0;

      if (amount > totalAvailable) {
        await session.abortTransaction();
        throw new Error("Insufficient available balance");
      }

      // CRITICAL: Process earnings in batches using compound cursor for memory efficiency
      // This prevents loading thousands of earnings into memory
      // CRITICAL FIX: Use compound cursor (createdAt + _id) to maintain FIFO order correctly
      const BATCH_SIZE = 100; // Process 100 earnings at a time
      const selectedEarningIds: Types.ObjectId[] = [];
      let remainingAmount = amount;
      let totalSelected = 0;
      let hasMore = true;
      let lastCreatedAt: Date | null = null;
      let lastEarningId: Types.ObjectId | null = null;

      // Use compound cursor-based pagination to process earnings in batches
      // This ensures proper FIFO ordering even when multiple earnings have same createdAt
      while (hasMore && remainingAmount > 0) {
        const query: any = {
          referrerId: userId,
          status: ReferralStatus.Available,
        };

        // Compound cursor: use both createdAt and _id for proper FIFO ordering
        // This handles cases where multiple earnings have the same createdAt timestamp
        if (lastCreatedAt && lastEarningId) {
          query.$or = [
            { createdAt: { $gt: lastCreatedAt } },
            {
              createdAt: lastCreatedAt,
              _id: { $gt: lastEarningId },
            },
          ];
        }

        const batch = await ReferralEarning.find(query)
          .sort({ createdAt: 1, _id: 1 }) // FIFO: oldest first, then by _id for tie-breaking
          .limit(BATCH_SIZE)
          .session(session)
          .lean();

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        // Process batch
        for (const earning of batch) {
          if (remainingAmount <= 0) {
            hasMore = false;
            break;
          }

          if (earning.commissionAmount <= remainingAmount) {
            selectedEarningIds.push(earning._id as Types.ObjectId);
            totalSelected += earning.commissionAmount;
            remainingAmount -= earning.commissionAmount;
          } else {
            // Partial withdrawal not supported - must withdraw full earning
            hasMore = false;
            break;
          }

          // Update cursor for next iteration
          // CRITICAL: createdAt is required - if missing, data is corrupted
          if (!earning.createdAt) {
            await session.abortTransaction();
            throw new Error("Earning record missing createdAt timestamp - data integrity issue");
          }
          lastCreatedAt = earning.createdAt;
          lastEarningId = earning._id as Types.ObjectId;
        }

        // If batch is smaller than BATCH_SIZE, we've reached the end
        if (batch.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      // CRITICAL: Verify we have enough earnings to cover the withdrawal
      // This check ensures we don't proceed if we couldn't find enough earnings
      if (totalSelected < amount) {
        await session.abortTransaction();
        throw new Error(
          `Insufficient earnings to complete withdrawal. Available: ₦${totalSelected.toFixed(2)}, Requested: ₦${amount.toFixed(2)}. ` +
          "Withdrawals must use complete earnings (no partial withdrawals)."
        );
      }

      // CRITICAL: Verify we didn't over-select (should never happen, but safety check)
      if (totalSelected > amount) {
        await session.abortTransaction();
        logger.error(
          "Withdrawal logic error: totalSelected exceeds amount",
          new Error("Withdrawal calculation mismatch"),
          {
            userId: userId.toString(),
            amount,
            totalSelected,
            selectedEarningIds: selectedEarningIds.map(id => id.toString()),
          }
        );
        throw new Error("Internal error: withdrawal calculation mismatch. Please try again.");
      }

      // CRITICAL: Atomically update earnings status AND withdrawalId in single operation
      // This ensures that if two withdrawals happen concurrently, only one succeeds
      // Using findOneAndUpdate pattern would be better, but updateMany with status check works
      const withdrawal = new ReferralWithdrawal({
        userId,
        amount,
        bankCode: bankDetails.bankCode.trim(),
        bankName: bankDetails.bankName.trim(),
        accountNumber: normalizedAccountNumber, // Use normalized account number
        accountName: bankDetails.accountName.trim(),
        status: WithdrawalStatus.Pending,
        referralEarningIds: selectedEarningIds,
      });

      // Save withdrawal first to get _id
      await withdrawal.save({ session });

      // CRITICAL: Atomically update earnings status AND withdrawalId in single operation
      // Only update if still available (prevents race condition)
      const updateResult = await ReferralEarning.updateMany(
        {
          _id: { $in: selectedEarningIds },
          referrerId: userId,
          status: ReferralStatus.Available, // Only update if still available (prevents race condition)
        },
        {
          $set: {
            status: ReferralStatus.Withdrawn,
            withdrawalId: withdrawal._id,
          },
        },
        { session }
      );

      // Verify all earnings were updated (prevents partial updates)
      if (updateResult.modifiedCount !== selectedEarningIds.length) {
        await session.abortTransaction();
        throw new Error("Some earnings are no longer available. Please try again.");
      }

      await session.commitTransaction();

      // Fetch updated earnings for response (outside transaction for efficiency)
      const updatedEarnings = await ReferralEarning.find({
        _id: { $in: selectedEarningIds },
      }).lean();

      logger.info("Withdrawal created", {
        userId: userId.toString(),
        amount,
        withdrawalId: withdrawal._id.toString(),
        earningsCount: selectedEarningIds.length,
        totalSelected,
      });

      return {
        withdrawal: withdrawal.toObject(),
        earnings: updatedEarnings,
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error("Error creating withdrawal", error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get withdrawal history for user with pagination
   * OPTIMIZED: Uses lean() for read-only query
   * OPTIMIZED: Supports pagination for large datasets
   */
  public async getWithdrawalsByUser(
    userId: Types.ObjectId,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ withdrawals: IReferralWithdrawal[]; total: number; page: number; limit: number; pages: number }> {
    // CRITICAL: Enforce pagination limits to prevent abuse
    const { REFERRAL_CONFIG } = await import("@/lib/server/referral/config");
    const page = Math.max(
      REFERRAL_CONFIG.PAGINATION.MIN_PAGE,
      Math.min(options?.page || REFERRAL_CONFIG.PAGINATION.DEFAULT_PAGE, Number.MAX_SAFE_INTEGER)
    );
    const limit = Math.max(
      REFERRAL_CONFIG.PAGINATION.MIN_LIMIT,
      Math.min(
        options?.limit || REFERRAL_CONFIG.PAGINATION.DEFAULT_LIMIT,
        REFERRAL_CONFIG.PAGINATION.MAX_LIMIT
      )
    );
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      ReferralWithdrawal.find({ userId })
        .populate("referralEarningIds")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReferralWithdrawal.countDocuments({ userId }),
    ]);

    return {
      withdrawals,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}

export const referralService = new ReferralService();
