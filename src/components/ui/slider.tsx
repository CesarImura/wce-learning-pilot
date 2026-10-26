import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          // A chunky bar the value fills in white; the thumb is a dark notch near the end of the fill.
          className="relative grow overflow-hidden rounded-[8px] bg-white/10 select-none data-horizontal:h-10 data-horizontal:w-full data-vertical:h-full data-vertical:w-10"
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
            className="relative block h-10 w-5 shrink-0 rounded-[6px] bg-white select-none before:absolute before:inset-y-3 before:left-1 before:w-[3px] before:rounded-full before:bg-black/80 after:absolute after:-inset-x-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden disabled:pointer-events-none"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
