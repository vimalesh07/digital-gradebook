import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login", { replace: true });
    else if (role === "admin") navigate("/admin", { replace: true });
    else navigate("/faculty", { replace: true });
  }, [user, role, loading, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
