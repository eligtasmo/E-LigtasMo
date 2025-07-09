import { useContext, ReactNode } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";

const ResidentProtectedRoute = ({ children }: { children: ReactNode }) => {
  const context = useContext(AuthContext);
  const user = context?.user;
  if (!user) return <Navigate to="/signin" />;
  return <>{children}</>;
};

export default ResidentProtectedRoute;
