"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { SearchableBankSelect } from "./SearchableBankSelect";
import { SavedBankDetail } from "./SavedBankDetails";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  banks: Array<{ code: string; name: string }>;
  bankDetails: SavedBankDetail[];
  withdrawForm: {
    amount: string;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  setWithdrawForm: (form: any) => void;
  onWithdraw: () => void;
  isLoading: boolean;
  onVerifyAccount: () => void;
  verifyingAccount: boolean;
}

export function WithdrawModal({
  isOpen,
  onClose,
  availableBalance,
  banks,
  bankDetails,
  withdrawForm,
  setWithdrawForm,
  onWithdraw,
  isLoading,
  onVerifyAccount,
  verifyingAccount,
}: WithdrawModalProps) {
  // CRITICAL: Auto-populate form with saved bank detail when modal opens
  // Since users can only have ONE bank detail, auto-fill it
  useEffect(() => {
    if (isOpen && bankDetails.length > 0 && !withdrawForm.accountNumber) {
      const savedBank = bankDetails[0]; // Only one bank detail exists
      setWithdrawForm({
        ...withdrawForm,
        bankCode: savedBank.bankCode,
        bankName: savedBank.bankName,
        accountNumber: savedBank.accountNumber,
        accountName: savedBank.accountName,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bankDetails]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Withdraw Earnings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(availableBalance)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Minimum withdrawal: ₦1,000</p>
          </div>

          {/* Show Saved Bank Account (if exists) */}
          {bankDetails.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Bank Account</p>
              <p className="font-semibold text-slate-900">{bankDetails[0].bankName}</p>
              <p className="text-sm text-slate-600">
                {bankDetails[0].accountNumber.substring(0, 4)}****
                {bankDetails[0].accountNumber.substring(8)} - {bankDetails[0].accountName}
              </p>
              <p className="text-xs text-emerald-600 mt-2">
                💡 This is your saved bank account. You can update it from the bank details section.
              </p>
            </div>
          )}

          {/* Show warning if no bank details */}
          {bankDetails.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ You need to add a bank account before withdrawing. Please add your bank details first.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={withdrawForm.amount}
              onChange={(e) =>
                setWithdrawForm({ ...withdrawForm, amount: e.target.value })
              }
              placeholder="Enter amount"
              min={1000}
              max={availableBalance}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Only show bank selection if no saved bank details */}
          {bankDetails.length === 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bank <span className="text-red-500">*</span>
                </label>
                <SearchableBankSelect
                  banks={banks}
                  value={withdrawForm.bankCode}
                  onChange={(bankCode: string, bankName: string) => {
                    setWithdrawForm({
                      ...withdrawForm,
                      bankCode,
                      bankName: bankName || "",
                    });
                  }}
                  placeholder="Search and select bank..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={withdrawForm.accountNumber}
                    onChange={(e) =>
                      setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })
                    }
                    placeholder="Enter account number"
                    maxLength={10}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <Button
                    onClick={onVerifyAccount}
                    disabled={
                      !withdrawForm.accountNumber ||
                      !withdrawForm.bankCode ||
                      verifyingAccount
                    }
                    variant={ButtonVariant.Outline}
                  >
                    {verifyingAccount ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>

              {withdrawForm.accountName && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={withdrawForm.accountName}
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant={ButtonVariant.Outline} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onWithdraw}
              disabled={
                isLoading ||
                !withdrawForm.amount ||
                !withdrawForm.bankCode ||
                !withdrawForm.accountNumber ||
                !withdrawForm.accountName ||
                parseFloat(withdrawForm.amount) < 1000 ||
                parseFloat(withdrawForm.amount) > availableBalance ||
                bankDetails.length === 0 // Disable if no bank details saved
              }
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              loading={isLoading}
            >
              Withdraw
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

