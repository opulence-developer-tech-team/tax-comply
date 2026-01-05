"use client";

import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { companyActions } from "@/store/redux/company/company-slice";
import { Building2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function CompanySelector() {
  const dispatch = useAppDispatch();
  const { companies, selectedCompanyId, isLoading } = useAppSelector((state) => state.company);
  const [isOpen, setIsOpen] = useState(false);

  const selectedCompany = companies.find(b => b._id === selectedCompanyId);

  if (isLoading || companies.length === 0) {
    return null;
  }

  // Don't show selector if user only has one company
  if (companies.length <= 1) {
    return null;
  }

  const handleSelectCompany = (companyId: string) => {
    dispatch(companyActions.setSelectedCompanyId(companyId));
    setIsOpen(false);
    // Invalidate other caches that depend on companyId
    // This will trigger refetches in pages that use companyId
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
      >
        <Building2 className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-medium text-slate-900">
          {selectedCompany?.name || "Select Company"}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto"
            >
              <div className="p-2">
                {companies.map((company) => (
                  <button
                    key={company._id}
                    onClick={() => handleSelectCompany(company._id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCompanyId === company._id
                        ? "bg-emerald-50 text-emerald-900 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">{company.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}















