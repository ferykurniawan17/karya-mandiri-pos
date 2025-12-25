"use client";

import * as React from "react";
import { X, Check, ChevronDown } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

interface AutocompleteSelectOption {
  id: string;
  name: string;
}

interface AutocompleteSelectProps {
  options: AutocompleteSelectOption[];
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function AutocompleteSelect({
  options,
  value,
  onValueChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  className,
}: AutocompleteSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter((option) =>
      option.name.toLowerCase().includes(lowerSearch)
    );
  }, [options, search]);

  const selectedOption = React.useMemo(() => {
    return options.find((option) => option.id === value);
  }, [options, value]);

  const handleSelect = (optionId: string) => {
    if (value === optionId) {
      // If clicking the same option, clear selection
      onValueChange(undefined);
    } else {
      onValueChange(optionId);
    }
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(undefined);
    setSearch("");
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <div className="flex flex-1 items-center gap-2">
            {selectedOption ? (
              <>
                <span className="text-gray-900">{selectedOption.name}</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={cn(
            "z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-gray-200 bg-white p-1 shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          align="start"
        >
          <div className="p-2">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-gray-500">
                Tidak ada hasil
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100",
                      isSelected && "bg-indigo-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSelected
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-gray-300"
                        )}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-gray-900">{option.name}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

