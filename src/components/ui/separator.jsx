// Separator component
export function Separator({ className, orientation = "horizontal", ...props }) {
  return (
    <div
      role="separator"
      className={`
        ${orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]"}
        shrink-0 bg-border
        ${className}
      `}
      {...props}
    />
  );
}
