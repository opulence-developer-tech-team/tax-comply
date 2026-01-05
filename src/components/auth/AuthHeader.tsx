"use client";

import React from "react";
import { motion } from "framer-motion";
import { Scale } from "lucide-react";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  logo?: boolean;
}

export function AuthHeader({ title, subtitle, logo = false }: AuthHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="text-center mb-6"
    >
      {logo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center space-x-3 mb-6"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-emerald-500/20">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col items-start">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-emerald-600 bg-clip-text text-transparent leading-tight">
              TaxComply
            </h1>
            <span className="text-xs text-emerald-600 font-medium">NG</span>
          </div>
        </motion.div>
      )}
      
      <h2 className={`${logo ? "text-2xl" : "text-2xl sm:text-3xl"} font-bold text-slate-900 mb-2 leading-tight`}>
        {title}
      </h2>
      
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto line-clamp-2"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
