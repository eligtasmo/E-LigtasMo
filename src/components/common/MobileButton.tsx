import React from 'react';

interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = "",
  fullWidth = false,
  type = 'button'
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeClasses = {
    sm: "px-3 py-2 text-sm min-h-[44px]",
    md: "px-4 py-3 text-base min-h-[48px]",
    lg: "px-6 py-4 text-lg min-h-[52px]"
  };

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 active:bg-blue-800",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 active:bg-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 active:bg-red-800",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 active:bg-green-800",
    outline: "border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 focus:ring-gray-500 active:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-gray-100 dark:active:bg-gray-800"
  };

  const widthClasses = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses} ${className}`}
    >
      {children}
    </button>
  );
};

interface MobileIconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const MobileIconButton: React.FC<MobileIconButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = "",
  type = 'button'
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeClasses = {
    sm: "p-2 min-w-[44px] min-h-[44px]",
    md: "p-3 min-w-[48px] min-h-[48px]",
    lg: "p-4 min-w-[52px] min-h-[52px]"
  };

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 active:bg-blue-800",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 active:bg-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 active:bg-red-800",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 active:bg-green-800",
    outline: "border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 focus:ring-gray-500 active:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-gray-100 dark:active:bg-gray-800"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}; 