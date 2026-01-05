"use client";

import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { Check, UserPlus, Users, Calculator } from "lucide-react";

interface EmployeeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeGuideModal({ isOpen, onClose }: EmployeeGuideModalProps) {
  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Management Guide"
      subtitle="How to manage your team and prepare for payroll"
      actionLabel="I'm Ready to Add Staff"
    >
      {/* Concept */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
            Your Digital Staff List
        </h3>
        <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-emerald-900 leading-relaxed text-base">
            Think of this page as your official staff register. 
            You must list everyone who works for you here so that you can pay them (Payroll) and deduct the correct tax (PAYE).
          </p>
        </div>
      </div>

      {/* Steps Visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <UserPlus className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">1. Add Staff</h4>
          <p className="text-xs text-slate-500">Enter their name, email, and salary.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">2. Build List</h4>
          <p className="text-xs text-slate-500">See everyone in one place.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <Calculator className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">3. Run Payroll</h4>
          <p className="text-xs text-slate-500">We use this list to calculate taxes.</p>
        </div>
      </div>

        {/* Why it matters */}
        <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
            What You Need To Enter
        </h3>
        <ul className="space-y-3">
          <li className="flex gap-3 items-start">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 text-sm">Full Name</span>
              <p className="text-slate-600 text-xs">As it appears on their ID.</p>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 text-sm">Gross Salary</span>
              <p className="text-slate-600 text-xs">The total amount you agreed to pay them per year or month (before tax).</p>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
              <span className="font-semibold text-slate-900 text-sm">Start Date</span>
              <p className="text-slate-600 text-xs">When they officially joined your company.</p>
            </div>
          </li>
        </ul>
      </div>
    </LuxuryGuideModal>
  );
}
