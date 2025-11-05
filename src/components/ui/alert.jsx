// Alert components
export function Alert({ variant = "default", className, ...props }) {
  const variants = {
    default: "bg-background text-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    success: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
    warning: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100",
    info: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
  };

  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }) {
  return (
    <div
      className={`text-sm [&_p]:leading-relaxed ${className}`}
      {...props}
    />
  );
}

