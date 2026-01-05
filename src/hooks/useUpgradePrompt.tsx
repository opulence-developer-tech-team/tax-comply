"use client";

import React, { useState, useCallback } from "react";
import { UpgradePrompt, UpgradePromptProps } from "@/components/shared/UpgradePrompt";

interface UseUpgradePromptReturn {
  showUpgradePrompt: (props: Omit<UpgradePromptProps, "isOpen" | "onClose">) => void;
  UpgradePromptComponent: () => React.JSX.Element | null;
}

export function useUpgradePrompt(): UseUpgradePromptReturn {
  const [promptProps, setPromptProps] = useState<Omit<UpgradePromptProps, "isOpen" | "onClose"> | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showUpgradePrompt = useCallback((props: Omit<UpgradePromptProps, "isOpen" | "onClose">) => {
    setPromptProps(props);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Clear props after exit animation completes (300ms + buffer)
    setTimeout(() => {
      setPromptProps(null);
    }, 400);
  }, []);

  const UpgradePromptComponent = useCallback(() => {
    // Always render when we have props - AnimatePresence handles the exit animation
    if (!promptProps) return null;
    
    return (
      <UpgradePrompt
        {...promptProps}
        isOpen={isOpen}
        onClose={handleClose}
      />
    );
  }, [promptProps, isOpen, handleClose]);

  return {
    showUpgradePrompt,
    UpgradePromptComponent,
  };
}

