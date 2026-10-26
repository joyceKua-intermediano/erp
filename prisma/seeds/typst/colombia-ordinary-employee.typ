#import "/lib/layout.typ": contract
#import "/lib/format.typ": field, date, paragraphs, bilingual, facts
#import "/lib/signatures.typ": signature-row

#let data = json(bytes(sys.inputs.data))
#let c = data.contract
#let e = data.employee

#show: contract.with(data.cluster, title: "Contrato de trabajo " + c.number)

= Contrato de trabajo a término #if c.isOpenEnded [indefinido] else [fijo] (salario #if c.isIntegral [integral] else [ordinario])

#align(center, text(9pt, fill: luma(90))[
  Work contract – #if c.isOpenEnded [indefinite] else [fixed] term · N.º #c.number
])

#bilingual(
  facts((
    ([Empleador], data.cluster.legalName),
    ([Identificación], [#data.cluster.taxIdLabel: #field(data.cluster.taxId)]),
    ([Trabajador], e.name),
    ([Identificación], field(e.personalId)),
    ([Dirección], field(e.fullAddress)),
    ([Fecha de nacimiento], date(e.dateOfBirth, style: "short")),
    ([Cargo], field(c.jobTitle)),
    ([Salario], [#field(data.salary.formatted) (#field(data.salary.spelledLocal))]),
    ([Inicio], date(c.startDate)),
    ([Terminación], if c.isOpenEnded [Término indefinido] else { date(c.endDate) }),
  )),
  facts((
    ([Employer], data.cluster.legalName),
    ([Identification], [#data.cluster.taxIdLabel: #field(data.cluster.taxId)]),
    ([Employee], e.name),
    ([Personal ID], field(e.personalId)),
    ([Address], field(e.fullAddress)),
    ([Date of birth], date(e.dateOfBirth, style: "short")),
    ([Position], field(c.translatedPosition)),
    ([Salary], [#field(data.salary.formatted) (#field(data.salary.spelledEn))]),
    ([Start date], date(c.startDate, style: "longEn")),
    ([End date], if c.isOpenEnded [Indefinite term] else { date(c.endDate, style: "longEn") }),
  )),
)

#v(1em)

#bilingual(
  [
    Entre *#data.cluster.legalName*, que para los efectos del presente contrato se denominará el «Empleador», y *#e.name*, mayor de edad, identificado(a) como aparece al pie de su firma, que se denominará el «Empleado», hemos convenido en suscribir el presente contrato individual de trabajo, regulado por las normas laborales y en especial por las siguientes cláusulas:
  ],
  [
    Between *#data.cluster.legalName*, hereinafter the "Employer", and *#e.name*, of legal age, identified as shown below their signature, hereinafter the "Employee", we have agreed to sign this individual employment contract, governed by labor law and in particular by the following clauses:
  ],
)

#bilingual(
  [
    *PRIMERA. – OBJETO, INICIO Y DURACIÓN.* El contrato inicia el #date(c.startDate) y su duración es #if c.isOpenEnded [a término indefinido] else [hasta el #date(c.endDate)].
  ],
  [
    *FIRST. – PURPOSE, START AND DURATION.* The contract starts on #date(c.startDate, style: "longEn") and its duration is #if c.isOpenEnded [indefinite] else [until #date(c.endDate, style: "longEn")].
  ],
)

#bilingual(
  [
    *SEGUNDA. – SEDE DE TRABAJO.* El Empleado prestará sus servicios en #field(c.countryOfWork) en el cargo de #field(c.jobTitle), y podrá viajar dentro y fuera del territorio nacional según las funciones del cargo.
  ],
  [
    *SECOND. – PLACE OF WORK.* The Employee will work in #field(c.countryOfWork) as #field(c.translatedPosition), and may travel within and outside the national territory as the position requires.
  ],
)

#bilingual(
  [
    *TERCERA. – FUNCIONES.*
    #paragraphs(c.jobDescription, placeholder: [Según la descripción del cargo.])
  ],
  [
    *THIRD. – DUTIES.*
    #paragraphs(c.translatedJobDescription, placeholder: [As described in the job description.])
  ],
)

// Port the remaining clauses from the legacy Colombia template here.

#signature-row(data)
