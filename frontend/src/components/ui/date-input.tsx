import * as React from "react";
import { cn } from "@/lib/utils";

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  value?: string;
  onChange?: (value: string) => void;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const MASK = "DD/MM/YYYY";

    const getDigits = React.useCallback((v?: string) => (v || "").replace(/\D/g, "").slice(0, 8), []);
    const toMasked = React.useCallback((digits: string) => {
      const chars = MASK.split("");
      let i = 0;
      for (const ch of digits) {
        while (i < chars.length && chars[i] === "/") i++;
        if (i < chars.length) chars[i++] = ch;
      }
      return chars.join("");
    }, []);

    const emitFromDigits = React.useCallback((digits: string) => {
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      let out = dd;
      if (digits.length > 2) out += `/${mm}`;
      if (digits.length > 4) out += `/${yyyy}`;
      return out;
    }, []);

    const positionForDigitIndex = React.useCallback((digitIdx: number) => {
      if (digitIdx <= 2) return digitIdx;
      if (digitIdx <= 4) return digitIdx + 1;
      return digitIdx + 2;
    }, []);

    const digitIndexForCursor = React.useCallback((cursor: number) => {
      if (cursor <= 2) return cursor;
      if (cursor <= 5) return cursor - 1;
      return cursor - 2;
    }, []);

    const updateValue = React.useCallback((digits: string, nextDigitIndex: number) => {
      const cleaned = digits.slice(0, 8);
      onChange?.(emitFromDigits(cleaned));
      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        const pos = Math.max(0, Math.min(10, positionForDigitIndex(nextDigitIndex)));
        inputRef.current.setSelectionRange(pos, pos);
      });
    }, [emitFromDigits, onChange, positionForDigitIndex]);

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!inputRef.current) return;
      const cursor = inputRef.current.selectionStart ?? 0;
      const digits = getDigits(value);
      const digitIdx = digitIndexForCursor(cursor);

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        if (digits.length >= 8 && digitIdx >= 8) return;
        const before = digits.slice(0, digitIdx);
        const after = digits.slice(digitIdx);
        const next = `${before}${e.key}${after}`.slice(0, 8);
        updateValue(next, Math.min(8, digitIdx + 1));
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        if (digitIdx <= 0) return;
        const removeAt = digitIdx - 1;
        const next = `${digits.slice(0, removeAt)}${digits.slice(removeAt + 1)}`;
        updateValue(next, removeAt);
        return;
      }

      if (e.key === "Delete") {
        e.preventDefault();
        if (digitIdx >= digits.length) return;
        const next = `${digits.slice(0, digitIdx)}${digits.slice(digitIdx + 1)}`;
        updateValue(next, digitIdx);
        return;
      }

      if (e.key === "/" || e.key === "-" || e.key === " ") {
        e.preventDefault();
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Tab" || e.key === "Home" || e.key === "End") {
        return;
      }

      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
      if (!pasted) return;
      const cursor = inputRef.current?.selectionStart ?? 0;
      const digitIdx = digitIndexForCursor(cursor);
      const digits = getDigits(value);
      const next = `${digits.slice(0, digitIdx)}${pasted}${digits.slice(digitIdx)}`.slice(0, 8);
      updateValue(next, Math.min(8, digitIdx + pasted.length));
    };

    const maskedValue = toMasked(getDigits(value));

    return (
      <input
        ref={setRefs}
        type="text"
        inputMode="numeric"
        placeholder={MASK}
        maxLength={10}
        value={maskedValue}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => {
          const digits = getDigits(value);
          const pos = positionForDigitIndex(Math.min(8, digits.length));
          requestAnimationFrame(() => inputRef.current?.setSelectionRange(pos, pos));
        }}
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
