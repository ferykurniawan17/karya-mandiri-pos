"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
  > {
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, onBlur, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Format number to currency string (1.000) - without Rp prefix and decimals
    const formatCurrency = (val: string | number): string => {
      const numValue =
        typeof val === "string" ? parseFloat(val) || 0 : val || 0;
      if (numValue === 0) return "0";
      // Format without currency symbol and without decimals
      return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);
    };

    // Parse input to number string
    const parseToNumber = (input: string): string => {
      // Remove all non-digit except comma and dot
      let cleaned = input.replace(/[^\d,.-]/g, "");
      // Replace comma with dot for decimal
      cleaned = cleaned.replace(",", ".");
      // Remove multiple dots, keep only the last one
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = parts[0] + "." + parts.slice(1).join("");
      }
      const numValue = parseFloat(cleaned) || 0;
      return numValue.toFixed(2);
    };

    // Initialize display value from prop
    React.useEffect(() => {
      if (!isFocused) {
        const numValue =
          typeof value === "string" ? parseFloat(value) || 0 : value || 0;
        setDisplayValue(formatCurrency(numValue));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Remove Rp prefix and spaces if present
      let cleaned = inputValue.replace(/Rp\s?/g, "").trim();

      // If empty, allow it temporarily
      if (cleaned === "") {
        setDisplayValue("");
        onChange("0");
        return;
      }

      // Remove all dots (thousand separators) and keep only digits, comma, and dot
      cleaned = cleaned.replace(/\./g, "");
      cleaned = cleaned.replace(/[^\d,.-]/g, "");

      // Parse to number
      const numValue = parseFloat(cleaned.replace(",", ".")) || 0;
      const numStr = numValue.toFixed(2);

      // Format with thousand separators in real-time while typing
      let formatted = cleaned;
      if (cleaned && cleaned.length > 0) {
        // Check if it has decimal part
        const hasDecimal = cleaned.includes(",") || cleaned.includes(".");
        if (hasDecimal) {
          const parts = cleaned.split(/[,.]/);
          if (parts.length >= 2) {
            const intPart = parts[0];
            const decPart = parts.slice(1).join("");
            // Format integer part with thousand separators
            const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            formatted = `${formattedInt},${decPart}`;
          } else {
            formatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          }
        } else {
          // No decimal, just format integer part
          formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }
      }

      // Update display value
      setDisplayValue(formatted);

      // Update parent with numeric value
      onChange(numStr);
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Show raw number for easier editing (without forced decimals)
      const numValue =
        typeof value === "string" ? parseFloat(value) || 0 : value || 0;
      if (numValue === 0) {
        setDisplayValue("");
      } else {
        // Show as integer with thousand separators, allow user to add decimals
        const intValue = Math.floor(numValue);
        setDisplayValue(
          intValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
        );
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Only format display, don't change the actual value
      // The value was already updated in handleChange
      const numValue =
        typeof value === "string" ? parseFloat(value) || 0 : value || 0;
      setDisplayValue(formatCurrency(numValue));
      if (onBlur) {
        onBlur(e);
      }
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          Rp
        </span>
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn("pl-10", className)}
          placeholder="0"
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
