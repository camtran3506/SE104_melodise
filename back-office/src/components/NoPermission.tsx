import { ShieldAlert } from "lucide-react";

export function NoPermission({ tab }: { tab?: string }) {
  return (
    <div className="glass-card animate-fade-in mx-auto mt-12 max-w-lg rounded-2xl p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 ring-2 ring-destructive/40">
        <ShieldAlert className="h-7 w-7 text-destructive-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Không có quyền hạn</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Tài khoản của bạn không được phép truy cập {tab ? `chức năng "${tab}"` : "chức năng này"}.
        Vui lòng liên hệ Quản trị viên nếu cần hỗ trợ.
      </p>
    </div>
  );
}
