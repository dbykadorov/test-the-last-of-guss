import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline';
  size?: 'normal' | 'large';
  children: ReactNode;
  loading?: boolean;
}

const Button = ({
  variant = 'primary',
  size = 'normal',
  children,
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={clsx(
        'btn',
        `btn--${variant}`,
        size === 'large' && 'btn--large',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Загрузка...' : children}
    </button>
  );
};

export default Button;
