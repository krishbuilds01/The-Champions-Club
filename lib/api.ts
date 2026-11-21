import type { BookingDTO, CourtDTO, DashboardDTO, MemberDTO, PlanDTO, ProductDTO, StaffDTO } from "./types";

// The web app's one door to the API. Every page fetches through here, so
// error handling and the base path live in exactly one place. A mobile
// app would call the same endpoints with its own client.
export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError(0, "Cannot reach the club server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new ApiClientError(res.status, data?.error ?? "Something went wrong");
  return data as T;
}

const post = <T>(path: string, body?: unknown) =>
  call<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  plans: () => call<PlanDTO[]>("/plans"),
  courts: () => call<CourtDTO[]>("/courts"),
  products: (category?: "GEAR" | "BAR") =>
    call<ProductDTO[]>(`/products${category ? `?category=${category}` : ""}`),
  availability: (courtId: number, date: string) =>
    call<{ taken: number[] }>(`/availability?courtId=${courtId}&date=${date}`),
  schedule: (date: string) => call<BookingDTO[]>(`/schedule?date=${date}`),
  lookupMember: (name: string) =>
    call<{
      member: {
        name: string;
        plan: string;
        planCode: string;
        state: "active" | "expiring" | "expired";
        courtPrice: number;
        shopDiscount: number;
        barDiscount: number;
      } | null;
    }>(`/members/lookup?name=${encodeURIComponent(name)}`),
  createBooking: (input: {
    courtId: number;
    date: string;
    start: number;
    name: string;
    phone?: string;
    type?: "REGULAR" | "TRIAL";
  }) => post<BookingDTO>("/bookings", input),
  bookings: (date?: string) => call<BookingDTO[]>(`/bookings${date ? `?date=${date}` : ""}`),
  cancelBooking: (id: number) => post<BookingDTO>(`/bookings/${id}/cancel`),
  members: (q?: string) => call<MemberDTO[]>(`/members${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createMember: (input: { name: string; phone?: string; planCode: string }) =>
    post<MemberDTO>("/members", input),
  createOrder: (input: {
    items: { productId: number; qty: number }[];
    memberName?: string;
    payMethod: "CASH" | "CARD" | "UPI";
  }) => post<{ id: number; subtotal: number; discount: number; total: number }>("/orders", input),
  adjustStock: (input: { productId: number; delta: number }) =>
    post<ProductDTO>("/inventory/adjust", input),
  createProduct: (input: {
    name: string;
    price: number;
    stock?: number;
    lowAt?: number;
    category: "GEAR" | "BAR";
  }) => post<ProductDTO>("/products", input),
  settleTab: (input: {
    items: { productId: number; qty: number }[];
    planCode: string;
    payMethod: "CASH" | "CARD" | "UPI";
  }) => post<{ id: number; subtotal: number; discount: number; total: number }>("/tabs", input),
  dashboard: (date?: string) => call<DashboardDTO>(`/dashboard${date ? `?date=${date}` : ""}`),
  login: (email: string, password: string) => post<{ staff: StaffDTO }>("/auth/login", { email, password }),
  loginPin: (pin: string) => post<{ staff: StaffDTO }>("/auth/pin", { pin }),
  logout: () => post<{ ok: boolean }>("/auth/logout"),
  me: () => call<{ staff: StaffDTO }>("/auth/me"),
};
