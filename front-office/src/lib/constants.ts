export const DEFAULT_CUSTOMER_ROLE = "Khách hàng" as const;

export const ROLES = {
  CUSTOMER: "Khách hàng",
  PRODUCER: "Nhân viên Sản xuất",
  MANAGER: "Quản lý cấp cao",
  SALES: "Nhân viên Kinh doanh",
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];
