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
  byMethod: { method: "CASH" | "CARD" | "UPI"; amount: number }[];
  onCourt: BookingDTO[];
  lowStock: ProductDTO[];
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
  payMethod: "CASH" | "CARD" | "UPI";
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
