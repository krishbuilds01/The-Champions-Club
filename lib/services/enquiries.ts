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
  const rows = await db.enquiry.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return rows.map(toDTO);
}

export async function updateEnquiry(
  id: number,
  input: { status?: EnquiryDTO["status"]; note?: string },
): Promise<EnquiryDTO> {
  const row = await db.enquiry.findUnique({ where: { id } });
  if (!row) throw notFound("No such enquiry");
  const updated = await db.enquiry.update({ where: { id }, data: input });
  return toDTO(updated);
}

export async function convertEnquiry(id: number, planCode: string): Promise<EnquiryDTO> {
  const row = await db.enquiry.findUnique({ where: { id } });
  if (!row) throw notFound("No such enquiry");
  if (row.status === "CONVERTED" || row.memberId) throw conflict("That enquiry already became a member");
  const phone = row.contact.replace(/\D/g, "").length >= 10 ? row.contact : "";
  const member = await createMember({ name: row.name, phone, planCode }).catch((e) => {
    throw e instanceof Error ? e : badRequest("Could not create the member");
  });
  const updated = await db.enquiry.update({
    where: { id },
    data: { status: "CONVERTED", memberId: member.id },
  });
  return toDTO(updated);
}
