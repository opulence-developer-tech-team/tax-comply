"use client";

import { motion, Variants } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

import { ComplianceStatus as ComplianceStatusEnum } from "@/lib/utils/compliance-status";
import { AlertSeverity } from "@/lib/utils/alert-severity";
import { ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";

interface ComplianceStatus {
  status: ComplianceStatusEnum;
  score: number;
  alerts: Array<{
    type: string;
    severity: AlertSeverity;
    message: string;
    actionRequired: string;
  }>;
}

import { AccountType } from "@/lib/utils/account-type";

interface ComplianceStatusCardProps {
  complianceStatus: ComplianceStatus;
  accountType: AccountType;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "compliant":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "at_risk":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "non_compliant":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "text-red-600";
    case "high":
      return "text-orange-600";
    case "medium":
      return "text-amber-600";
    case "low":
      return "text-emerald-600";
    default:
      return "text-slate-600";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "compliant":
      return "GOOD - Internal Status: Compliant";
    case "at_risk":
      return "WARNING - Internal Status: At Risk";
    case "non_compliant":
      return "PROBLEM - Internal Status: Not Compliant";
    default:
      return status.toUpperCase().replace("_", " ");
  }
};

export function ComplianceStatusCard({ complianceStatus, accountType }: ComplianceStatusCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card
        title="Tax Compliance Status"
        subtitle={`Last checked: ${formatDate(new Date())} - This is an internal assessment tool, not an official NRS (Nigeria Revenue Service) compliance status`}
      >
        <div className="space-y-6">
          <div className="flex items-center space-x-6">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`px-6 py-3 rounded-xl border-2 font-bold text-sm ${getStatusColor(
                complianceStatus.status
              )}`}
            >
              {getStatusLabel(complianceStatus.status)}
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${complianceStatus.score}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className={`h-3 rounded-full ${
                      complianceStatus.score >= 80
                        ? "bg-emerald-500"
                        : complianceStatus.score >= 60
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 min-w-[60px]">
                  {complianceStatus.score}/100
                </span>
              </div>
            </div>
          </div>

          {/* Show link to company/business page if compliance is not met */}
          {complianceStatus.status !== "compliant" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 pt-6 border-t border-slate-200"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-amber-50 via-emerald-50 to-white rounded-lg border-2 border-emerald-200">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Complete Your {accountType === AccountType.Business ? "Business" : "Company"} Information
                  </p>
                  <p className="text-xs text-slate-600">
                    Update your {accountType === AccountType.Business ? "business" : "company"} details including TIN and other required information to improve your compliance status.
                  </p>
                </div>
                <Link href={accountType === AccountType.Business ? "/dashboard/business" : "/dashboard/company"}>
                  <Button
                    variant={ButtonVariant.Primary}
                    className="whitespace-nowrap bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 border-0 text-white shadow-lg"
                  >
                    <span>Go to {accountType === AccountType.Business ? "Business" : "Company"}</span>
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

          {complianceStatus.alerts.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
                Things You Need to Do
              </h4>
              <div className="space-y-3">
                {complianceStatus.alerts.map((alert, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${getSeverityColor(alert.severity)} mb-1`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          What to do: {alert.actionRequired}
                        </p>
                      </div>

                      {/* Action Buttons based on Alert Type */}
                      {(alert.type === "missing_tin" || alert.type === "missing_cac") && (
                        <Link href={accountType === AccountType.Business ? "/dashboard/business" : "/dashboard/company"}>
                          <Button size={ButtonSize.Sm} variant={ButtonVariant.Outline} className="w-full sm:w-auto text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                            Update Details
                          </Button>
                        </Link>
                      )}
                      
                      {alert.type === "wht_remittance" && (
                        <Link href={accountType === AccountType.Business ? "/dashboard/business/wht" : "/dashboard/wht"}>
                          <Button size={ButtonSize.Sm} variant={ButtonVariant.Outline} className="w-full sm:w-auto text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                            Go to WHT
                          </Button>
                        </Link>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}





