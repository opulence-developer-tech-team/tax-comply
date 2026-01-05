"use client";

import { motion, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { AccountType } from "@/lib/utils/account-type";
import { ButtonSize, ButtonVariant } from "@/lib/utils/client-enums";

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

interface InvoicesCardProps {
  totalInvoices: number;
  accountType?: AccountType;
}

export function InvoicesCard({ totalInvoices, accountType }: InvoicesCardProps) {
  const router = useRouter();
  
  const targetUrl = accountType === AccountType.Business 
    ? "/dashboard/business/invoices" 
    : "/dashboard/invoices";

  return (
    <motion.div variants={itemVariants}>
      <Card title="Your Invoices" subtitle="How many you have">
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent"
          >
            {totalInvoices || 0}
          </motion.div>
          <p className="text-sm text-slate-600">Total invoices you've created</p>
          <Button
            variant={ButtonVariant.Outline}
            size={ButtonSize.Md}
            onClick={() => router.push(targetUrl)}
            className="w-full border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800 font-medium transition-all duration-200 flex items-center justify-center group"
          >
            <span>View All Invoices</span>
            <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
















