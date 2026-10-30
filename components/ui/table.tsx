import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, ...p }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-auto"><table className={cn("w-full text-sm", className)} {...p} /></div>
);
export const TableHeader = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} />;
export const TableBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;
export const TableRow = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b transition-colors", className)} {...p} />
);
export const TableHead = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("h-10 px-4 text-left font-medium", className)} {...p} />
);
export const TableCell = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 align-middle", className)} {...p} />
);
