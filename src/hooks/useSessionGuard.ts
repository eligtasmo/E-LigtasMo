import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const PUBLIC_ROUTES = ["/signin", "/brgy-signin", "/forgot-password"];

const useSessionGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch(`${API_BASE}/session.php`, { credentials: "include" });
      const data = await res.json();
      if (
        !data.authenticated &&
        !PUBLIC_ROUTES.includes(location.pathname)
      ) {
        navigate("/signin", { replace: true });
      }
    };
    checkSession();
  }, [location, navigate]);
};

export default useSessionGuard;
