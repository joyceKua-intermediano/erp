import type { TemplateDocument } from "../../../lib/templates/blocks"

// Partial port of the legacy Colombia ordinary employee contract; the remaining clauses still need porting.
export const colombiaOrdinaryEmployee: TemplateDocument = {
  version: 1,
  bilingual: true,
  bordered: true,
  blocks: [
    {
      id: "title-open",
      type: "title",
      condition: "open_ended",
      text: "Contrato de trabajo a término indefinido",
      translation: "Work contract – indefinite term · N.º {{contract.number}}",
    },
    {
      id: "title-fixed",
      type: "title",
      condition: "fixed_term",
      text: "Contrato de trabajo a término fijo",
      translation: "Work contract – fixed term · N.º {{contract.number}}",
    },
    {
      id: "parties",
      type: "details",
      condition: "always",
      rows: [
        { label: "Empleador", value: "{{cluster.legalName}}", labelTranslation: "Employer", valueTranslation: "" },
        {
          label: "Identificación",
          value: "{{cluster.taxIdLabel}}: {{cluster.taxId}}",
          labelTranslation: "Identification",
          valueTranslation: "",
        },
        { label: "Trabajador", value: "{{employee.name}}", labelTranslation: "Employee", valueTranslation: "" },
        { label: "Identificación", value: "{{employee.personalId}}", labelTranslation: "Personal ID", valueTranslation: "" },
        { label: "Dirección", value: "{{employee.fullAddress}}", labelTranslation: "Address", valueTranslation: "" },
        {
          label: "Fecha de nacimiento",
          value: "{{employee.dateOfBirth.short}}",
          labelTranslation: "Date of birth",
          valueTranslation: "",
        },
        {
          label: "Cargo",
          value: "{{contract.jobTitle}}",
          labelTranslation: "Position",
          valueTranslation: "{{contract.translatedPosition}}",
        },
        {
          label: "Salario",
          value: "{{salary.formatted}} ({{salary.spelledLocal}})",
          labelTranslation: "Salary",
          valueTranslation: "{{salary.formatted}} ({{salary.spelledEn}})",
        },
        {
          label: "Inicio",
          value: "{{contract.startDate.long}}",
          labelTranslation: "Start date",
          valueTranslation: "{{contract.startDate.longEn}}",
        },
      ],
    },
    {
      id: "intro",
      type: "clause",
      condition: "always",
      heading: "",
      text: "Entre {{cluster.legalName}}, que para los efectos del presente contrato se denominará el «Empleador», y {{employee.name}}, mayor de edad, identificado(a) como aparece al pie de su firma, que se denominará el «Empleado», hemos convenido en suscribir el presente contrato individual de trabajo, regulado por las normas laborales y en especial por las siguientes cláusulas:",
      headingTranslation: "",
      translation:
        'Between {{cluster.legalName}}, hereinafter the "Employer", and {{employee.name}}, of legal age, identified as shown below their signature, hereinafter the "Employee", we have agreed to sign this individual employment contract, governed by labor law and in particular by the following clauses:',
    },
    {
      id: "first-open",
      type: "clause",
      condition: "open_ended",
      heading: "PRIMERA. – OBJETO, INICIO Y DURACIÓN.",
      text: "El contrato inicia el {{contract.startDate.long}} y su duración es a término indefinido.",
      headingTranslation: "FIRST. – PURPOSE, START AND DURATION.",
      translation: "The contract starts on {{contract.startDate.longEn}} and its duration is indefinite.",
    },
    {
      id: "first-fixed",
      type: "clause",
      condition: "fixed_term",
      heading: "PRIMERA. – OBJETO, INICIO Y DURACIÓN.",
      text: "El contrato inicia el {{contract.startDate.long}} y termina el {{contract.endDate.long}}.",
      headingTranslation: "FIRST. – PURPOSE, START AND DURATION.",
      translation: "The contract starts on {{contract.startDate.longEn}} and ends on {{contract.endDate.longEn}}.",
    },
    {
      id: "second",
      type: "clause",
      condition: "always",
      heading: "SEGUNDA. – SEDE DE TRABAJO.",
      text: "El Empleado prestará sus servicios en {{contract.countryOfWork}} en el cargo de {{contract.jobTitle}}, y podrá viajar dentro y fuera del territorio nacional según las funciones del cargo.",
      headingTranslation: "SECOND. – PLACE OF WORK.",
      translation:
        "The Employee will work in {{contract.countryOfWork}} as {{contract.translatedPosition}}, and may travel within and outside the national territory as the position requires.",
    },
    {
      id: "duties",
      type: "jobDescription",
      condition: "always",
      heading: "TERCERA. – FUNCIONES.",
      headingTranslation: "THIRD. – DUTIES.",
    },
    { id: "signatures", type: "signatures", condition: "always" },
  ],
}
