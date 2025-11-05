import React, { useState, useRef, useEffect } from 'react';

export function Select({ value, onChange, children, className, ...props }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // try to find a human-friendly label for the current value by traversing children
  const findLabel = (nodes) => {
    let found = null;
    React.Children.forEach(nodes, node => {
      if (!node || found) return;
      if (node.type === SelectItem && node.props.value === value) {
        found = node.props.children;
        return;
      }
      // dive into grandchildren (e.g. SelectContent -> SelectItem)
      if (node.props && node.props.children) {
        const inner = findLabel(node.props.children);
        if (inner) found = inner;
      }
    });
    return found;
  };

  const selectedLabel = findLabel(children);

  return (
    <div ref={selectRef} className={`relative ${className}`} {...props}>
      {React.Children.map(children, child => {
        if (child.type === SelectTrigger) {
          // pass current value and a human-friendly label to trigger so it can display the selected item
          return React.cloneElement(child, {
            onClick: () => setIsOpen(!isOpen),
            isOpen,
            value,
            displayValue: selectedLabel
          });
        }
        if (child.type === SelectContent) {
          return isOpen && React.cloneElement(child, {
            onChange,
            value,
            onClose: () => setIsOpen(false)
          });
        }
        return child;
      })}
    </div>
  );
}

export function SelectTrigger({ className, children, isOpen, displayValue, value, ...props }) {
  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {/* Prefer a human-friendly displayValue (label). If not available, fall back to value or children. */}
      {displayValue !== undefined && displayValue !== null ? (
        <span>{displayValue}</span>
      ) : value !== undefined && value !== null ? (
        <span>{value}</span>
      ) : (
        children
      )}
      <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
    </button>
  );
}

export function SelectValue({ children, placeholder }) {
  return <span>{children || placeholder}</span>;
}

export function SelectContent({ className, children, onChange, value, onClose }) {
  return (
    <div
      className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 mt-1 w-full ${className}`}
    >
      <div className="p-1">
        {React.Children.map(children, child => {
          if (child.type === SelectItem) {
            return React.cloneElement(child, {
              selected: child.props.value === value,
              onClick: () => {
                onChange?.(child.props.value);
                onClose?.();
              }
            });
          }
          return child;
        })}
      </div>
    </div>
  );
}

export function SelectItem({ className, children, selected, ...props }) {
  return (
    <button
      type="button"
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${
        selected ? 'bg-primary text-primary-foreground' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

