import { useContext, ReactNode } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";
import AccessRequired from "./AccessRequired";

const ResidentProtectedRoute = ({ children }: { children: ReactNode }) => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  
  if (!user) return <Navigate to="/signin" replace />;
  
  const role = user.role?.toLowerCase();
  
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "brgy") return <Navigate to="/barangay" replace />;
  
  // If role is resident, restrict web access
  return <Navigate to="/access-restricted" replace />;
};

export default ResidentProtectedRoute;
