import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * Tabs as a ruled edge, not a pill group. The active tab is marked by a lacquer
 * rule sitting on the same hairline that separates the list from the panel —
 * the same device the public nav and the calendar's today column use.
 */
export const Tabs = TabsPrimitive.Root;

export function TabList({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <TabsPrimitive.List
      aria-label={label}
      className={cn("rule-b flex gap-6 overflow-x-auto", className)}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function Tab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "text-ink-2 relative -mb-px shrink-0 border-b-2 border-transparent py-2.5 text-sm whitespace-nowrap",
        "transition-colors duration-200",
        "hover:text-ink active:text-ink",
        "data-[state=active]:border-b-lacquer data-[state=active]:text-ink",
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Content value={value} className="pt-5">
      {children}
    </TabsPrimitive.Content>
  );
}
