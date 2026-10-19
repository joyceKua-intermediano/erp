import type { Prisma } from "../../lib/generated/prisma/client"
import { ids, timestamps } from "./ids"

export const companies = [
  {
    id: ids.company.acmeLogistics,
    user_id: ids.user.salesLead,
    name: "Acme Logistics",
    website: "https://acme-logistics.test",
    tax_id: "US-000000001",
    country: "United States",
    city: "Miami",
    address: "200 Biscayne Blvd",
    industry_field_id: ids.industryField.logistics,
    number_of_employees: 450,
    is_customer: true,
    ...timestamps,
  },
  {
    id: ids.company.northwindSoftware,
    user_id: ids.user.salesLead,
    name: "Northwind Software",
    website: "https://northwind.test",
    tax_id: "CA-000000003",
    country: "Canada",
    city: "Toronto",
    address: "80 Spadina Ave",
    industry_field_id: ids.industryField.software,
    number_of_employees: 120,
    is_customer: true,
    ...timestamps,
  },
] satisfies Prisma.companiesCreateManyInput[]

export const contacts = [
  {
    id: ids.contact.acmeMain,
    company_id: ids.company.acmeLogistics,
    contact_name: "Rachel",
    surname: "Stone",
    email: "rachel.stone@acme-logistics.test",
    mobile: "+1 305 000 0001",
    position: "HR Director",
    department: "Human Resources",
    is_main_contact: true,
    ...timestamps,
  },
  {
    id: ids.contact.northwindMain,
    company_id: ids.company.northwindSoftware,
    contact_name: "Daniel",
    surname: "Lee",
    email: "daniel.lee@northwind.test",
    mobile: "+1 416 000 0002",
    position: "Talent Lead",
    department: "People",
    is_main_contact: true,
    ...timestamps,
  },
] satisfies Prisma.contactsCreateManyInput[]

export const leads = [
  {
    id: ids.lead.acmeExpansion,
    user_id: ids.user.admin,
    opportunity_owner: ids.user.salesLead,
    company_id: ids.company.acmeLogistics,
    contact_id: ids.contact.acmeMain,
    lead: "Acme Logistics",
    opportunity_name: "Acme LATAM expansion",
    country: "Colombia",
    opportunity_type: "EOR",
    lead_source: "Referral",
    lead_status: "Qualified",
    number_of_contractors: 5,
    estimated_tender_value: "120000.00",
    estimated_close_date: new Date("2026-03-31"),
    ...timestamps,
  },
] satisfies Prisma.leadsCreateManyInput[]
