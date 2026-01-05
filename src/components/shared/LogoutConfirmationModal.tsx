"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LogOut, X } from "lucide-react";
import { ModalSize, ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
  message?: string;
}

export function LogoutConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = "Confirm Logout",
  message = "Are you sure you want to log out? You'll need to sign in again to access your account.",
}: LogoutConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={ModalSize.Sm}>
      <div className="p-6">
        <div className="flex items-start space-x-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-slate-700 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

