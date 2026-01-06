import { motion } from "framer-motion";
import { Shield, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PrivacyConsentSectionProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  entityType: "company" | "business";
  className?: string;
}

export function PrivacyConsentSection({
  checked,
  onCheckedChange,
  entityType,
  className,
}: PrivacyConsentSectionProps) {
  const entityLabel = entityType === "company" ? "company" : "business";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.55 }}
      className={cn(
        "bg-blue-50 border-2 border-blue-200 rounded-xl p-4 md:p-5",
        className
      )}
    >
      <div className="flex items-start space-x-3">
        <Shield className="w-5 h-5 text-blue-700 mt-1 shrink-0" />
        <div className="flex-1 w-full min-w-0">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            Data Privacy & Security
          </p>
          <div className="space-y-3">
            <p className="text-sm text-blue-800 leading-relaxed">
              Your {entityLabel} information is collected for tax compliance
              purposes in accordance with NRS (Nigeria Revenue Service)
              requirements. We use this data to calculate tax obligations,
              generate invoices formatted per NRS requirements, and help you
              manage your tax compliance.
            </p>
            <div className="flex items-start space-x-3 bg-blue-100/50 p-3 rounded-lg">
              <input
                type="checkbox"
                id="data-consent"
                required
                checked={checked}
                onChange={(e) => onCheckedChange(e.target.checked)}
                className="mt-0.5 w-5 h-5 text-emerald-600 border-blue-400 rounded focus:ring-emerald-500 focus:ring-2 shrink-0 cursor-pointer"
              />
              <label
                htmlFor="data-consent"
                className="text-sm text-blue-900 cursor-pointer select-none leading-relaxed"
              >
                I understand that my {entityLabel} information (TIN, CAC,
                turnover, etc.) will be used for tax compliance purposes and
                agree to the{" "}
                <Link
                  href="/privacy-policy"
                  target="_blank"
                  className="text-emerald-700 hover:text-emerald-800 font-bold underline inline-flex items-center gap-1"
                >
                  Privacy Policy
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </label>
            </div>
            <p className="text-xs text-blue-700 italic flex items-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" />
              Your data is encrypted and secured. We never share your
              information with third parties except as required by law.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
