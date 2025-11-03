// Badge component
export function Badge({ variant = "default", className, ...props }) {
  const variants = {
    default: "bg-primary",
    secondary: "bg-secondary",
    outline: "border border-input",
    destructive: "bg-destructive"
  };

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
