import type { AdminRole } from "@/src/lib/admin-auth/policy";

export type DemoAdminUser = {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
  storeId?: string;
};

export const demoAdminUsers: DemoAdminUser[] = [
  {
    email: "hq@example.com",
    password: "demo-hq-pass",
    name: "本部管理者デモ",
    role: "hq_admin",
  },
  {
    email: "store@example.com",
    password: "demo-store-pass",
    name: "店舗責任者デモ",
    role: "store_admin",
    storeId: "mock-store-solaria",
  },
];

export function findDemoAdminUser(email: string, password: string) {
  return (
    demoAdminUsers.find(
      (user) => user.email === email.toLowerCase() && user.password === password,
    ) ?? null
  );
}
