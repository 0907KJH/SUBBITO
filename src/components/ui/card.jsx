// Card components con supporto per tema scuro/chiaro
export function Card({ className, ...props }) {
  return <div className={`rounded-lg border shadow-sm ${className}`} {...props} />;
}

export function CardHeader(props) {
  return <div className="flex flex-col space-y-1.5 p-6" {...props} />;
}

export function CardTitle(props) {
  return <h3 className="text-2xl font-semibold leading-none tracking-tight" {...props} />;
}

export function CardDescription(props) {
  return <p className="text-sm text-muted-foreground" {...props} />;
}

export function CardContent(props) {
  return <div className="p-6 pt-0" {...props} />;
}
