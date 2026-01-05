"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { ButtonVariant } from "@/lib/utils/client-enums";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppSelector } from "@/hooks/useAppSelector";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { Settings as SettingsIcon, Lock, Building2, Save, ArrowRight, Store } from "lucide-react";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { ChangePasswordForm } from "@/components/dashboard/settings/ChangePasswordForm";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

interface SettingsCardConfig {
  title: string;
  description: string;
  buttonText: string;
  href: string;
  Icon: any;
  iconColor: string;
  bgColor: string;
  buttonClass: string;
}

export default function SettingsPage() {
  const router = useRouter();
  
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "SettingsPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "SettingsPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `SettingsPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  // Helper to determine settings content based on AccountType
  const getAccountSettingsConfig = (type: AccountType): SettingsCardConfig | null => {
    switch (type) {
      case AccountType.Company:
        return {
          title: "Company Information",
          description: "Update your company information, address, and TCC details.",
          buttonText: "Go to Company Settings",
          href: "/dashboard/company",
          Icon: Building2,
          iconColor: "text-emerald-600",
          bgColor: "from-emerald-100 to-emerald-50",
          buttonClass: "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        };
      case AccountType.Business:
        return {
          title: "Business Details",
          description: "Manage your sole proprietorship business details.",
          buttonText: "Go to Business Settings",
          href: "/dashboard/business",
          Icon: Store,
          iconColor: "text-blue-600",
          bgColor: "from-blue-100 to-blue-50",
          buttonClass: "border-blue-200 text-blue-700 hover:bg-blue-50"
        };
      default:
        // Individual accounts or others do not have a dedicated settings page yet
        return null;
    }
  };

  const accountConfig = getAccountSettingsConfig(user.accountType);

  return (
    <RouteGuard requireAccountType={[AccountType.Company, AccountType.Individual, AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading settings...">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-6"
      >
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-emerald-600" />
          <h1 className="text-4xl font-bold text-slate-900">Settings</h1>
        </div>
        <p className="text-slate-600 ml-11">Manage your account and company settings</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card title="Change Password">
          <ChangePasswordForm />
        </Card>
      </motion.div>

      {/* Dynamic Company/Business Settings Card */}
      {accountConfig && (
        <motion.div variants={itemVariants}>
          <Card title={accountConfig.title}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${accountConfig.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <accountConfig.Icon className={`w-6 h-6 ${accountConfig.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-2">{accountConfig.title}</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    {accountConfig.description}
                  </p>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={ButtonVariant.Outline}
                      onClick={() => router.push(accountConfig.href)}
                      className={accountConfig.buttonClass}
                    >
                      {accountConfig.buttonText}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <NextStepCard
          title="Return to Dashboard"
          description="You've finished managing your settings. Return to the main dashboard."
          href="/dashboard"
          actionLabel="Go to Dashboard"
        />
      </motion.div>
    </motion.div>
    </RouteGuard>
  );
}
