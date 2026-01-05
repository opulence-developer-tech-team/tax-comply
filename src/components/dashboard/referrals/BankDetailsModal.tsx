"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { X } from "lucide-react";
import { SearchableBankSelect } from "./SearchableBankSelect";

interface BankDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  banks: Array<{ code: string; name: string }>;
  bankForm: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  setBankForm: (form: any) => void;
  onSave: () => void;
  isLoading: boolean;
  onVerifyAccount: () => void;
  verifyingAccount: boolean;
  hasExistingBank: boolean; // Whether user already has a bank detail
}

export function BankDetailsModal({
  isOpen,
  onClose,
  banks,
  bankForm,
  setBankForm,
  onSave,
  isLoading,
  onVerifyAccount,
  verifyingAccount,
  hasExistingBank,
}: BankDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {hasExistingBank ? "Update Bank Details" : "Add Bank Details"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {hasExistingBank 
                ? "You can only have one bank account. Updating will replace your current bank details."
                : "You can only add one bank account for withdrawals."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Bank <span className="text-red-500">*</span>
            </label>
            <SearchableBankSelect
              banks={banks}
              value={bankForm.bankCode}
              onChange={(bankCode: string, bankName: string) => {
                setBankForm({
                  ...bankForm,
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
                value={bankForm.accountNumber}
                onChange={(e) =>
                  setBankForm({ ...bankForm, accountNumber: e.target.value })
                }
                placeholder="Enter account number"
                maxLength={10}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <Button
                onClick={onVerifyAccount}
                disabled={
                  !bankForm.accountNumber ||
                  !bankForm.bankCode ||
                  verifyingAccount
                }
                variant={ButtonVariant.Outline}
              >
                {verifyingAccount ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </div>

          {bankForm.accountName && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Account Name
              </label>
              <input
                type="text"
                value={bankForm.accountName}
                readOnly
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant={ButtonVariant.Outline} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={
                isLoading ||
                !bankForm.bankCode ||
                !bankForm.accountNumber ||
                !bankForm.accountName
              }
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              loading={isLoading}
            >
              {hasExistingBank ? "Update Bank Details" : "Save Bank Details"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

