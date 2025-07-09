import { useContext, ReactNode } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, requiredRole }: { children: ReactNode; requiredRole?: string }) => {
  const context = useContext(AuthContext);
  const user = context?.user;
  if (!user) return <Navigate to="/signin" />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/signin" />;
  return <>{children}</>;
};
export default ProtectedRoute;
