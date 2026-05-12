import * as React from "react";
import { cn } from "@/lib/utils";
import { formatDateInput } from "@/lib/date";

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  value?: string;
  onChange?: (value: string) => void;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, placeholder = "dd/mm/yyyy", ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDateInput(e.target.value);
      onChange?.(formatted);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
