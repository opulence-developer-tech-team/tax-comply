"use client";

import React from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { Card } from "@/components/ui/Card";

interface InvoiceSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
}

export function InvoiceSearchBar({
  searchTerm,
  onSearchChange,
  onRefresh,
}: InvoiceSearchBarProps) {
  return (
    <Card>
      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search by customer name or invoice number..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1"
        />
        <Button variant={ButtonVariant.Outline} onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    </Card>
  );
}





















