import { ReactNode } from "react";
import { Outlet } from "react-router-dom";

interface AuthPageLayoutProps {
  children?: ReactNode;
}

export default function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <div className="flex items-center justify-center p-6 py-24">
      <div 
        className="w-full max-w-[400px] animate-fade-in bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[20px] p-[40px_36px] relative shadow-sm"
      >
        {children ?? <Outlet />}
      </div>
    </div>
  );
}
