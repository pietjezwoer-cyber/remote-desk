import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-9 w-full rounded-md border px-3 text-sm outline-none placeholder:text-[#5d6574] focus:border-[#6b8cbe]", className)}
      {...props}
    />
  );
}
