"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      toastOptions={{ style: { background: "#17191d", border: "1px solid #25282e", color: "#d8dce3" } }}
      {...props}
    />
  );
}
