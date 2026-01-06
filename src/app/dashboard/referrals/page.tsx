"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { ButtonVariant } from "@/lib/utils/client-enums";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { referralsActions } from "@/store/redux/referrals/referrals-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/Button";
import { Plus, ArrowRight, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { ReferralHeader } from "@/components/dashboard/referrals/ReferralHeader";
import { ReferralLinkCard } from "@/components/dashboard/referrals/ReferralLinkCard";
import { ReferralSummaryCards } from "@/components/dashboard/referrals/ReferralSummaryCards";
import { ReferralsList } from "@/components/dashboard/referrals/ReferralsList";
import { EarningsHistory } from "@/components/dashboard/referrals/EarningsHistory";
import { WithdrawalsHistory } from "@/components/dashboard/referrals/WithdrawalsHistory";
import { SavedBankDetails, SavedBankDetail } from "@/components/dashboard/referrals/SavedBankDetails";
import { WithdrawModal } from "@/components/dashboard/referrals/WithdrawModal";
import { BankDetailsModal } from "@/components/dashboard/referrals/BankDetailsModal";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { ReferralGuideModal } from "@/components/dashboard/referrals/ReferralGuideModal";


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function ReferralsPage() {
  const dispatch = useAppDispatch();
  
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "ReferralsPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "ReferralsPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `ReferralsPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }
  
  // Redux state
  const {
    referralId,
    referralLink,
    referrals,
    earnings,
    withdrawals,
    summary,
    earningsPage: reduxEarningsPage,
    withdrawalsPage: reduxWithdrawalsPage,
    hasFetched,
    isLoading,
    error,
  } = useAppSelector((state: any) => state.referrals);

  const { isLoading: isLoadingBanks, sendHttpRequest: fetchBanksReq } = useHttp();
  const { isLoading: isLoadingWithdraw, sendHttpRequest: withdrawReq } = useHttp();
  const { isLoading: isLoadingBankDetails, sendHttpRequest: saveBankDetailsReq } = useHttp();
  const { sendHttpRequest: fetchBankDetailsReq } = useHttp();
  const { sendHttpRequest: fetchDashboardReq } = useHttp();
  const { sendHttpRequest: deleteBankDetailsReq } = useHttp();
  const { sendHttpRequest: verifyAccountReq } = useHttp();
  
  const [copiedLink, setCopiedLink] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [bankDetails, setBankDetails] = useState<SavedBankDetail[]>([]);

  // Form state for withdrawal
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    bankCode: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  // Form state for bank details
  const [bankForm, setBankForm] = useState({
    bankCode: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Fetch dashboard data with caching
  const fetchDashboard = useCallback(() => {
    // Don't fetch if already loading
    if (isLoading) return;

    const params = new URLSearchParams({
      earningsPage: reduxEarningsPage.toString(),
      earningsLimit: "50",
      withdrawalsPage: reduxWithdrawalsPage.toString(),
      withdrawalsLimit: "50",
    });

    dispatch(referralsActions.setLoading(true));
    dispatch(referralsActions.setError(null));

    fetchDashboardReq({
      successRes: (response: any) => {
        const data = response?.data?.data;
        if (data) {
          dispatch(referralsActions.setReferralData({
            referralId: data.referralId,
            referralLink: data.referralLink,
            referrals: data.referrals || [],
            earnings: data.earnings || { data: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } },
            withdrawals: data.withdrawals || { data: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } },
            summary: data.summary || {
              totalReferrals: 0,
              totalEarnings: 0,
              availableBalance: 0,
              totalWithdrawn: 0,
              pendingEarnings: 0,
            },
          }));
        }
      },
      errorRes: (errorResponse: any) => {
        dispatch(referralsActions.setError(
          errorResponse?.data?.description || "Failed to fetch referral dashboard"
        ));
        return true;
      },
      requestConfig: {
        url: `/referral/dashboard?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [reduxEarningsPage, reduxWithdrawalsPage, isLoading, dispatch, fetchDashboardReq]);

  // Fetch banks
  const fetchBanks = () => {
    fetchBanksReq({
      successRes: (response: any) => {
        setBanks(response?.data?.data || []);
      },
      errorRes: () => true,
      requestConfig: {
        url: "/banks",
        method: HttpMethod.GET,
      },
    });
  };

  // Fetch bank details
  const fetchBankDetails = () => {
    fetchBankDetailsReq({
      successRes: (response: any) => {
        const details = response?.data?.data || [];
        setBankDetails(details);
      },
      errorRes: () => true,
      requestConfig: {
        url: "/referral/bank-details",
        method: HttpMethod.GET,
      },
    });
  };

  // Fetch dashboard data only if not already fetched or if pagination changed
  // CRITICAL: Refetch when pagination changes (hasFetched is reset to false)
  useEffect(() => {
    // Don't fetch if we already have data for current pagination
    if (hasFetched) {
      return;
    }
    
    // Don't fetch if already loading (prevents duplicate requests)
    // Note: When pagination changes, hasFetched is set to false, so this will trigger
    // a refetch on the next render cycle after isLoading becomes false
    if (isLoading) {
      return;
    }
    
    // Fetch data for current pagination
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFetched, reduxEarningsPage, reduxWithdrawalsPage, isLoading]);

  // Fetch banks and bank details on mount (these don't need caching)
  useEffect(() => {
    fetchBanks();
    fetchBankDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Copy referral link
  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Save bank details
  const handleSaveBankDetails = () => {
    if (!bankForm.bankCode || !bankForm.bankName || !bankForm.accountNumber || !bankForm.accountName) {
      toast.error("Please fill all bank details");
      return;
    }

    saveBankDetailsReq({
      successRes: () => {
        toast.success(bankDetails.length > 0 ? "Bank details updated successfully!" : "Bank details saved successfully!");
        setShowBankDetailsModal(false);
        setBankForm({
          bankCode: "",
          bankName: "",
          accountNumber: "",
          accountName: "",
        });
        fetchBankDetails();
      },
      errorRes: (error: any) => {
        toast.error(error?.data?.description || "Failed to save bank details");
        return true;
      },
      requestConfig: {
        url: "/referral/bank-details",
        method: HttpMethod.POST,
        body: bankForm,
      },
    });
  };

  // Delete bank details
  const handleDeleteBankDetails = (id: string) => {
    if (!confirm("Are you sure you want to delete this bank account?")) {
      return;
    }

    deleteBankDetailsReq({
      successRes: () => {
        toast.success("Bank account deleted successfully!");
        fetchBankDetails();
      },
      errorRes: (error: any) => {
        toast.error(error?.data?.description || "Failed to delete bank account");
        return true;
      },
      requestConfig: {
        url: `/referral/bank-details/${id}`,
        method: HttpMethod.DELETE,
      },
    });
  };

  // Handle withdrawal
  const handleWithdraw = () => {
    // CRITICAL: Frontend validation - check bank details exist
    // This provides immediate feedback, but backend is the source of truth
    if (bankDetails.length === 0) {
      toast.error("You must add bank details before withdrawing. Please add your bank account first.");
      setShowWithdrawModal(false);
      setShowBankDetailsModal(true);
      return;
    }

    if (!withdrawForm.amount || !withdrawForm.bankCode || !withdrawForm.accountNumber || !withdrawForm.accountName) {
      toast.error("Please fill all withdrawal details");
      return;
    }

    const amount = parseFloat(withdrawForm.amount);
    if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }

    // CRITICAL: Validate minimum withdrawal amount
    if (amount < 1000) {
      toast.error("Minimum withdrawal amount is ₦1,000");
      return;
    }

    // CRITICAL: Validate account number format
    const normalizedAccountNumber = withdrawForm.accountNumber.trim().replace(/\s/g, "");
    if (!/^\d{10}$/.test(normalizedAccountNumber)) {
      toast.error("Account number must be exactly 10 digits");
      return;
    }

    // CRITICAL: Validate that withdrawal bank details match saved bank details
    const savedBank = bankDetails[0];
    if (
      savedBank.bankCode !== withdrawForm.bankCode.trim() ||
      savedBank.accountNumber !== normalizedAccountNumber
    ) {
      toast.error("Withdrawal bank details must match your saved bank account. Please use your saved bank details or update them first.");
      return;
    }

    withdrawReq({
      successRes: () => {
        toast.success("Withdrawal initiated successfully!");
        setShowWithdrawModal(false);
        setWithdrawForm({
          amount: "",
          bankCode: "",
          bankName: "",
          accountNumber: "",
          accountName: "",
        });
        // Invalidate cache and refetch
        dispatch(referralsActions.invalidateCache());
        fetchDashboard();
      },
      errorRes: (error: any) => {
        toast.error(error?.data?.description || "Failed to initiate withdrawal");
        return true;
      },
      requestConfig: {
        url: "/referral/withdraw",
        method: HttpMethod.POST,
        body: {
          amount,
          bankCode: withdrawForm.bankCode.trim(),
          bankName: withdrawForm.bankName.trim(),
          accountNumber: normalizedAccountNumber, // Use normalized account number
          accountName: withdrawForm.accountName.trim(),
        },
      },
    });
  };

  // Handle page changes
  const handleEarningsPageChange = (page: number) => {
    dispatch(referralsActions.setEarningsPage(page));
  };

  const handleWithdrawalsPageChange = (page: number) => {
    dispatch(referralsActions.setWithdrawalsPage(page));
  };

  // Refresh handler
  const handleRefresh = () => {
    dispatch(referralsActions.invalidateCache());
    fetchDashboard();
  };

  if (isLoading && !hasFetched) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Loading referral dashboard..." />
      </div>
    );
  }

  const summaryData = summary || {
    totalReferrals: 0,
    totalEarnings: 0,
    availableBalance: 0,
    totalWithdrawn: 0,
    pendingEarnings: 0,
  };

  return (
    <RouteGuard requireAccountType={[AccountType.Company, AccountType.Individual, AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading referrals...">
      <div className="min-h-screen bg-gray-50 py-4 px-3 md:py-8 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <ReferralHeader />
             <Button 
               variant={ButtonVariant.Outline} 
               onClick={() => setIsGuideOpen(true)}
               className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 self-start md:self-center whitespace-nowrap"
             >
               <HelpCircle className="w-4 h-4" />
               How Referrals Work
             </Button>
          </div>

          <ReferralGuideModal 
            isOpen={isGuideOpen}
            onClose={() => setIsGuideOpen(false)}
            referralLink={`${process.env.NEXT_PUBLIC_APP_URL || "https://taxcomply.com.ng"}/sign-up/${user?.email?.split('@')[0]}`}
          />

          {/* Referral Link Card */}
          <ReferralLinkCard
            referralLink={`${process.env.NEXT_PUBLIC_APP_URL || "https://taxcomply.com.ng"}/sign-up/${user?.email?.split('@')[0]}`}
            copied={copiedLink}
            onCopy={() => {
              const link = `${process.env.NEXT_PUBLIC_APP_URL || "https://taxcomply.com.ng"}/sign-up/${user?.email?.split('@')[0]}`;
              navigator.clipboard.writeText(link);
              setCopiedLink(true);
              toast.success("Referral link copied to clipboard!");
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            email={user?.email}
          />

          {/* Summary Cards */}
          <ReferralSummaryCards summary={summaryData} />

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              onClick={() => setShowBankDetailsModal(true)}
              variant={ButtonVariant.Outline}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              {bankDetails.length > 0 ? "Update Bank Details" : "Add Bank Details"}
            </Button>
            <Button
              onClick={() => {
                // CRITICAL: Require bank details before allowing withdrawal
                if (bankDetails.length === 0) {
                  toast.error("Please add a bank account before withdrawing");
                  setShowBankDetailsModal(true);
                  return;
                }
                setShowWithdrawModal(true);
              }}
              disabled={summaryData.availableBalance < 1000 || bankDetails.length === 0}
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            >
              <ArrowRight className="w-4 h-4" />
              Withdraw Earnings
            </Button>
          </motion.div>

          {/* Saved Bank Details */}
          <SavedBankDetails
            bankDetails={bankDetails}
            onDelete={handleDeleteBankDetails}
            isLoading={isLoadingBankDetails}
          />

          {/* Referrals List */}
          {referrals && referrals.length > 0 && (
            <ReferralsList referrals={referrals} />
          )}

          {/* Earnings History */}
          {earnings && (
            <EarningsHistory
              earnings={earnings.data || []}
              pagination={earnings.pagination}
              onPageChange={handleEarningsPageChange}
            />
          )}

          {/* Withdrawals History */}
          {withdrawals && (
            <WithdrawalsHistory
              withdrawals={withdrawals.data || []}
              pagination={withdrawals.pagination}
              onPageChange={handleWithdrawalsPageChange}
            />
          )}

          {/* Next Step Navigation */}
          <NextStepCard
            title="Return to Dashboard"
            description="Finished managing your referrals? Return to the main dashboard."
            href="/dashboard"
            actionLabel="Go to Dashboard"
          />
        </motion.div>

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <WithdrawModal
            isOpen={showWithdrawModal}
            onClose={() => setShowWithdrawModal(false)}
            availableBalance={summaryData.availableBalance}
            banks={banks}
            bankDetails={bankDetails}
            withdrawForm={withdrawForm}
            setWithdrawForm={setWithdrawForm}
            onWithdraw={handleWithdraw}
            isLoading={isLoadingWithdraw}
            onVerifyAccount={() => {
              if (!withdrawForm.accountNumber || !withdrawForm.bankCode) {
                toast.error("Please select a bank and enter account number");
                return;
              }
              setVerifyingAccount(true);
              verifyAccountReq({
                successRes: (response: any) => {
                  const accountName = response?.data?.data?.accountName;
                  if (accountName) {
                    setWithdrawForm((prev) => ({ ...prev, accountName }));
                    toast.success("Account verified!");
                  }
                  setVerifyingAccount(false);
                },
                errorRes: (error: any) => {
                  toast.error(error?.data?.description || "Failed to verify account");
                  setVerifyingAccount(false);
                  return true;
                },
                requestConfig: {
                  url: `/banks/verify-account?accountNumber=${withdrawForm.accountNumber}&bankCode=${withdrawForm.bankCode}`,
                  method: HttpMethod.GET,
                },
              });
            }}
            verifyingAccount={verifyingAccount}
          />
        )}

        {/* Bank Details Modal */}
        {showBankDetailsModal && (
          <BankDetailsModal
            isOpen={showBankDetailsModal}
            onClose={() => setShowBankDetailsModal(false)}
            banks={banks}
            bankForm={bankForm}
            setBankForm={setBankForm}
            onSave={handleSaveBankDetails}
            isLoading={isLoadingBankDetails}
            hasExistingBank={bankDetails.length > 0}
            onVerifyAccount={() => {
              if (!bankForm.accountNumber || !bankForm.bankCode) {
                toast.error("Please select a bank and enter account number");
                return;
              }
              setVerifyingAccount(true);
              verifyAccountReq({
                successRes: (response: any) => {
                  const accountName = response?.data?.data?.accountName;
                  if (accountName) {
                    setBankForm((prev) => ({ ...prev, accountName }));
                    toast.success("Account verified!");
                  }
                  setVerifyingAccount(false);
                },
                errorRes: (error: any) => {
                  toast.error(error?.data?.description || "Failed to verify account");
                  setVerifyingAccount(false);
                  return true;
                },
                requestConfig: {
                  url: `/banks/verify-account?accountNumber=${bankForm.accountNumber}&bankCode=${bankForm.bankCode}`,
                  method: HttpMethod.GET,
                },
              });
            }}
            verifyingAccount={verifyingAccount}
          />
        )}
      </div>
    </RouteGuard>
  );
}
