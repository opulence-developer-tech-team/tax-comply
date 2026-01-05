"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface Referral {
  id: string;
  referredUser: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface ReferralsListProps {
  referrals: Referral[];
}

export function ReferralsList({ referrals }: ReferralsListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Referrals</h2>
        {referrals.length > 0 ? (
          <div className="space-y-3">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {referral.referredUser.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    {referral.referredUser.email}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Referred on {formatDate(referral.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">
            No referrals yet. Share your link to get started!
          </p>
        )}
      </Card>
    </motion.div>
  );
}











