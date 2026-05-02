import { ReactNode } from "react";

// Props for Table
interface CustomTableProps {
  children: ReactNode;
  className?: string;
  striped?: boolean;
  hover?: boolean;
}

// Props for TableHeader
interface CustomTableHeaderProps {
  children: ReactNode;
  className?: string;
}

// Props for TableBody
interface CustomTableBodyProps {
  children: ReactNode;
  className?: string;
}

// Props for TableRow
interface CustomTableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

// Props for TableCell
interface CustomTableCellProps {
  children: ReactNode;
  isHeader?: boolean;
  className?: string;
  align?: "left" | "center" | "right";
}

// Table Component
const CustomTable: React.FC<CustomTableProps> = ({ 
  children, 
  className = "",
  striped = false,
  hover = false 
}) => {
  const baseClasses = "min-w-full divide-y divide-gray-200 dark:divide-gray-700";
  const stripedClasses = striped ? "divide-y divide-gray-200 dark:divide-gray-700" : "";
  const hoverClasses = hover ? "hover:bg-gray-50 dark:hover:bg-gray-800" : "";
  
  return (
    <div className="overflow-x-auto">
      <table className={`${baseClasses} ${stripedClasses} ${hoverClasses} ${className}`}>
        {children}
      </table>
    </div>
  );
};

// TableHeader Component
const CustomTableHeader: React.FC<CustomTableHeaderProps> = ({ children, className = "" }) => {
  return (
    <thead className={`bg-gray-50 dark:bg-gray-800 ${className}`}>
      {children}
    </thead>
  );
};

// TableBody Component
const CustomTableBody: React.FC<CustomTableBodyProps> = ({ children, className = "" }) => {
  return (
    <tbody className={`bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
      {children}
    </tbody>
  );
};

// TableRow Component
const CustomTableRow: React.FC<CustomTableRowProps> = ({ 
  children, 
  className = "",
  onClick,
  selected = false
}) => {
  const baseClasses = "transition-colors duration-150";
  const selectedClasses = selected ? "bg-blue-50 dark:bg-blue-900/20" : "";
  const clickableClasses = onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : "";
  
  return (
    <tr 
      className={`${baseClasses} ${selectedClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

// TableCell Component
const CustomTableCell: React.FC<CustomTableCellProps> = ({
  children,
  isHeader = false,
  className = "",
  align = "left",
}) => {
  const CellTag = isHeader ? "th" : "td";
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };
  
  const baseClasses = isHeader 
    ? "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
    : "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100";
  
  return (
    <CellTag className={`${baseClasses} ${alignClasses[align]} ${className}`}>
      {children}
    </CellTag>
  );
};

export { CustomTable, CustomTableHeader, CustomTableBody, CustomTableRow, CustomTableCell }; 