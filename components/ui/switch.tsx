"use client";
import { cn } from "@/lib/utils";

export function Switch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-[#6b8cbe]" : "bg-[#33373f]")}
    >
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}
