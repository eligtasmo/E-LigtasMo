import { useContext, ReactNode } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";
import { canAccess, Permission } from "../../rbac/permissions";

type Role = 'admin' | 'brgy';

const ProtectedRoute = ({ children, requiredRole, requiredPermission }: { children: ReactNode; requiredRole?: Role; requiredPermission?: Permission }) => {
  const context = useContext(AuthContext);
  const user = context?.user;
  if (!user) return <Navigate to="/auth/signin" replace />;
  const allowed = canAccess(user.role, requiredRole, requiredPermission);
  if (!allowed) return <Navigate to="/auth/signin" replace />;
  return <>{children}</>;
};
export default ProtectedRoute;
