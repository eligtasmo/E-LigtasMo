import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface CustomDropdownItemProps {
  tag?: "a" | "button";
  to?: string;
  onClick?: () => void;
  onItemClick?: () => void;
  baseClassName?: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const CustomDropdownItem: React.FC<CustomDropdownItemProps> = ({
  tag = "button",
  to,
  onClick,
  onItemClick,
  baseClassName = "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors duration-150",
  className = "",
  children,
  disabled = false,
}) => {
  const combinedClasses = `${baseClassName} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`.trim();

  const handleClick = (event: React.MouseEvent) => {
    if (disabled) return;
    
    if (tag === "button") {
      event.preventDefault();
    }
    if (onClick) onClick();
    if (onItemClick) onItemClick();
  };

  if (tag === "a" && to) {
    return (
      <Link to={to} className={combinedClasses} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <button 
      onClick={handleClick} 
      className={combinedClasses}
      disabled={disabled}
    >
      {children}
    </button>
  );
}; 