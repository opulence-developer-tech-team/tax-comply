import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Calculator, RefreshCw, HelpCircle } from "lucide-react";
import { ButtonVariant } from "@/lib/utils/client-enums";

interface PITHeaderProps {
  isLoading: boolean;
  hasPITTracking: boolean;
  onRefresh: () => void;
  onRecalculate: () => void;
  currentYear?: number;
  onShowGuide?: () => void;
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
 * PITHeader Component
 * 
 * Displays the page header with title, description, and action buttons.
 * Production-ready with proper loading states and accessibility.
 */
export function PITHeader({
  isLoading,
  hasPITTracking,
  onRefresh,
  onRecalculate,
  currentYear,
  onShowGuide,
}: PITHeaderProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="bg-emerald-100 p-3 rounded-2xl shrink-0 sm:mt-1">
            <Calculator className="w-8 h-8 text-emerald-700" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Personal Income Tax</h1>
              {currentYear && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold border border-emerald-200 shadow-sm shrink-0">
                  {currentYear}
                </span>
              )}
            </div>
            <p className="text-base sm:text-lg text-slate-600 mt-1 font-medium leading-normal">
              Your personal tax snapshot.
            </p>
            
            <div className="mt-4">
              <Button
                variant={ButtonVariant.Ghost}
                onClick={onShowGuide}
                className="p-0 h-auto hover:bg-transparent text-emerald-700 hover:text-emerald-800 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  <span className="text-sm sm:text-base font-semibold underline decoration-dashed underline-offset-4 group-hover:decoration-solid">
                    Explain Tax to Me
                  </span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto pt-2">
         {/* Recalculate Button */}
         <Button
          variant={ButtonVariant.Primary}
          onClick={onRecalculate}
          disabled={isLoading}
          loading={isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg shadow-emerald-200 w-full md:w-auto h-12 md:h-10"
          aria-label="Recalculate your tax"
        >
         {!isLoading && <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />}
          <span className="font-semibold">{isLoading ? "Recalculating..." : "Recalculate Tax"}</span>
        </Button>
      </div>
    </motion.div>
  );
}

