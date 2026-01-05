"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { X, HelpCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountType } from "@/lib/utils/account-type";

interface DashboardGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountType: AccountType;
}

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300 }
  },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

export function DashboardGuideModal({ isOpen, onClose, accountType }: DashboardGuideModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const content = getGuideContent(accountType);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <HelpCircle className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-950">How This Page Works</h2>
                <p className="text-sm text-emerald-700">A simple guide to your dashboard</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-8">
            {/* Section 1: What is this? */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">1</span>
                What is this page?
              </h3>
              <p className="text-base text-slate-600 leading-relaxed pl-8">
                {content.whatIsThis}
              </p>
            </section>

            {/* Section 2: What should I do? */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">2</span>
                What should I do here?
              </h3>
              <ul className="space-y-3 pl-8">
                {content.whatToDo.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Section 3: Why it matters */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">3</span>
                Why does this matter?
              </h3>
              <p className="text-base text-slate-600 leading-relaxed pl-8">
                {content.whyItMatters}
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <Button 
              onClick={onClose}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-lg text-lg py-6"
            >
              Okay, I Understand
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

function getGuideContent(type: AccountType) {
  switch (type) {
    case AccountType.Individual:
      return {
        whatIsThis: "This is your personal tax command center. It shows you exactly how much money you’ve made, how much you’ve spent, and if you owe any tax.",
        whatToDo: [
          "Check 'My Tax Summary' to see if you are compliant.",
          "Click 'Money I Earned' to record any salary or external income.",
          "Click 'Money I Spent' to log expenses that can lower your tax."
        ],
        whyItMatters: "Keeping this updated means you won't get into trouble with the tax office, and you might even pay less tax legally!"
      };
    case AccountType.Company: // For Limited Companies (CIT)
      return {
        whatIsThis: "This is the main control room for your company's taxes. It tracks your VAT, Company Income Tax, and other obligations automatically.",
        whatToDo: [
          "Check your 'Compliance Score' to see if your company is safe.",
          "Go to 'Invoices' to record every sale you make.",
          "Go to 'Expenses' to record every cost your business pays."
        ],
        whyItMatters: "If you don't track this, your company could face heavy fines. We make sure you always know what to pay and when."
      };
    case AccountType.Business: // For Sole Proprietorships (PIT)
      return {
        whatIsThis: "This is the dashboard for your business finances. Since you are a sole proprietor, your business tax is linked to you personally.",
        whatToDo: [
          "Monitor your 'Turnover' (Total Sales) to see if you need to register for VAT.",
          "Record every invoice you send to customers.",
          "Log business expenses to reduce your taxable income."
        ],
        whyItMatters: "Accurate records prevent overpaying taxes. We help you separate your business money from your personal money for clear tax filing."
      };
    default:
      return {
        whatIsThis: "This is your financial overview.",
        whatToDo: ["Track your income.", "Track your expenses."],
        whyItMatters: "It helps you stay organized."
      };
  }
}
