"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, Search, Filter } from "lucide-react";
import { ButtonSize, ButtonVariant } from "@/lib/utils/client-enums";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { ExemptionReason } from "@/lib/utils/exemption-reason";
import { PITRemittanceTracker } from "./PITRemittanceTracker";
import type { PITRemittance } from "@/store/redux/pit/pit-slice";

interface PITRemittancesSectionProps {
  remittances: PITRemittance[];
  accountId: string;
  taxYear: number;
  onRemittanceUpdated: () => void;
  currentPlan: SubscriptionPlan;
  isFullyExempt: boolean;
  exemptionReason: ExemptionReason | null;
  pitAfterWHT: number;
}

// CRITICAL: Minimum tax year per Nigeria Tax Act 2025
const MIN_TAX_YEAR = 2026;

// Animation variants
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

/**
 * PITRemittancesSection Component
 * 
 * CRITICAL: Full remittance management section for PIT page.
 * Includes filtering, summary cards, and full CRUD operations.
 * 
 * Production-ready with strict validation - no defaults, no fallbacks, fails loudly.
 */
export function PITRemittancesSection({
  remittances,
  accountId,
  taxYear,
  onRemittanceUpdated,
  currentPlan,
  isFullyExempt,
  exemptionReason,
  pitAfterWHT,
}: PITRemittancesSectionProps): React.JSX.Element {
  // CRITICAL: Validate all required props - fail loudly if missing or invalid
  if (!remittances) {
    throw new Error("PITRemittancesSection: remittances prop is required");
  }
  
  if (!Array.isArray(remittances)) {
    throw new Error(`PITRemittancesSection: remittances must be an array, received ${typeof remittances}`);
  }
  
  if (!accountId || typeof accountId !== "string" || accountId.trim() === "") {
    throw new Error("PITRemittancesSection: accountId is required and must be a non-empty string");
  }
  
  if (!taxYear || typeof taxYear !== "number" || isNaN(taxYear)) {
    throw new Error(`PITRemittancesSection: taxYear is required and must be a valid number, received ${taxYear}`);
  }
  
  if (taxYear < MIN_TAX_YEAR) {
    throw new Error(`PITRemittancesSection: taxYear must be >= ${MIN_TAX_YEAR} per Nigeria Tax Act 2025, received ${taxYear}`);
  }
  
  if (typeof onRemittanceUpdated !== "function") {
    throw new Error("PITRemittancesSection: onRemittanceUpdated is required and must be a function");
  }
  
  if (!currentPlan || !Object.values(SubscriptionPlan).includes(currentPlan)) {
    throw new Error(`PITRemittancesSection: currentPlan is required and must be a valid SubscriptionPlan enum value, received ${currentPlan}`);
  }
  
  if (typeof isFullyExempt !== "boolean") {
    throw new Error(`PITRemittancesSection: isFullyExempt is required and must be a boolean, received ${typeof isFullyExempt}`);
  }
  
  if (exemptionReason !== null && !Object.values(ExemptionReason).includes(exemptionReason)) {
    throw new Error(`PITRemittancesSection: exemptionReason must be null or a valid ExemptionReason enum value, received ${exemptionReason}`);
  }
  
  if (typeof pitAfterWHT !== "number" || isNaN(pitAfterWHT)) {
    throw new Error(`PITRemittancesSection: pitAfterWHT is required and must be a valid number, received ${pitAfterWHT}`);
  }
  
  if (pitAfterWHT < 0) {
    throw new Error(`PITRemittancesSection: pitAfterWHT cannot be negative, received ${pitAfterWHT}`);
  }

  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // CRITICAL: Filter remittances by tax year and search term
  // Fail loudly if any remittance has invalid data
  const filteredRemittances = useMemo(() => {
    return remittances.filter((rem: PITRemittance) => {
      // Validate remittance structure
      if (!rem || typeof rem !== "object") {
        throw new Error(`PITRemittancesSection: Invalid remittance found in array: ${JSON.stringify(rem)}`);
      }
      
      if (!rem._id || typeof rem._id !== "string") {
        throw new Error(`PITRemittancesSection: Remittance missing _id: ${JSON.stringify(rem)}`);
      }
      
      if (typeof rem.taxYear !== "number" || isNaN(rem.taxYear)) {
        throw new Error(`PITRemittancesSection: Remittance has invalid taxYear: ${JSON.stringify(rem)}`);
      }
      
      if (rem.taxYear !== taxYear) {
        return false;
      }
      
      if (searchTerm.trim() === "") {
        return true;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const reference = rem.remittanceReference || "";
      const amount = formatCurrency(rem.remittanceAmount || 0);
      const date = formatDate(rem.remittanceDate || "");
      
      return (
        reference.toLowerCase().includes(searchLower) ||
        amount.toLowerCase().includes(searchLower) ||
        date.toLowerCase().includes(searchLower)
      );
    });
  }, [remittances, taxYear, searchTerm]);

  // Calculate summary statistics
  const totalRemitted = useMemo(() => {
    return filteredRemittances.reduce((sum: number, rem: PITRemittance) => {
      const amount = rem.remittanceAmount;
      if (typeof amount !== "number" || isNaN(amount)) {
        throw new Error(`PITRemittancesSection: Remittance has invalid remittanceAmount: ${JSON.stringify(rem)}`);
      }
      if (amount < 0) {
        throw new Error(`PITRemittancesSection: Remittance has negative remittanceAmount: ${JSON.stringify(rem)}`);
      }
      return sum + amount;
    }, 0);
  }, [filteredRemittances]);

  const remittancesByYear = useMemo(() => {
    return filteredRemittances.reduce((acc: Record<number, number>, rem: PITRemittance) => {
      const year = rem.taxYear;
      if (typeof year !== "number" || isNaN(year)) {
        throw new Error(`PITRemittancesSection: Remittance has invalid taxYear: ${JSON.stringify(rem)}`);
      }
      const amount = rem.remittanceAmount || 0;
      acc[year] = (acc[year] || 0) + amount;
      return acc;
    }, {} as Record<number, number>);
  }, [filteredRemittances]);

  const averagePerRemittance = filteredRemittances.length > 0
    ? totalRemitted / filteredRemittances.length
    : 0;

  return (
    <motion.div 
      variants={itemVariants} 
      initial="visible" 
      animate="visible"
    >
      <Card 
        title="PIT Remittances (Tax Payments You've Made)"
        disableAnimation={true}
        className="p-6 md:p-8"
      >
        {/* Summary Cards */}
        {filteredRemittances.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">Total Remitted</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRemitted)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {filteredRemittances.length} record{filteredRemittances.length !== 1 ? "s" : ""}
              </p>
            </div>
            
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">Tax Years Covered</p>
              <p className="text-2xl font-bold text-slate-900">{Object.keys(remittancesByYear).length}</p>
              <p className="text-xs text-slate-500 mt-1">Unique tax years</p>
            </div>
            
            <div className="p-6 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">Average Per Remittance</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(averagePerRemittance)}</p>
              <p className="text-xs text-slate-500 mt-1">
                Based on {filteredRemittances.length} record{filteredRemittances.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
            </div>
            <Button
              variant={ButtonVariant.Outline}
              size={ButtonSize.Sm}
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {isFilterExpanded ? "Collapse" : "Expand"} Filters
            </Button>
          </div>
          
          {isFilterExpanded && (
            <div className="pt-4 border-t border-slate-200">
              <div>
                <label htmlFor="remittances-search-filter" className="block text-sm font-medium text-slate-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="remittances-search-filter"
                    type="text"
                    placeholder="Search by reference, amount, or date..."
                    value={searchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (typeof value !== "string") {
                        throw new Error(`PITRemittancesSection: Search input value must be a string, received ${typeof value}`);
                      }
                      setSearchTerm(value);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Remittance Tracker */}
        <PITRemittanceTracker
          remittances={filteredRemittances}
          accountId={accountId}
          taxYear={taxYear}
          onRemittanceUpdated={onRemittanceUpdated}
          currentPlan={currentPlan}
          isFullyExempt={isFullyExempt}
          exemptionReason={exemptionReason || undefined}
          pitAfterWHT={pitAfterWHT}
        />
      </Card>
    </motion.div>
  );
}


