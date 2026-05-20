import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_admin/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) return;

    // Phân luồng trang chủ mặc định chuẩn xác theo từng vai trò (Role)
    if (user.role === "admin") {
      navigate({ to: "/accounts", replace: true }); // Admin vào quản lý Tài khoản
    } else if (user.role === "sales" || user.role === "producer") {
      navigate({ to: "/music", replace: true });    // Sales và Producer vào trang Nhạc số
    } else {
      navigate({ to: "/login", replace: true });    // Trường hợp lạ không có quyền thì đá ra Login
    }
  }, [navigate, user]);

  return null;
}
