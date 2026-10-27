import { useState } from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  format,
  onValueChange,
  ...props
}: SliderPrimitive.Root.Props & {
  /** Shows a value bubble above the thumb while it is dragged or focused. Omit for no bubble. */
  format?: (v: number) => string
}) {
  // Uncontrolled sliders don't hand us their value, so mirror it for the bubble.
  const [inner, setInner] = useState<readonly number[] | null>(null)
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]
  const shownValues = Array.isArray(value) ? value : (inner ?? _values)

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      onValueChange={(v, details) => {
        setInner(Array.isArray(v) ? v : [v])
        // A faint detent tick per step; no-op where vibration isn't supported.
        if (typeof navigator !== "undefined") navigator.vibrate?.(4)
        onValueChange?.(v, details)
      }}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          // A chunky bar the value fills in white; the thumb is a dark notch near the end of the fill.
          className="relative grow overflow-hidden rounded-[8px] bg-white/10 select-none data-horizontal:h-8 data-horizontal:w-full data-vertical:h-full data-vertical:w-8"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="rounded-[8px] bg-white select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            // White so the fill runs to the thumb's right edge (the indicator stops at its center) and reaches the end at max.
            className="group/thumb relative block h-8 w-5 shrink-0 rounded-[6px] bg-white select-none before:absolute before:inset-y-2 before:left-1 before:w-[3px] before:rounded-full before:bg-black/80 after:absolute after:-inset-x-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden disabled:pointer-events-none"
          >
            {format && (
              <span
                aria-hidden
                // Rises in over 150ms while dragging or keyboard-focused; the thumb's hidden input holds focus.
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 translate-y-1 rounded-md bg-black px-2 py-1 text-[13px] leading-none font-medium whitespace-nowrap text-white tabular-nums opacity-0 shadow-[0_0_0_1px_rgba(255,255,255,0.15)] transition-[opacity,transform] duration-150 ease-out group-data-dragging/thumb:translate-y-0 group-data-dragging/thumb:opacity-100 group-has-[:focus-visible]/thumb:translate-y-0 group-has-[:focus-visible]/thumb:opacity-100 motion-reduce:transition-none"
              >
                {format(shownValues[index] ?? min)}
              </span>
            )}
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
