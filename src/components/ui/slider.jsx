// Slider component
export function Slider({ className, value, onChange, min, max, step, ...props }) {
  return (
    <input
      type="range"
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`}
      {...props}
    />
  );
}


