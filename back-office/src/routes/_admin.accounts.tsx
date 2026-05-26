import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { Plus, Search, Edit2, Trash2, Shield, User, Save, Loader2 } from "lucide-react";
import { melodiseDb } from "@/lib/external-supabase";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { NoPermission } from "@/components/NoPermission";

export const Route = createFileRoute("/_admin/accounts")({
  component: AccountsGuard,
});

export type AccountFormData = Account & {
  password?: string;
};

function AccountsGuard() {
  if (!hasPermission(getCurrentUser(), "accounts")) return <NoPermission tab="Quản lý tài khoản" />;
  return <AccountsPage />;
}

type Role = "Quản lý cấp cao" | "Nhân viên Sản xuất" | "Nhân viên Kinh doanh" | "Khách hàng";

type Account = {
  user_id: number;    
  auth_id: string;
  full_name: string;         
  phone_number: string;     
  email: string;
  password: string;
  role: Role;
  created_at?: string;
};

function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Account | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: authData } = await melodiseDb.auth.getUser();
      console.log("Tài khoản đang gọi Data là:", authData.user ? authData.user.email : "KHÁCH LẠ (CHƯA ĐĂNG NHẬP)");
      
      const { data, error } = await melodiseDb
        .from("users")
        .select("user_id, full_name, phone_number, email, role, created_at, auth_id")
        .order('user_id', { ascending: true });
        
      if (error || !data) {
        setNotice(
          `Không đọc được bảng users: ${error?.message ?? "RLS từ chối"}. Hãy đăng xuất rồi đăng nhập lại bằng tài khoản Supabase Auth hợp lệ (chỉ authenticated mới được xem).`,
        );
        setLoading(false);
        return;
      }

      const mapped: Account[] = data.map((u: any) => {
        return {
          user_id: u.user_id,
          full_name: u.full_name ?? "(chưa cập nhật)",
          phone_number: u.phone_number ?? "",
          email: u.email ?? "",
          role: (u.role as Role) ?? "Khách hàng", 
          password: u.password, 
          created_at: u.created_at,
          auth_id: u.auth_id,
        };
      });
      
      setAccounts(mapped);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return accounts.filter((a) => {
      if (roleFilter !== "all" && a.role !== roleFilter) return false;
      if (!k) return true;
      return (
        a.full_name.toLowerCase().includes(k) ||
        a.email.toLowerCase().includes(k) ||
        a.user_id.toString().toLowerCase().includes(k)
      );
    });
  }, [accounts, keyword, roleFilter]);

  const handleSave = async (formData: Account) => {
    setLoading(true); 

    const parseServerError = async (error: any) => {
      try {
        let errorMsg = "";
        let errorCode = "";

        if (error.context && typeof error.context.json === 'function') {
          try {
            const jsonBody = await error.context.json();
            errorMsg = jsonBody.error || "";
            errorCode = jsonBody.code || "";
          } catch (e) {
            try {
              errorMsg = await error.context.text();
            } catch (txtErr) {}
          }
        }

        if (!errorMsg && error.message) {
          errorMsg = error.message;
          try {
            const parsed = JSON.parse(error.message);
            errorMsg = parsed.error || errorMsg;
            errorCode = parsed.code || errorCode;
          } catch (e) {}
        }

        const lowMsg = errorMsg.toLowerCase();
        const lowCode = errorCode.toLowerCase();

        if (
          lowCode === 'email_exists' || 
          lowCode === '23505' || 
          lowMsg.includes("already been registered") || 
          lowMsg.includes("already exists") ||
          lowMsg.includes("email_exists")
        ) {
          return new Error("Email đã được sử dụng");
        }

        return new Error(errorMsg || "Có lỗi xảy ra từ hệ thống, vui lòng thử lại.");

      } catch (e) {
        return new Error("Có lỗi xảy ra trong quá trình xử lý phản hồi từ hệ thống.");
      }
    };
    
    try {
      if (editing) {
        const { data: updatedUser, error } = await melodiseDb.functions.invoke('update-admin-user', {
          body: {
            auth_id: formData.auth_id,       
            user_id: formData.user_id,       
            email: formData.email,
            password: formData.password,     
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            role: formData.role
          }
        });

        if (error) throw error;

        setAccounts((prev) => prev.map((a) => (a.user_id === formData.user_id ? updatedUser : a)));
        toast.success("Cập nhật tài khoản thành công");

      } else {
        const { data: newUser, error } = await melodiseDb.functions.invoke('create-admin-user', {
          body: {
            email: formData.email,
            password: formData.password, 
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            role: formData.role
          }
        });

        if (error) {
          throw await parseServerError(error);
        }

        setAccounts((prev) => [...prev, newUser]);
        toast.success("Thêm tài khoản thành công");
      }

      setEditing(null);
      setCreating(false);

    } catch (error: any) {
      console.error("Lỗi lưu dữ liệu:", error);
      toast.error(error.message || "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (acc: Account) => {
    // THÊM BẢO VỆ Ở TẦNG LOGIC: Từ chối thao tác xóa nếu là Khách hàng
    if (acc.role === "Khách hàng") {
      toast.error("Không thể xóa tài khoản Khách hàng để bảo toàn dữ liệu liên quan.");
      return;
    }
    setDeleting(acc); 
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setLoading(true);

    try {
      const { error } = await melodiseDb.functions.invoke('delete-admin-user', {
        body: { 
          auth_id: deleting.auth_id, 
          user_id: deleting.user_id  
        }
      });

      if (error) throw error;

      setAccounts((prev) => prev.filter((a) => a.user_id !== deleting.user_id));
      toast.success("Đã xóa tài khoản thành công");

    } catch (err: any) {
      console.error("Lỗi khi xóa tài khoản:", err);
      toast.error("Không thể xóa: " + (err.message || "Có lỗi xảy ra"));
    } finally {
      setLoading(false);
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý tài khoản nội bộ"
        subtitle="Thêm, chỉnh sửa, xóa và phân quyền người dùng hệ thống."
        actions={
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> Thêm tài khoản
          </button>
        }
      />

      {notice && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
          {notice}
        </div>
      )}

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu từ Supabase
        </div>
      )}

      <div className="glass-card rounded-2xl p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên, email, mã..."
              className="w-full rounded-lg border border-border bg-input/40 py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as never)}
            className="rounded-lg border border-border bg-input/40 px-3 py-2 text-sm focus:border-gold focus:outline-none"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="Quản lý cấp cao">Quản lý cấp cao</option>
            <option value="Nhân viên Sản xuất">Nhân viên Sản xuất</option>
            <option value="Nhân viên Kinh doanh">Nhân viên Kinh doanh</option>
            <option value="Khách hàng">Khách hàng</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3">Mã</th>
                <th className="px-3 py-3">Họ tên</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Vai trò</th>
                <th className="px-3 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Không tìm thấy dữ liệu
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.user_id} className="border-b border-border/50 transition hover:bg-gold/5">
                    <td className="px-3 py-3 font-mono text-xs text-gold">{a.user_id}</td>
                    <td className="px-3 py-3 font-medium">{a.full_name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{a.email}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-2.5 py-0.5 text-xs">
                        {a.role === "Quản lý cấp cao" ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {a.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditing(a)}
                          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-gold/15 hover:text-gold"
                          title="Sửa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        
                        {/* THÊM BẢO VỆ Ở GIAO DIỆN: Ẩn nút xóa nếu là Khách hàng */}
                        {a.role !== "Khách hàng" && (
                          <button
                            onClick={() => handleDelete(a)}
                            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive-foreground"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(editing || creating) && (
        <AccountForm
          initial={editing}
          existingIds={accounts.map((a) => a.user_id.toString())} 
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSubmit={handleSave}
        />
      )}

      {deleting && (
        <Modal title="Xác nhận xóa tài khoản?" onClose={() => setDeleting(null)}>
          <p className="text-sm">
            Bạn có chắc chắn muốn xóa tài khoản{" "}
            <strong className="text-gold">{deleting.full_name}</strong> (
            <span className="font-mono text-xs">{deleting.user_id}</span>)?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setDeleting(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30"
            >
              Hủy bỏ
            </button>
            <button
              onClick={confirmDelete}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              Xác nhận xóa
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function AccountForm({
  initial,
  existingIds, 
  onCancel,
  onSubmit,
}: {
  initial: Account | null;
  existingIds: string[];
  onCancel: () => void;
  onSubmit: (a: AccountFormData) => void; 
}) {
  const [form, setForm] = useState<AccountFormData>(
    initial ?? {
      user_id: 0, 
      full_name: "",
      phone_number: "",
      email: "",
      role: "Khách hàng",
      password: "", 
      auth_id: "", 
    },
  );
  const [error, setError] = useState("");

  const submit = () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      setError("Yêu cầu nhập đầy đủ Họ tên và Email");
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(form.phone_number.trim())) {
      setError("Số điện thoại không hợp lệ (Phải gồm đúng 10 chữ số)");
      return;
    }

    const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!strictEmailRegex.test(form.email.trim())) {
      setError("Email không đúng định dạng (Ví dụ: abc@gmail.com)");
      return;
    }
    
    if (!initial && (!form.password || form.password.length < 6)) {
      setError("Vui lòng nhập mật khẩu (tối thiểu 6 ký tự)");
      return;
    }

    setError(""); 
    onSubmit(form);
  };

  return (
    <Modal
      title={initial ? `Sửa tài khoản ${initial.user_id}` : "Thêm tài khoản mới"}
      onClose={onCancel}
    >
      <div className="space-y-3 text-sm">
        
        {initial && (
          <Field label="Mã tài khoản (User ID)">
            <input
              type="number"
              disabled={true}
              value={form.user_id}
              className="input bg-input/20 cursor-not-allowed opacity-70"
            />
          </Field>
        )}

        <Field label="Họ và tên">
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Số điện thoại">
          <input
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            disabled={!!initial} 
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={`input ${initial ? 'bg-input/20 cursor-not-allowed opacity-70' : ''}`}
          />
        </Field>
        
        {!initial && (
          <Field label="Mật khẩu khởi tạo">
            <input
              type="password"
              placeholder="Nhập ít nhất 6 ký tự"
              value={form.password || ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
            />
          </Field>
        )}
        
        <div className="grid grid-cols-1 gap-3">
          <Field label="Vai trò">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="input"
            >
              <option value="Quản lý cấp cao">Quản lý cấp cao</option>
              <option value="Nhân viên Sản xuất">Nhân viên Sản xuất</option>
              <option value="Nhân viên Kinh doanh">Nhân viên Kinh doanh</option>
              <option value="Khách hàng">Khách hàng</option>
            </select>
          </Field>
        </div>
        
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive-foreground">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30"
          >
            Hủy bỏ
          </button>
          <button
            onClick={submit}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02]"
          >
            <Save className="h-4 w-4" /> {initial ? "Cập nhật" : "Lưu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}