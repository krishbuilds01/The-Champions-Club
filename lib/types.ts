// The API contract. The web app uses these types today; a future mobile
// app consumes the same JSON. Dates are YYYY-MM-DD, times are minutes
// from midnight, money is whole rupees.
export type PlanDTO = {
  code: string;
  name: string;
  tennisPrice: number;
  cricketPrice: number;
  shopDiscount: number;
  barDiscount: number;
  termDays: number;
};

export type CourtDTO = { id: number; name: string; sport: string; walkinPrice: number };

export type ProductDTO = {
  id: number;
  name: string;
  price: number;
  stock: number | null;
  lowAt: number;
  category: "GEAR" | "BAR";
};

export type MemberState = "active" | "expiring" | "expired";

export type MemberDTO = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  plan: string;
  planCode: string;
  state: MemberState;
  expiresOn: string;
};

export type BookingDTO = {
  id: number;
  courtId: number;
  court: string;
  who: string;
  phone: string;
  date: string;
  start: number;
  type: "REGULAR" | "FRIDAY_SOCIAL" | "TRIAL";
  price: number;
  state: "BOOKED" | "CANCELLED";
};

export type MoneySplit = { courts: number; shop: number; bar: number; total: number };

export type DashboardDTO = {
  date: string;
  totals: MoneySplit;
  periods: { today: MoneySplit; week: MoneySplit; month: MoneySplit };
  byMethod: { method: "CASH" | "CARD" | "UPI" | "ONLINE"; amount: number }[];
  // byMethod covers shop + bar only (Booking has no payMethod yet):
  // byMethodTotal is what byMethod adds up to, courtUnrecorded is the
  // court takings with no recorded method, so total = byMethodTotal + courtUnrecorded.
  byMethodTotal: number;
  courtUnrecorded: number;
  onCourt: BookingDTO[];
  lowStock: ProductDTO[];
  expiring: ExpiringDTO[];
};

export type InvoiceDTO = {
  id: number;
  billedTo: string;
  detail: string;
  amount: number;
  taxRate: number | null;
  taxAmount: number | null;
  status: "UNPAID" | "PAID";
  issuedOn: string;
  paidAt: string | null;
};

export type TaxSummaryDTO = {
  from: string;
  to: string;
  invoiced: number;
  invoiceCount: number;
  invoiceTax: number;
  payrollTax: number;
  payrollCount: number;
  netTax: number;
};

export type ExpenseDTO = {
  id: number;
  title: string;
  category: string;
  amount: number;
  spentOn: string;
  note: string;
};

export type PayrollDTO = {
  id: number;
  staffName: string;
  month: string;
  salary: number;
  leaveDays: number;
  tax: number;
  net: number;
  status: "PENDING" | "PAID";
};

export type StaffRosterDTO = { id: number; name: string; role: string };

export type LeaveDTO = {
  id: number;
  staffId: number;
  staffName: string;
  role: string;
  fromDate: string;
  toDate: string;
  type: "ANNUAL" | "SICK" | "UNPAID" | "OTHER";
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type ShiftDTO = {
  id: number;
  staffId: number;
  staffName: string;
  role: string;
  date: string;
  part: "MORNING" | "EVENING";
};

export type ExpiringDTO = {
  id: number;
  name: string;
  phone: string;
  planName: string;
  expiresOn: string;
  daysLeft: number;
};

export type TabDTO = {
  id: number;
  who: string;
  tableNo: number | null;
  status: "OPEN" | "SETTLED";
  planCode: string;
  discountPct: number;
  subtotal: number;
  total: number;
  payMethod: "CASH" | "CARD" | "UPI" | null;
  items: { productId: number; name: string; qty: number; price: number }[];
};

export type EnquiryDTO = {
  id: number;
  name: string;
  contact: string;
  interest: string;
  message: string;
  status: "NEW" | "CONTACTED" | "QUOTED" | "CONVERTED" | "LOST";
  note: string;
  quotePlan: string | null;
  quoteAmount: number | null;
  quoteNote: string;
  quotedAt: string | null;
  memberId: number | null;
  createdAt: string;
};

export type OrderDTO = {
  id: number;
  name: string;
  phone: string;
  subtotal: number;
  discount: number;
  total: number;
  payMethod: "CASH" | "CARD" | "UPI" | "ONLINE";
  payState: "PENDING" | "PAID";
  fulfilment: "PICKUP" | "DELIVERY";
  address: string | null;
  createdAt: string;
  items: { productId: number; name: string; qty: number; price: number }[];
};

export type MemberSessionDTO = {
  id: number;
  name: string;
  email: string;
};

export type MemberHomeDTO = {
  member: MemberDTO;
  bookings: BookingDTO[];
  orders: OrderDTO[];
  tabs: TabDTO[];
};

export type StaffDTO = {
  id: number;
  name: string;
  email: string;
  role: "OWNER" | "STAFF" | "FRONT_DESK" | "BAR" | "SHOP";
};
