import { db } from "../db";
import { badRequest, conflict, notFound } from "../errors";
import type { EnquiryDTO } from "../types";
import { createMember } from "./members";

// Enquiries are the club's CRM: a visitor asks (website form, trial
// booking, front desk), staff work the list, and a good enquiry becomes
// a member with one action. Nothing falls through a crack.

type EnquiryRow = {
  id: number;
  name: string;
  contact: string;
  interest: string;
  message: string;
  status: EnquiryDTO["status"];
  note: string;
  quotePlan: string | null;
  quoteAmount: number | null;
  quoteNote: string;
  quotedAt: Date | null;
  memberId: number | null;
  createdAt: Date;
};

const toDTO = (e: EnquiryRow): EnquiryDTO => ({
  id: e.id,
  name: e.name,
  contact: e.contact,
  interest: e.interest,
  message: e.message,
  status: e.status,
  note: e.note,
  quotePlan: e.quotePlan,
  quoteAmount: e.quoteAmount,
  quoteNote: e.quoteNote,
  quotedAt: e.quotedAt?.toISOString() ?? null,
  memberId: e.memberId,
  createdAt: e.createdAt.toISOString(),
});

export async function createEnquiry(input: {
  name: string;
  contact: string;
  interest: string;
  message: string;
}): Promise<EnquiryDTO> {
  const row = await db.enquiry.create({ data: input });
  return toDTO(row);
}

export async function listEnquiries(): Promise<EnquiryDTO[]> {
  const rows = await db.enquiry.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toDTO);
}

export async function updateEnquiry(
  id: number,
  input: { status?: EnquiryDTO["status"]; note?: string },
): Promise<EnquiryDTO> {
  const row = await db.enquiry.findUnique({ where: { id } });
  if (!row) throw notFound("No such enquiry");
  if (input.status === "CONVERTED")
    throw badRequest("Use the convert action to turn an enquiry into a member");
  const updated = await db.enquiry.update({ where: { id }, data: input });
  return toDTO(updated);
}

// Record the quote staff sent (plan, price, note) and move the
// enquiry to QUOTED. Sending happens on the phone or WhatsApp as
// usual — this is the club's record that it went, and for how much.
export async function quoteEnquiry(
  id: number,
  input: { planCode: string; amount: number; note: string },
): Promise<EnquiryDTO> {
  const row = await db.enquiry.findUnique({ where: { id } });
  if (!row) throw notFound("No such enquiry");
  if (row.status === "CONVERTED" || row.status === "LOST")
    throw conflict("That enquiry is closed — no quote to send");
  const plan = await db.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw badRequest("Pick a plan that exists");
  const updated = await db.enquiry.update({
    where: { id },
    data: {
      status: "QUOTED",
      quotePlan: plan.name,
      quoteAmount: input.amount,
      quoteNote: input.note,
      quotedAt: new Date(),
    },
  });
  return toDTO(updated);
}

export async function convertEnquiry(id: number, planCode: string): Promise<EnquiryDTO> {
  const row = await db.enquiry.findUnique({ where: { id } });
  if (!row) throw notFound("No such enquiry");
  if (row.status === "CONVERTED" || row.memberId) throw conflict("That enquiry already became a member");
  const contact = row.contact.trim();
  const isEmail = contact.includes("@");
  const phone = !isEmail && contact.replace(/\D/g, "").length >= 10 ? contact : "";
  const email = isEmail ? contact : undefined;
  const member = await createMember({ name: row.name, phone, email, planCode }).catch((e) => {
    throw e instanceof Error ? e : badRequest("Could not create the member");
  });
  const updated = await db.enquiry.update({
    where: { id },
    data: { status: "CONVERTED", memberId: member.id },
  });
  return toDTO(updated);
}
