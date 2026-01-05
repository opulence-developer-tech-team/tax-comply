import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

import { AlertVariant } from "@/lib/utils/client-enums";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export function Alert({ variant = AlertVariant.Info, title, children, onClose }: AlertProps) {
  const variants = {
    success: {
      container: "bg-emerald-50 border-2 border-emerald-200 text-emerald-900",
      icon: "text-emerald-600",
      title: "text-emerald-900",
      text: "text-emerald-800",
    },
    error: {
      container: "bg-red-50 border-2 border-red-200 text-red-900",
      icon: "text-red-600",
      title: "text-red-900",
      text: "text-red-800",
    },
    warning: {
      container: "bg-amber-50 border-2 border-amber-200 text-amber-900",
      icon: "text-amber-600",
      title: "text-amber-900",
      text: "text-amber-800",
    },
    info: {
      container: "bg-blue-50 border-2 border-blue-200 text-blue-900",
      icon: "text-blue-600",
      title: "text-blue-900",
      text: "text-blue-800",
    },
  };

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const config = variants[variant];
  const IconComponent = icons[variant];

  return (
    <div className={cn("border rounded-lg p-4", config.container)}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent className={cn("w-5 h-5", config.icon)} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={cn("font-semibold mb-1.5 text-sm", config.title)}>
              {title}
            </h3>
          )}
          <div className={cn("text-sm leading-relaxed", config.text)}>
            {children}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              "ml-2 flex-shrink-0 p-1 rounded-md transition-colors",
              "opacity-60 hover:opacity-100 hover:bg-black/5",
              config.icon
            )}
            aria-label="Close alert"
            type="button"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

