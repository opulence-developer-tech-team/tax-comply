"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { Card } from "@/components/ui/Card";
import { InvoiceItemRow } from "./InvoiceItemRow";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceItemsSectionProps {
  items: InvoiceItem[];
  onUpdateItem: (index: number, field: keyof InvoiceItem, value: any) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  itemErrors?: Record<number, { description?: string; quantity?: string; unitPrice?: string }>;
}

export function InvoiceItemsSection({
  items,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  itemErrors,
}: InvoiceItemsSectionProps) {
  return (
    <Card title="What are you charging for?">
      <div className="space-y-4">
        {items.map((item, index) => (
          <InvoiceItemRow
            key={index}
            item={item}
            index={index}
            onUpdate={onUpdateItem}
            onRemove={onRemoveItem}
            canRemove={items.length > 1}
            errors={itemErrors?.[index]}
          />
        ))}
        <div className="pt-4">
          <Button type="button" variant={ButtonVariant.Outline} onClick={onAddItem}>
            + Add Item
          </Button>
        </div>
      </div>
    </Card>
  );
}





















