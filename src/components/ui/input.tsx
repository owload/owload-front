import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A text field. Its states follow the "field states" artboard: the border darkens on hover, a focused field has a
 * soft yellow halo around its dark border (no second outline), an invalid one has a red border, a disabled one is grey.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-[10px] border border-input bg-white px-3 py-1 text-sm transition-[color,border-color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "hover:border-sunny-ink focus-visible:border-sunny-ink focus-visible:shadow-[0_0_0_3px_rgba(250,219,88,0.6)] focus-visible:outline-none",
        "aria-invalid:border-[#b3261e] aria-invalid:hover:border-[#b3261e] aria-invalid:focus-visible:border-[#b3261e] aria-invalid:focus-visible:shadow-[0_0_0_3px_rgba(179,38,30,0.18)]",
        "disabled:cursor-not-allowed disabled:border-[#d5d3ca] disabled:bg-secondary disabled:text-[#8f8d84] disabled:hover:border-[#d5d3ca]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
