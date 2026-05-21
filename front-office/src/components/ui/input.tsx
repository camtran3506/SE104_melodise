import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-[rgba(242,201,76,0.25)] bg-[rgba(253,251,247,0.05)] backdrop-blur-md px-5 py-2 text-sm text-canvas placeholder:text-mist/60 transition-all focus-visible:outline-none focus-visible:border-gold focus-visible:bg-[rgba(253,251,247,0.08)] focus-visible:shadow-[0_0_0_3px_rgba(242,201,76,0.15)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
export { Input };
