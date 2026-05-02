import React, { useState, useEffect, ReactNode } from 'react';
import { useMediaQuery } from 'react-responsive';
import MobileNavigation from './MobileNavigation';

interface ResponsiveLayoutProps {
  children: ReactNode;
  userRole?: 'resident' | 'coordinator' | 'admin';
  notificationCount?: number;
  showNavigation?: boolean;
  className?: string;
}

interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  userRole = 'resident',
  notificationCount = 0,
  showNavigation = true,
  className = ''
}) => {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  });

  // Media queries using react-responsive
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isLandscape = useMediaQuery({ orientation: 'landscape' });

  // Update viewport info on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewportInfo({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        orientation: width > height ? 'landscape' : 'portrait'
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle viewport meta tag for mobile optimization
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }, []);

  // Safe area handling for devices with notches
  const getSafeAreaStyles = () => {
    if (!isMobile) return {};
    
    return {
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    };
  };

  // Container classes based on device type
  const getContainerClasses = () => {
    const baseClasses = 'min-h-screen bg-gray-50';
    
    if (isMobile) {
      return `${baseClasses} ${showNavigation ? 'pb-16' : ''}`; // Space for bottom nav
    } else if (isTablet) {
      return `${baseClasses} ${showNavigation ? 'pt-16' : ''}`; // Space for top nav
    } else {
      return `${baseClasses} ${showNavigation ? 'pt-16' : ''}`;
    }
  };

  // Content wrapper classes
  const getContentClasses = () => {
    const baseClasses = 'w-full';
    
    if (isMobile) {
      return `${baseClasses} px-4 py-4`;
    } else if (isTablet) {
      return `${baseClasses} px-6 py-6 max-w-4xl mx-auto`;
    } else {
      return `${baseClasses} px-8 py-8 max-w-7xl mx-auto`;
    }
  };

  // Grid system for responsive layouts
  const getGridClasses = (cols: { mobile?: number; tablet?: number; desktop?: number }) => {
    const mobileClass = cols.mobile ? `grid-cols-${cols.mobile}` : 'grid-cols-1';
    const tabletClass = cols.tablet ? `md:grid-cols-${cols.tablet}` : 'md:grid-cols-2';
    const desktopClass = cols.desktop ? `lg:grid-cols-${cols.desktop}` : 'lg:grid-cols-3';
    
    return `grid gap-4 ${mobileClass} ${tabletClass} ${desktopClass}`;
  };

  // Touch-friendly button classes
  const getTouchButtonClasses = () => {
    return isMobile 
      ? 'min-h-[44px] min-w-[44px] touch-manipulation' // Apple's recommended touch target size
      : 'min-h-[36px] min-w-[36px]';
  };

  // Font size classes for readability
  const getTextClasses = () => {
    if (isMobile) {
      return {
        heading: 'text-xl md:text-2xl lg:text-3xl',
        subheading: 'text-lg md:text-xl lg:text-2xl',
        body: 'text-base md:text-lg',
        small: 'text-sm md:text-base',
        caption: 'text-xs md:text-sm'
      };
    }
    
    return {
      heading: 'text-3xl',
      subheading: 'text-2xl',
      body: 'text-lg',
      small: 'text-base',
      caption: 'text-sm'
    };
  };

  // Provide responsive utilities to children
  const responsiveUtils = {
    viewportInfo,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    getGridClasses,
    getTouchButtonClasses,
    getTextClasses: getTextClasses()
  };

  return (
    <div 
      className={`${getContainerClasses()} ${className}`}
      style={getSafeAreaStyles()}
    >
      {/* Navigation */}
      {showNavigation && (
        <MobileNavigation 
          userRole={userRole}
          notificationCount={notificationCount}
        />
      )}

      {/* Main Content */}
      <main className={getContentClasses()}>
        {/* Provide responsive context to children */}
        <ResponsiveContext.Provider value={responsiveUtils}>
          {children}
        </ResponsiveContext.Provider>
      </main>

      {/* Development Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-50">
          <div>W: {viewportInfo.width}px</div>
          <div>H: {viewportInfo.height}px</div>
          <div>Device: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}</div>
          <div>Orientation: {viewportInfo.orientation}</div>
        </div>
      )}
    </div>
  );
};

// Context for responsive utilities
const ResponsiveContext = React.createContext<any>(null);

// Hook to use responsive utilities
export const useResponsive = () => {
  const context = React.useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within ResponsiveLayout');
  }
  return context;
};

// Responsive Grid Component
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: { mobile?: number; tablet?: number; desktop?: number };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className = ''
}) => {
  const { getGridClasses } = useResponsive();
  
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  return (
    <div className={`${getGridClasses(cols).replace('gap-4', gapClasses[gap])} ${className}`}>
      {children}
    </div>
  );
};

// Responsive Card Component
interface ResponsiveCardProps {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  padding = 'md',
  className = '',
  onClick
}) => {
  const { isMobile, getTouchButtonClasses } = useResponsive();
  
  const paddingClasses = {
    sm: isMobile ? 'p-3' : 'p-4',
    md: isMobile ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-6' : 'p-8'
  };

  const baseClasses = `
    bg-white rounded-lg shadow-sm border border-gray-200 
    ${onClick ? `cursor-pointer hover:shadow-md transition-shadow ${getTouchButtonClasses()}` : ''}
    ${paddingClasses[padding]}
    ${className}
  `;

  return (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  );
};

// Responsive Button Component
interface ResponsiveButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  className = ''
}) => {
  const { isMobile, getTouchButtonClasses } = useResponsive();

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    ghost: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
  };

  const sizeClasses = {
    sm: isMobile ? 'px-3 py-2 text-sm' : 'px-3 py-1.5 text-sm',
    md: isMobile ? 'px-4 py-3 text-base' : 'px-4 py-2 text-base',
    lg: isMobile ? 'px-6 py-4 text-lg' : 'px-6 py-3 text-lg'
  };

  const baseClasses = `
    font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
    ${getTouchButtonClasses()}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <button
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default ResponsiveLayout;