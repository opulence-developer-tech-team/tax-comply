"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState, useCallback, useEffect } from "react";
import { Calculator, ArrowRight, TrendingUp, Shield, CheckCircle2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VAT_RATE } from "@/lib/constants/tax";
import { ButtonSize, ButtonVariant } from "@/lib/utils/client-enums";

const NIGERIAN_VAT_RATE = VAT_RATE;

// ... (rest of logic remains same, just update UI)

interface CalculationResult {
  amount: number;
  vatAmount: number;
  total: number;
  isVATInclusive: boolean;
}

function calculateVAT(amount: number, isVATInclusive: boolean): CalculationResult {
  if (amount <= 0 || isNaN(amount)) {
    return { amount: 0, vatAmount: 0, total: 0, isVATInclusive };
  }

  let subtotal: number;
  let vatAmount: number;
  let total: number;

  if (isVATInclusive) {
    total = amount;
    subtotal = Math.round((total / (1 + NIGERIAN_VAT_RATE / 100)) * 100) / 100;
    vatAmount = Math.round((total - subtotal) * 100) / 100;
  } else {
    subtotal = amount;
    vatAmount = Math.round((subtotal * (NIGERIAN_VAT_RATE / 100)) * 100) / 100;
    total = Math.round((subtotal + vatAmount) * 100) / 100;
  }

  return {
    amount: subtotal,
    vatAmount,
    total,
    isVATInclusive,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function VATCalculatorSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const [amount, setAmount] = useState<string>("");
  const [isVATInclusive, setIsVATInclusive] = useState<boolean>(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);
  const [calculationCount, setCalculationCount] = useState<number>(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleCalculate = useCallback(() => {
    setError("");
    const numAmount = parseFloat(amount.replace(/,/g, ""));
    
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (numAmount > 1_000_000_000) {
      setError("Amount is too large. Please enter a value less than ₦1 billion");
      return;
    }

    const calculation = calculateVAT(numAmount, isVATInclusive);
    setResult(calculation);
    setHasCalculated(true);
    setCalculationCount((prev) => prev + 1);

    if (calculationCount >= 2) {
      setTimeout(() => {
        setShowUpgradeModal(true);
      }, 2000);
    }

    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "vat_calculated", {
        amount: numAmount,
        is_vat_inclusive: isVATInclusive,
        calculation_count: calculationCount + 1,
      });
    }
  }, [amount, isVATInclusive, calculationCount]);

  const handleReset = useCallback(() => {
    setAmount("");
    setResult(null);
    setError("");
    setHasCalculated(false);
  }, []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    if (value === "" || value === ".") {
      setAmount(value);
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setAmount(value);
    }
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCalculate();
    }
  }, [handleCalculate]);

  useEffect(() => {
    if (result && calculationCount === 1 && typeof window !== "undefined") {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "vat_first_calculation_complete", {
            amount: result.total,
          });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, calculationCount]);

  const displayAmount = amount ? formatCurrency(parseFloat(amount.replace(/,/g, "")) || 0) : "";

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-white overflow-hidden">
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-emerald-50 border-2 border-emerald-100 mb-8"
          >
            <Calculator className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Free VAT Tool</span>
          </motion.div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            VAT Calculator
          </h2>
          <p className="text-xl lg:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-light">
            VAT is {VAT_RATE}%. Do you need to charge it? Only if you sell more than ₦100 Million a year. If you do, use this tool to calculate it instantly.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Calculator Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="bg-white rounded-3xl border-2 border-emerald-100 shadow-xl p-8 lg:p-10 relative overflow-hidden">
              
              <div className="relative z-10">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                       Enter Amount (₦)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={amount}
                        onChange={handleAmountChange}
                        onKeyPress={handleKeyPress}
                        placeholder="e.g. 50000"
                        className="w-full px-4 py-4 text-lg border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-slate-900 font-semibold"
                        aria-label="Amount in Nigerian Naira"
                        aria-required="true"
                      />
                      {displayAmount && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-slate-500">
                          {displayAmount}
                        </div>
                      )}
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <X className="w-4 h-4" />
                        {error}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Is VAT already included?
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setIsVATInclusive(false)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          !isVATInclusive
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">No (Exclusive)</div>
                        <div className="text-xs text-slate-500">Add VAT to this amount</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsVATInclusive(true)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isVATInclusive
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">Yes (Inclusive)</div>
                        <div className="text-xs text-slate-500">Extract VAT from this amount</div>
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleCalculate}
                    size={ButtonSize.Lg}
                    variant={ButtonVariant.Primary}
                    className="w-full py-4 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                  >
                    Calculate Now
                  </Button>

                  {hasCalculated && (
                    <button
                      onClick={handleReset}
                      className="w-full py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Results Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-emerald-900 rounded-3xl border-2 border-emerald-700/50 shadow-2xl p-8 lg:p-10 relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                      <span className="text-sm font-semibold text-emerald-300 uppercase tracking-wide">Result</span>
                    </div>

                    <div className="space-y-6 mb-8">
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/30">
                        <div className="text-sm text-emerald-200/80 mb-2">Original Amount</div>
                        <div className="text-3xl font-bold text-white">{formatCurrency(result.amount)}</div>
                      </div>

                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-emerald-200/80">VAT (7.5%)</div>
                          <Shield className="w-5 h-5 text-emerald-300" />
                        </div>
                        <div className="text-3xl font-bold text-emerald-300">{formatCurrency(result.vatAmount)}</div>
                      </div>

                      <div className="bg-gradient-to-r from-emerald-600/40 to-emerald-500/40 backdrop-blur-sm rounded-2xl p-6 border-2 border-emerald-400/50">
                        <div className="text-sm text-emerald-200/80 mb-2">Total to Pay/Charge</div>
                        <div className="text-4xl font-bold text-white">{formatCurrency(result.total)}</div>
                      </div>
                    </div>

                    <Link href="/sign-up" className="block">
                      <Button
                        size={ButtonSize.Lg}
                        className="w-full py-4 text-lg font-bold bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl flex items-center justify-center gap-2"
                      >
                         Sign Up to Track This
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-50 rounded-3xl border-2 border-slate-200 shadow-xl p-8 lg:p-10 h-full flex items-center justify-center min-h-[400px]"
                >
                  <div className="text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <TrendingUp className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Result Appears Here</h3>
                    <p className="text-slate-600">
                      We'll show you the exact VAT amount and total.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}



