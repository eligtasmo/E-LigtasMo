import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = "http://localhost/eligtasmo/api";
const PUBLIC_ROUTES = ["/signin", "/brgy-signup", "/forgot-password"];

const useSessionGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("useSessionGuard", location.pathname);
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