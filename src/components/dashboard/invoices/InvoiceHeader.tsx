"use client";

import { motion } from "framer-motion";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Variants } from "framer-motion";

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

interface InvoiceHeaderProps {
  onCreateClick: () => void;
  onGuideClick: () => void;
}

export function InvoiceHeader({ onCreateClick, onGuideClick }: InvoiceHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-6"
    >
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 bg-emerald-100 rounded-xl">
            <FileText className="w-8 h-8 text-emerald-700" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Client Invoices</h1>
        </div>
        <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
          Create professional invoices. <strong className="text-emerald-700">We handle the tax math for you.</strong>
        </p>
        
        <button 
            onClick={onGuideClick}
            className="mt-4 px-5 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full text-base font-semibold transition-all border border-emerald-200 flex items-center gap-2 group shadow-sm"
          >
            <FileText className="w-5 h-5" />
            <span>How does this work?</span>
        </button>
      </div>

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0 w-full md:w-auto">
        <Button 
          onClick={onCreateClick}
          className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/30 text-lg py-4 px-8 rounded-xl h-auto"
        >
          <Plus className="w-6 h-6 mr-2" />
          New Invoice
        </Button>
      </motion.div>
    </motion.div>
  );
}











