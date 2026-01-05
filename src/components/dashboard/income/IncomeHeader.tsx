"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { TrendingUp, Plus } from "lucide-react";

interface IncomeHeaderProps {
  onAddClick: () => void;
  onGuideClick: () => void;
}

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
 * Income Page Header Component
 * 
 * Displays the page title, description, and primary action button.
 * Production-ready with proper accessibility and animations.
 */
export function IncomeHeader({ onAddClick, onGuideClick }: IncomeHeaderProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center space-x-3 mb-2">
            <div className="bg-emerald-100 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Track What You Earn</h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ml-0 sm:ml-12 mt-1">
             <p className="text-slate-600 text-base">Add your salary and business profit here.</p>
             <button 
                onClick={onGuideClick}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 underline decoration-dashed underline-offset-4 bg-transparent border-none p-0 cursor-pointer self-start sm:self-auto"
            >
                What is this?
            </button>
        </div>
      </div>
      <Button
        onClick={onAddClick}
        className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 w-full md:w-auto"
        aria-label="Add new income source"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Income
      </Button>
    </motion.div>
  );
}






