"use client"

import { cn } from "@/lib/utils"

export function NewTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative overflow-hidden rounded-[4px] bg-new px-1.5 py-1 text-[14px] leading-none font-medium tracking-[-0.03em] text-[#241700] uppercase",
        className,
      )}
    >
      new
    </span>
  )
}
