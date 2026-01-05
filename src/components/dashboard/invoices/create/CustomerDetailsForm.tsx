"use client";

import React from "react";
import { Input } from "@/components/ui/Input";
import { CustomerDetailsFormField } from "@/lib/utils/client-enums";
import { Card } from "@/components/ui/Card";

interface CustomerDetailsFormProps {
  values: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    customerTIN: string;
  };
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  handleChange: (field: CustomerDetailsFormField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: CustomerDetailsFormField) => () => void;
}

export function CustomerDetailsForm({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
}: CustomerDetailsFormProps) {
  return (
    <Card title="Customer Details">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Customer Name"
          type="text"
          required
          value={values.customerName}
          onChange={handleChange(CustomerDetailsFormField.CustomerName)}
          onBlur={handleBlur(CustomerDetailsFormField.CustomerName)}
          error={touched.customerName ? (errors.customerName ?? undefined) : undefined}
          placeholder="Customer or Company Name"
        />
        <Input
          label="Customer Email"
          type="email"
          value={values.customerEmail}
          onChange={handleChange(CustomerDetailsFormField.CustomerEmail)}
          onBlur={handleBlur(CustomerDetailsFormField.CustomerEmail)}
          error={touched.customerEmail ? (errors.customerEmail ?? undefined) : undefined}
          placeholder="customer@example.com"
        />
        <Input
          label="Customer Phone"
          type="tel"
          value={values.customerPhone}
          onChange={handleChange(CustomerDetailsFormField.CustomerPhone)}
          onBlur={handleBlur(CustomerDetailsFormField.CustomerPhone)}
          error={touched.customerPhone ? (errors.customerPhone ?? undefined) : undefined}
          placeholder="+234..."
        />
        <Input
          label="Customer TIN"
          type="text"
          value={values.customerTIN}
          onChange={handleChange(CustomerDetailsFormField.CustomerTIN)}
          onBlur={handleBlur(CustomerDetailsFormField.CustomerTIN)}
          error={touched.customerTIN ? (errors.customerTIN ?? undefined) : undefined}
          placeholder="Tax Identification Number (optional)"
        />
        <div className="md:col-span-2">
          <Input
            label="Customer Address"
            type="text"
            value={values.customerAddress}
            onChange={handleChange(CustomerDetailsFormField.CustomerAddress)}
            onBlur={handleBlur(CustomerDetailsFormField.CustomerAddress)}
            error={touched.customerAddress ? (errors.customerAddress ?? undefined) : undefined}
            placeholder="Full address"
          />
        </div>
      </div>
    </Card>
  );
}

