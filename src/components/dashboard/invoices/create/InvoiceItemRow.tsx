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
    <div className="grid grid-cols-12 gap-x-2 gap-y-3 md:gap-4 items-start pb-6 md:pb-2 border-b md:border-0 border-slate-100 last:border-0" data-item-index={index}>
      <div className="col-span-12 md:col-span-5">
        <Input
          label="Description"
          type="text"
          required
          id={`input-description-item-${index}`}
          data-item-index={index}
          data-item-field="description"
          value={item.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          placeholder="e.g. Website Design"
          error={errors?.description}
        />
      </div>
      <div className="col-span-3 md:col-span-2">
        <Input
          label="Qty"
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
      <div className="col-span-4 md:col-span-2">
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
      <div className="col-span-3 md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 md:hidden mb-1">
          Total
        </label>
        <div className="text-sm font-medium text-gray-700 md:pt-9 pt-2 h-[42px] flex items-center">
          {formatCurrency(item.amount)}
        </div>
      </div>
      <div className="col-span-2 md:col-span-1 flex justify-end md:block">
        {canRemove && (
          <Button
            type="button"
            variant={ButtonVariant.Outline}
            onClick={() => onRemove(index)}
            className="md:mt-7 mt-[26px] h-[38px] w-[38px] p-0 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100"
          >
            ×
          </Button>
        )}
      </div>
    </div>
  );
}





















