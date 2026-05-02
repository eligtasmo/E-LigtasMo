import React from 'react';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const MobileCard: React.FC<MobileCardProps> = ({ 
  children, 
  className = "",
  onClick,
  interactive = false
}) => {
  const baseClasses = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm";
  const interactiveClasses = interactive 
    ? "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 active:scale-[0.98]" 
    : "";
  const spacingClasses = "p-4 sm:p-6";

  return (
    <div 
      className={`${baseClasses} ${interactiveClasses} ${spacingClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface MobileCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileCardHeader: React.FC<MobileCardHeaderProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={`mb-4 sm:mb-6 ${className}`}>
      {children}
    </div>
  );
};

interface MobileCardTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MobileCardTitle: React.FC<MobileCardTitleProps> = ({ 
  children, 
  className = "",
  size = 'md'
}) => {
  const sizeClasses = {
    sm: "text-base font-semibold",
    md: "text-lg font-semibold sm:text-xl",
    lg: "text-xl font-bold sm:text-2xl"
  };

  return (
    <h3 className={`text-gray-900 dark:text-white/90 ${sizeClasses[size]} ${className}`}>
      {children}
    </h3>
  );
};

interface MobileCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileCardContent: React.FC<MobileCardContentProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {children}
    </div>
  );
};

interface MobileCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileCardFooter: React.FC<MobileCardFooterProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={`mt-4 sm:mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  );
}; 