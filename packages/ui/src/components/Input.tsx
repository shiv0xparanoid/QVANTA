import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
  wrapperClassName?: string;
  labelClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      wrapperClassName = "",
      labelClassName = "",
      label,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();

    const input = (
      <input
        ref={ref}
        id={inputId}
        className={`flex h-10 w-full rounded-lg border border-bg-700 bg-bg-900 px-3 py-2 text-sm text-text-100 placeholder:text-text-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-950 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );

    if (!label) {
      return input;
    }

    return (
      <div className={`flex flex-col space-y-1.5 ${wrapperClassName}`}>
        <label
          htmlFor={inputId}
          className={`text-sm font-medium text-text-200 ${labelClassName}`}
        >
          {label}
        </label>
        {input}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
