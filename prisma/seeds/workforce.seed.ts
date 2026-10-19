import type { Prisma } from "../../lib/generated/prisma/client"
import { ids, MOCK_PASSWORD_HASH, timestamps } from "./ids"

export const employees = [
  {
    id: ids.employee.juan,
    name: "Juan Perez",
    consultant_id: ids.consultant.andrea,
    email: "juan.perez@employee.test",
    password: MOCK_PASSWORD_HASH,
    company: "Intermediano Colombia SAS",
    ...timestamps,
  },
  {
    id: ids.employee.camila,
    name: "Camila Torres",
    consultant_id: ids.consultant.andrea,
    email: "camila.torres@employee.test",
    password: MOCK_PASSWORD_HASH,
    company: "Intermediano Colombia SAS",
    ...timestamps,
  },
  {
    id: ids.employee.lucas,
    name: "Lucas Almeida",
    email: "lucas.almeida@employee.test",
    password: MOCK_PASSWORD_HASH,
    company: "Intermediano do Brasil Ltda",
    ...timestamps,
  },
] satisfies Prisma.employeesCreateManyInput[]

export const personalInformation = [
  {
    id: ids.personalInformation.juan,
    employee_id: ids.employee.juan,
    gender: "Male",
    civil_status: "Married",
    date_of_birth: new Date("1990-04-12"),
    is_local: true,
    nationality: "Colombian",
    city: "Medellin",
    country: "Colombia",
    state: "Antioquia",
    address: "Carrera 43A #1-50",
    postal_code: "050021",
    mobile: "+57 300 000 0003",
    education_attainment: "Bachelor",
    education_status: "Completed",
    number_of_dependents: 1,
    ...timestamps,
  },
] satisfies Prisma.personal_informationCreateManyInput[]

export const emergencyContacts = [
  {
    id: ids.emergencyContact.juanSpouse,
    personal_information_id: ids.personalInformation.juan,
    emergency_contact_name: "Maria Perez",
    relationship: "Spouse",
    mobile_number: "+57 300 000 0004",
    email: "maria.perez@family.test",
    ...timestamps,
  },
] satisfies Prisma.emergency_contactsCreateManyInput[]

export const dependents = [
  {
    id: ids.dependent.juanChild,
    personal_information_id: ids.personalInformation.juan,
    full_name: "Sofia Perez",
    relationship: "Daughter",
    date_of_birth: new Date("2018-09-03"),
    ...timestamps,
  },
] satisfies Prisma.dependentsCreateManyInput[]

export const documents = [
  {
    id: ids.document.juanId,
    employee_id: ids.employee.juan,
    personal_id: "CC-1000000001",
    organism: "Registraduria Nacional",
    tax_id: "1000000001-5",
    expiration: new Date("2034-04-12"),
    is_driver_license: false,
    has_insurance: true,
    category: "National ID",
    ...timestamps,
  },
] satisfies Prisma.documentsCreateManyInput[]

export const bankingDetails = [
  {
    id: ids.bankingDetail.juanPayroll,
    document_id: ids.document.juanId,
    bank_name: "Bancolombia",
    branch_name: "El Poblado",
    bank_code: "007",
    account_number: "0000000001",
    account_type: "Savings",
    bank_account_currency: "COP",
    ...timestamps,
  },
] satisfies Prisma.banking_detailsCreateManyInput[]

export const socialSecurityInfos = [
  {
    id: ids.socialSecurityInfo.juan,
    document_id: ids.document.juanId,
    health_fund: "EPS Sura",
    pension_fund: "Porvenir",
    severance_fund: "Porvenir",
    ...timestamps,
  },
] satisfies Prisma.social_security_infosCreateManyInput[]

export const employeeFiles = [
  {
    id: ids.employeeFile.juanIdScan,
    document_id: ids.document.juanId,
    document_type: "National ID",
    file_path: "employee-files/mock/juan-perez-id.pdf",
    original_file_name: "juan-perez-id.pdf",
    ...timestamps,
  },
] satisfies Prisma.employee_filesCreateManyInput[]
