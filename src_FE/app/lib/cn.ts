import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's stock type scale. Our own sizes
 * (`text-2xs`, `text-d1`–`text-d3`, `text-lede`) looked like colours to it, so
 * `cn("text-d3", "text-copper")` silently dropped the size.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xs", "d1", "d2", "d3", "lede"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
