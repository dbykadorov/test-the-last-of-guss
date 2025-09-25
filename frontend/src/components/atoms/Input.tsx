import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
  errorMessage?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, errorMessage, className, ...props }, ref) => {
    return (
      <div className="input-group">
        {label && (
          <label className="input-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'input',
            error && 'input--error',
            className
          )}
          {...props}
        />
        {errorMessage && (
          <span className="input-error text-danger text-sm">
            {errorMessage}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
