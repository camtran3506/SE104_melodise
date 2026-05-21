import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold cursor-pointer transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground rounded-full shadow-[0_0_28px_-2px_rgba(212,175,55,0.55),0_0_60px_-10px_rgba(197,160,89,0.4)] hover:shadow-[0_0_40px_0_rgba(212,175,55,0.7),0_0_90px_-10px_rgba(197,160,89,0.55)] hover:brightness-110 active:scale-[0.98]",
        secondary:
          "bg-transparent text-gold border border-gold rounded-full hover:bg-[rgba(212,175,55,0.10)]",
        outline:
          "bg-transparent text-canvas border border-[rgba(253,251,247,0.5)] rounded-full hover:bg-[rgba(253,251,247,0.06)]",
        ghost: "rounded-full hover:bg-[rgba(253,251,247,0.06)] text-canvas",
        destructive:
          "bg-destructive text-destructive-foreground rounded-full hover:brightness-110",
        link: "text-mist underline-offset-4 hover:underline hover:text-gold",
      },
      size: {
        default: "h-11 px-8 text-sm",
        sm: "h-9 px-5 text-xs",
        lg: "h-13 px-10 py-3 text-base",
        xl: "h-14 px-12 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
