import { ReactNode } from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md" | "lg";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface CustomBadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const CustomBadge: React.FC<CustomBadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
  className = "",
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-1 rounded-full font-medium";

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  const variants = {
    light: {
      primary: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      success: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
      error: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
      warning: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
      info: "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400",
      light: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      dark: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    },
    solid: {
      primary: "bg-blue-600 text-white dark:bg-blue-500",
      success: "bg-green-600 text-white dark:bg-green-500",
      error: "bg-red-600 text-white dark:bg-red-500",
      warning: "bg-yellow-600 text-white dark:bg-yellow-500",
      info: "bg-sky-600 text-white dark:bg-sky-500",
      light: "bg-gray-500 text-white dark:bg-gray-400",
      dark: "bg-gray-800 text-white dark:bg-gray-700",
    },
  };

  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles} ${className}`}>
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </span>
  );
};

export default CustomBadge; 