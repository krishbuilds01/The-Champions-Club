import type { BookingDTO, CourtDTO, DashboardDTO, EnquiryDTO, ExpenseDTO, ExpiringDTO, InvoiceDTO, MemberDTO, MemberHomeDTO, MemberSessionDTO, OrderDTO, PayrollDTO, PlanDTO, ProductDTO, ShiftDTO, StaffDTO, StaffRosterDTO, TabDTO, TaxSummaryDTO } from "./types";

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
        tennisPrice: number;
        cricketPrice: number;
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
    type?: "REGULAR" | "TRIAL" | "FRIDAY_SOCIAL";
  }) => post<BookingDTO>("/bookings", input),
  bookings: (date?: string) => call<BookingDTO[]>(`/bookings${date ? `?date=${date}` : ""}`),
  cancelBooking: (id: number) => post<BookingDTO>(`/bookings/${id}/cancel`),
  members: (q?: string) => call<MemberDTO[]>(`/members${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  expiringMembers: () => call<ExpiringDTO[]>("/members/expiring"),
  createMember: (input: { name: string; phone?: string; email?: string; planCode: string; dateOfBirth?: string }) =>
    post<MemberDTO>("/members", input),
  renewMember: (id: number) => post<MemberDTO>(`/members/${id}/renew`, {}),
  createOrder: (input: {
    items: { productId: number; qty: number }[];
    name: string;
    phone: string;
    payMethod: "CASH" | "CARD" | "UPI";
    fulfilment?: "PICKUP" | "DELIVERY";
    address?: string;
    payOnline?: boolean;
  }) => post<OrderDTO & { razorpayOrderId?: string }>("/orders", input),
  orders: () => call<OrderDTO[]>("/orders"),
  invoices: () => call<InvoiceDTO[]>("/invoices"),
  createInvoice: (input: { billedTo: string; detail?: string; amount: number; taxRate?: number }) => post<InvoiceDTO>("/invoices", input),
  taxSummary: (from: string, to: string) => call<TaxSummaryDTO>(`/reports/tax?from=${from}&to=${to}`),
  payInvoice: (id: number) => post<InvoiceDTO>(`/invoices/${id}/pay`, {}),
  expenses: () => call<ExpenseDTO[]>("/expenses"),
  createExpense: (input: { title: string; category?: string; amount: number; spentOn: string; note?: string }) => post<ExpenseDTO>("/expenses", input),
  payroll: () => call<PayrollDTO[]>("/payroll"),
  createPayroll: (input: { staffName: string; month: string; salary: number; leaveDays?: number; tax?: number }) => post<PayrollDTO>("/payroll", input),
  payPayroll: (id: number) => post<PayrollDTO>(`/payroll/${id}/pay`, {}),
  staffRoster: () => call<StaffRosterDTO[]>("/staff"),
  createStaff: (input: { name: string; email: string; password: string; role: StaffDTO["role"] }) =>
    post<StaffRosterDTO>("/staff", input),
  removeStaff: (id: number) => call<{ ok: true }>(`/staff/${id}`, { method: "DELETE" }),
  shifts: (from: string, to: string) => call<ShiftDTO[]>(`/shifts?from=${from}&to=${to}`),
  assignShift: (input: { staffId: number; date: string; part: "MORNING" | "EVENING" }) => post<ShiftDTO>("/shifts", input),
  removeShift: (id: number) => call<{ ok: true }>(`/shifts/${id}`, { method: "DELETE" }),
  payConfig: () => call<{ enabled: boolean; keyId: string | null }>("/payments/config"),
  confirmPayment: (id: number, proof: { razorpayOrderId: string; paymentId: string; signature: string }) =>
    post<OrderDTO>(`/orders/${id}/pay-confirm`, proof),
  tabs: () => call<TabDTO[]>("/tabs"),
  openTab: (input: { who: string; tableNo?: number }) => post<TabDTO>("/tabs", input),
  addTabItems: (id: number, items: { productId: number; qty: number }[]) =>
    post<TabDTO>(`/tabs/${id}/items`, { items }),
  settleTab: (id: number, payMethod: "CASH" | "CARD" | "UPI") =>
    post<TabDTO>(`/tabs/${id}/settle`, { payMethod }),
  createEnquiry: (input: { name: string; contact: string; interest: string; message?: string }) =>
    post<EnquiryDTO>("/enquiries", input),
  enquiries: () => call<EnquiryDTO[]>("/enquiries"),
  updateEnquiry: (id: number, patch: { status?: EnquiryDTO["status"]; note?: string }) =>
    call<EnquiryDTO>(`/enquiries/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  convertEnquiry: (id: number, planCode: string) => post<EnquiryDTO>(`/enquiries/${id}/convert`, { planCode }),
  quoteEnquiry: (id: number, input: { planCode: string; amount: number; note?: string }) => post<EnquiryDTO>(`/enquiries/${id}/quote`, input),
  dashboard: (date?: string) => call<DashboardDTO>(`/dashboard${date ? `?date=${date}` : ""}`),
  login: (email: string, password: string) => post<{ staff: StaffDTO }>("/auth/login", { email, password }),
  logout: () => post<{ ok: boolean }>("/auth/logout"),
  me: () => call<{ staff: StaffDTO }>("/auth/me"),
  memberLogin: (email: string, password: string) => post<{ member: MemberSessionDTO }>("/member/login", { email, password }),
  memberLogout: () => post<{ ok: boolean }>("/member/logout"),
  memberMe: () => call<MemberHomeDTO>("/member/me"),
  memberBook: (input: { courtId: number; date: string; start: number }) => post<BookingDTO>("/member/bookings", input),
  memberRenew: () => post<MemberDTO>("/member/renew", {}),
  memberOrder: (input: { items: { productId: number; qty: number }[]; payMethod: "CASH" | "CARD" | "UPI"; fulfilment?: "PICKUP" | "DELIVERY"; address?: string; payOnline?: boolean }) => post<OrderDTO & { razorpayOrderId?: string }>("/member/orders", input),
};
