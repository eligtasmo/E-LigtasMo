import React from 'react';

interface IconProps {
  className?: string;
  active?: boolean;
}

export const DashboardIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor" fillOpacity={active ? "1" : "0.4"} />
    <rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor" fillOpacity={active ? "1" : "0.4"} />
    <rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor" fillOpacity={active ? "1" : "0.4"} />
    <rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor" fillOpacity={active ? "1" : "1"} />
  </svg>
);

export const ManagementIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="currentColor" />
  </svg>
);

export const RouteIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M18 15C17.4477 15 17 15.4477 17 16C17 16.5523 17.4477 17 18 17C18.5523 17 19 16.5523 19 16C19 15.4477 18.5523 15 18 15Z" fill="currentColor" />
    <path d="M6 7C5.44772 7 5 7.44772 5 8C5 8.55228 5.44772 9 6 9C6.55228 9 7 8.55228 7 8C7 7.44772 6.55228 7 6 7Z" fill="currentColor" />
    <path d="M18 13C16.3431 13 15 14.3431 15 16C15 17.6569 16.3431 19 18 19C19.6569 19 21 17.6569 21 16C21 14.3431 19.6569 13 18 13ZM18 17.5C17.1716 17.5 16.5 16.8284 16.5 16C16.5 15.1716 17.1716 14.5 18 14.5C18.8284 14.5 19.5 15.1716 19.5 16C19.5 16.8284 18.8284 17.5 18 17.5Z" fill="currentColor" />
    <path d="M6 5C4.34315 5 3 6.34315 3 8C3 9.65685 4.34315 11 6 11C7.65685 11 9 9.65685 9 8C9 6.34315 7.65685 5 6 5ZM6 9.5C5.17157 9.5 4.5 8.82843 4.5 8C4.5 7.17157 5.17157 6.5 6 6.5C6.82843 6.5 7.5 7.17157 7.5 8C7.5 8.82843 6.82843 9.5 6 9.5Z" fill="currentColor" />
    <path d="M15 16C15 14.8954 14.1046 14 13 14H11C8.23858 14 6 11.7614 6 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IntelIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" />
  </svg>
);

export const HazardIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.86L1.82 18C1.64539 18.3024 1.55299 18.6453 1.55219 18.9945C1.55139 19.3437 1.64221 19.6871 1.81539 19.9899C1.98857 20.2927 2.23801 20.5443 2.53818 20.719C2.83835 20.8937 3.17861 20.9856 3.52 20.9856H20.48C20.8214 20.9856 21.1617 20.8937 21.4618 20.719C21.762 20.5443 22.0114 20.2927 22.1846 19.9899C22.3578 19.6871 22.4486 19.3437 22.4478 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5388 3.57144 13.2954 3.33298 13.0039 3.16823C12.7123 3.00348 12.3813 2.91748 12.0441 2.91873C11.7069 2.91998 11.3759 3.00844 11.0844 3.17521C10.7928 3.34199 10.5502 3.58102 10.38 3.86" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 9V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShelterIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7V12C3 18 12 22 12 22C12 22 21 18 21 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ResidentsIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2524 22.1614 16.5523C21.6184 15.8522 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6981 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4741 21.8525 20.7302C21.7609 20.9863 21.6366 21.2173 21.4871 21.4087C21.3377 21.6001 21.1662 21.7478 20.9831 21.8427C20.7999 21.9376 20.5999 21.9776 20.39 21.96C17.3017 21.6243 14.3375 20.5639 11.77 20.88C9.37326 19.3142 7.3358 17.2767 5.77 14.88C4.06604 12.3025 3.00569 9.32833 2.67 6.23C2.65243 6.02058 2.69242 5.82062 2.78731 5.63744C2.8822 5.45427 3.02986 5.2927 3.22129 5.16335C3.41272 5.034 3.64375 4.93988 3.89982 4.88647C4.15589 4.83307 4.43147 4.82136 4.71 4.85H7.71C8.21443 4.84513 8.67389 5.17647 8.84 5.66L9.22 6.78C9.37 7.23 9.35 7.73 9.17 8.16L8 9.33C9.46 12.02 11.63 14.19 14.32 15.65L15.49 14.48C15.92 14.3 16.42 14.28 16.87 14.43L17.99 14.81C18.4735 14.9761 18.8049 15.4356 18 15.94V16.92Z" fill="currentColor" />
  </svg>
);

export const HotlineIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BookIcon: React.FC<IconProps> = ({ className = "w-5 h-5", active }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 6H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
