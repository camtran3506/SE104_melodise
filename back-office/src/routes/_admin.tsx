import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { getCurrentUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_admin")({
  component: AdminGate,
});

function AdminGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate({ to: "/login" });
    } else {
      setReady(true);
    }
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xác thực phiên đăng nhập...
      </div>
    );
  }

  return <AdminLayout />;
}
