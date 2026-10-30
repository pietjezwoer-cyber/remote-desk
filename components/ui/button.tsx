import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-[#25282e] hover:bg-[#2e323a] text-[#e8ecf2]",
  outline: "border border-[#25282e] hover:bg-[#1c1f24]",
  ghost: "hover:bg-[#1c1f24]",
};
const sizes = { default: "h-9 px-4", sm: "h-8 px-3 text-xs" };

export function Button({
  className, variant = "default", size = "default", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; size?: keyof typeof sizes }) {
  return (
    <button
      className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none", variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
