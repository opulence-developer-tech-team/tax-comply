"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps {
  title?: string | React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  disableAnimation?: boolean;
}

export function Card({ title, subtitle, children, className, actions, disableAnimation = false }: CardProps) {
  const baseClassName = cn("bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow duration-300", className);
  
  if (disableAnimation) {
    return (
      <div className={baseClassName}>
        {(title || subtitle || actions) && (
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
              {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        )}
        <div>{children}</div>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={baseClassName}
    >
      {(title || subtitle || actions) && (
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  );
}
