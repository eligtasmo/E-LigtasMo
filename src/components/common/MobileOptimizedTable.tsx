import React from 'react';

interface MobileOptimizedTableProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileOptimizedTable: React.FC<MobileOptimizedTableProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
};

interface MobileOptimizedTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileOptimizedTableHeader: React.FC<MobileOptimizedTableHeaderProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <thead className={`bg-gray-50 dark:bg-gray-900/50 ${className}`}>
      {children}
    </thead>
  );
};

interface MobileOptimizedTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileOptimizedTableBody: React.FC<MobileOptimizedTableBodyProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <tbody className={`divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900 ${className}`}>
      {children}
    </tbody>
  );
};

interface MobileOptimizedTableCellProps {
  children: React.ReactNode;
  className?: string;
  isHeader?: boolean;
}

export const MobileOptimizedTableCell: React.FC<MobileOptimizedTableCellProps> = ({ 
  children, 
  className = "",
  isHeader = false
}) => {
  const baseClasses = "px-3 py-4 text-sm whitespace-nowrap";
  const headerClasses = isHeader 
    ? "font-medium text-gray-900 dark:text-white/90" 
    : "text-gray-500 dark:text-gray-400";
  
  return (
    <td className={`${baseClasses} ${headerClasses} ${className}`}>
      {children}
    </td>
  );
};

interface MobileOptimizedTableHeaderCellProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileOptimizedTableHeaderCell: React.FC<MobileOptimizedTableHeaderCellProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <th className={`px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white/90 ${className}`}>
      {children}
    </th>
  );
}; 