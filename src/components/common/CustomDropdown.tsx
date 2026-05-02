import { ReactNode, CSSProperties } from "react";

interface CustomDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  position?: "left" | "right" | "center";
  style?: CSSProperties;
}

export const CustomDropdown = ({
  isOpen,
  onClose,
  children,
  className = "",
  position = "right",
  style = {},
}: CustomDropdownProps) => {
  if (!isOpen) return null;

  const positionClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 transform -translate-x-1/2",
  };

  return (
    <div
      className={`absolute z-[9999] mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${positionClasses[position]} ${className}`}
      style={{ 
        position: 'absolute',
        zIndex: 9999,
        pointerEvents: 'auto',
        ...style
      }}
    >
      {children}
    </div>
  );
}; 
