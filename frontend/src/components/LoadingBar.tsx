import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LoadingBar() {
  const [visible, setVisible] = useState(false);
  const [apiCalls, setApiCalls] = useState(0);

  useEffect(() => {
    const origFetch = window.fetch;
    window.fetch = (...args) => {
      setApiCalls((c) => c + 1);
      setVisible(true);
      return origFetch(...args).finally(() => {
        setApiCalls((c) => {
          const next = c - 1;
          if (next <= 0) {
            setTimeout(() => setVisible(false), 300);
            return 0;
          }
          return next;
        });
      });
    };
    return () => { window.fetch = origFetch; };
  }, []);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 z-[9999] h-[3px] bg-primary transition-all duration-500 ease-out",
        visible ? "w-full opacity-100" : "w-0 opacity-0"
      )}
      style={{ boxShadow: "0 0 8px hsl(var(--primary) / 0.5)" }}
    />
  );
}
