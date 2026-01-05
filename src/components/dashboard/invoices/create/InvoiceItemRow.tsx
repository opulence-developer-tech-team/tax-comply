"use client";

import React from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { formatCurrency } from "@/lib/utils";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceItemRowProps {
  item: InvoiceItem;
  index: number;
  onUpdate: (index: number, field: keyof InvoiceItem, value: any) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  errors?: {
    description?: string;
    quantity?: string;
    unitPrice?: string;
  };
}

export function InvoiceItemRow({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
  errors,
}: InvoiceItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-4 items-start" data-item-index={index}>
      <div className="col-span-5">
        <Input
          label="Description"
          type="text"
          required
          id={`input-description-item-${index}`}
          data-item-index={index}
          data-item-field="description"
          value={item.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          placeholder="e.g. Website Design, Consultation Hours..."
          error={errors?.description}
        />
      </div>
      <div className="col-span-2">
        <Input
          label="Qty/Hours"
          type="number"
          required
          min="1"
          id={`input-quantity-item-${index}`}
          data-item-index={index}
          data-item-field="quantity"
          value={item.quantity}
          onChange={(e) => {
            const numValue = e.target.value === "" ? 0 : Number(e.target.value);
            onUpdate(index, "quantity", numValue);
          }}
          error={errors?.quantity}
        />
      </div>
      <div className="col-span-2">
        <Input
          label="Price (₦)"
          type="number"
          required
          min="0"
          step="0.01"
          id={`input-unit-price-item-${index}`}
          data-item-index={index}
          data-item-field="unitPrice"
          value={item.unitPrice}
          onChange={(e) => {
            const numValue = e.target.value === "" ? 0 : Number(e.target.value);
            onUpdate(index, "unitPrice", numValue);
          }}
          error={errors?.unitPrice}
        />
      </div>
      <div className="col-span-2">
        <div className="text-sm font-medium text-gray-700 pt-6 pb-6">
          {formatCurrency(item.amount)}
        </div>
      </div>
      <div className="col-span-1">
        {canRemove && (
          <Button
            type="button"
            variant={ButtonVariant.Outline}
            onClick={() => onRemove(index)}
            className="mt-6"
          >
            ×
          </Button>
        )}
      </div>
    </div>
  );
}





















