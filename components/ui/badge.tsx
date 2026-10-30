import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant: _v, ...p }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", className)} {...p} />;
}
