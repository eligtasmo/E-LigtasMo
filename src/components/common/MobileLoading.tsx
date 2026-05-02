import React from 'react';

interface MobileLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const MobileLoading: React.FC<MobileLoadingProps> = ({ 
  size = 'md',
  text = "Loading...",
  className = "" 
}) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}></div>
      {text && (
        <p className={`text-gray-600 dark:text-gray-400 ${textSizes[size]}`}>
          {text}
        </p>
      )}
    </div>
  );
};

interface MobileLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const MobileLoadingSpinner: React.FC<MobileLoadingSpinnerProps> = ({ 
  size = 'md',
  className = "" 
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}></div>
  );
};

interface MobileLoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export const MobileLoadingSkeleton: React.FC<MobileLoadingSkeletonProps> = ({ 
  lines = 3,
  className = "" 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          style={{
            width: `${Math.random() * 40 + 60}%`
          }}
        />
      ))}
    </div>
  );
};

interface MobileLoadingCardProps {
  className?: string;
}

export const MobileLoadingCard: React.FC<MobileLoadingCardProps> = ({ 
  className = "" 
}) => {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm ${className}`}>
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/6"></div>
        </div>
      </div>
    </div>
  );
}; 