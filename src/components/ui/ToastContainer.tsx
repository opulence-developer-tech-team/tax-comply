"use client";

import React from "react";
import { useToast, Toast } from "@/hooks/useToast";
import { Alert } from "./Alert";

import { AlertVariant, ToastType } from "@/lib/utils/client-enums";

const variantMap: Record<ToastType, AlertVariant> = {
  [ToastType.Success]: AlertVariant.Success,
  [ToastType.Error]: AlertVariant.Error,
  [ToastType.Warning]: AlertVariant.Warning,
  [ToastType.Info]: AlertVariant.Info,
};

export function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="min-w-[300px] max-w-md">
          <Alert
            variant={variantMap[toast.type]}
            onClose={() => removeToast(toast.id)}
          >
            {toast.message}
          </Alert>
        </div>
      ))}
    </div>
  );
}





















