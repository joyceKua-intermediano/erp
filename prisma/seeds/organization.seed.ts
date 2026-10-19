import type { Prisma } from "../../lib/generated/prisma/client"
import { ids, timestamps } from "./ids"

export const intermedianoCompanies = [
  {
    id: ids.intermedianoCompany.colombia,
    name: "Intermediano Colombia SAS",
    contact_name: "Laura Gomez",
    mobile_number: "+57 300 000 0001",
    email: "colombia@intermediano.test",
    address: "Calle 100 #10-20, Bogota",
    tax_id: "900000001-1",
    country_id: ids.country.colombia,
    ...timestamps,
  },
  {
    id: ids.intermedianoCompany.canada,
    name: "Intermediano Canada",
    contact_name: "Mark Tremblay",
    mobile_number: "+1 416 000 0001",
    email: "canada@intermediano.test",
    address: "100 King St W, Toronto",
    tax_id: "CA-000000001",
    country_id: ids.country.canada,
    ...timestamps,
  },
] satisfies Prisma.intermediano_companiesCreateManyInput[]

export const consultants = [
  {
    id: ids.consultant.andrea,
    country_id: ids.country.colombia,
    name: "Andrea Ruiz",
    email: "andrea.ruiz@intermediano.test",
    mobile_number: "+57 300 000 0002",
    ...timestamps,
  },
] satisfies Prisma.consultantsCreateManyInput[]

export const partners = [
  {
    id: ids.partner.mapleStaffing,
    country_id: ids.country.canada,
    partner_type: "Payroll",
    partner_name: "Maple Staffing Inc.",
    contact_name: "Chloe Martin",
    mobile_number: "+1 514 000 0001",
    tax_id: "CA-000000002",
    email: "ops@maplestaffing.test",
    address: "500 Rue Sherbrooke, Montreal",
    ...timestamps,
  },
] satisfies Prisma.partnersCreateManyInput[]
