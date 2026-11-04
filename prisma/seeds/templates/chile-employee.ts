import type { TemplateDocument } from "../../../lib/templates/blocks"

// Port of the legacy Intermediano Chile SPA individual employment contract (Spanish left, English right).
export const chileEmployee: TemplateDocument = {
  version: 1,
  bilingual: true,
  bordered: true,
  blocks: [
    {
      id: "title",
      type: "title",
      condition: "always",
      text: "Contrato de trabajo",
      translation: "Employment contract",
    },
    {
      id: "parties",
      type: "clause",
      condition: "always",
      heading: "",
      text: 'En Santiago de Chile, {{contract.createdDate.long}}, entre {{cluster.legalName}}, Rol Único Tributario Nº. {{cluster.taxId}}, {{cluster.address}}, representada legalmente por el Sr. Fabian Castro Sepúlveda, ambos con domicilio en Santiago, Chile, en adelante "el Empleador" o "{{cluster.legalName}}", por una parte; y por la otra, {{employee.name}}, con RUN {{employee.personalId}}, Nacionalidad {{employee.nationality}}, con domicilio en {{employee.fullAddress}}, en adelante "el Trabajador", de acuerdo al siguiente contrato individual de trabajo:',
      headingTranslation: "",
      translation:
        'In Santiago, Chile, {{contract.createdDate.longEn}}, between {{cluster.legalName}}, Unique Tax Identification Nº. {{cluster.taxId}}, {{cluster.address}}, legally represented by Mr. Fabian Castro Sepúlveda, both residing at Santiago, Chile, hereinafter "the Employer" or "{{cluster.legalName}}", by one side; and by the other, {{employee.name}}, with RUN {{employee.personalId}}, Nationality {{employee.nationality}}, with address at {{employee.fullAddress}}, hereinafter referred to as "the Employee", in accordance with the following individual employment contract:',
    },
    {
      id: "first",
      type: "clause",
      condition: "always",
      heading: "PRIMERO:",
      text: "El Trabajador acepta desempeñarse como {{contract.translatedPosition}}. Se espera que este puesto tenga responsabilidad sobre las funciones/tareas. Las funciones iniciales se encuentran en el Anexo I, como se indica allí, pero no se limitan a ellas.",
      headingTranslation: "FIRST:",
      translation:
        "The Employee agrees to work as a {{contract.jobTitle}}, this position is expected to have responsibility for the following roles/tasks. Initial roles at Annex I as stated there but not limited to those.",
    },
    {
      id: "second",
      type: "clause",
      condition: "always",
      heading: "SEGUNDO:",
      text: "El Trabajador trabajará en {{employee.fullAddress}} y se compromete a seguir las directrices dadas por el empleador, y a cumplir con las políticas y normas de conducta establecidas por el empleador para sus trabajadores.",
      headingTranslation: "SECOND:",
      translation:
        "The Employee will work from {{employee.fullAddress}} and agrees to follow the guidelines given by the employer to give orders as well as to be compliant with the policies and standards of conduct set by the Employer.",
    },
    {
      id: "third",
      type: "clause",
      condition: "always",
      heading: "TERCERO:",
      text: "Se establece que dada la naturaleza de la función realizada por el Trabajador se excluye de la limitación de las horas de trabajo de conformidad con lo dispuesto en el párrafo segundo del artículo 22 del Código del Trabajo.",
      headingTranslation: "THIRD:",
      translation:
        "It is established that given the nature of the function performed by the Employee it is excluded from the limitation of working hours in accordance with the provisions of the second paragraph of Article 22 of the Labor Code.",
    },
    {
      id: "fourth",
      type: "clause",
      condition: "always",
      heading: "CUARTO:",
      text: "El Empleador pagará al Trabajador, por sus servicios lo siguiente:\n\nUn sueldo base mensual bruto de {{salary.currencyCode}} {{salary.formatted}} bruto/mes ({{salary.spelledLocal}}) el cual será pagado en efectivo o cheque en las instalaciones del empleador o mediante depósito o transferencia electrónica a la cuenta bancaria del Trabajador, el último día hábil del mes.\n\nGratificación: Las partes acuerdan que el trabajador percibirá mensualmente una gratificación legal del 25%, con tope anual de 4,75 ingresos mínimos mensuales según artículo 50 del Código del Trabajo.",
      headingTranslation: "FOURTH:",
      translation:
        "The Employer shall pay the Employee, for his services, the following remuneration and allowances:\n\nA gross basic monthly salary of {{salary.currencyCode}} {{salary.formatted}} gross/month ({{salary.spelledEn}}) which will be settled and paid in cash or check at the Employer's location or through deposit or electronic transfer into the Employee's bank account, the last day of the month.\n\nGratification: The parties agree that the employee will receive a legal gratification of the 25%, with an annual ceiling of 4,75 of the minimum monthly income according to Article 50 of the Working Code.",
    },
    {
      id: "fifth-open",
      type: "clause",
      condition: "open_ended",
      heading: "QUINTO:",
      text: "A todos los efectos legales del presente contrato, se establece expresamente que el Trabajador comenzó a desempeñar sus funciones el {{contract.startDate.long}}, y el contrato tendrá una duración de 90 días, tras los cuales se convertirá en indefinido.",
      headingTranslation: "FIFTH:",
      translation:
        "For all legal purposes of this contract, it is expressly stated that the Worker began to perform his duties on {{contract.startDate.longEn}}, and the contract will last for 90 days, after which it will become indefinite.",
    },
    {
      id: "fifth-fixed",
      type: "clause",
      condition: "fixed_term",
      heading: "QUINTO:",
      text: "A todos los efectos legales del presente contrato, se establece expresamente que el Trabajador comenzó a desempeñar sus funciones el {{contract.startDate.long}}, y el contrato tendrá vigencia hasta el {{contract.endDate.long}}.",
      headingTranslation: "FIFTH:",
      translation:
        "For all legal purposes of this contract, it is expressly stated that the Worker began to perform his duties on {{contract.startDate.longEn}}, and the contract will last until {{contract.endDate.longEn}}.",
    },
    {
      id: "sixth",
      type: "clause",
      condition: "always",
      heading: "SEXTO:",
      text: "Para todos los efectos del presente contrato, se establece que el Trabajador no ha tenido que cambiar su lugar de residencia en virtud de este contrato.",
      headingTranslation: "SIXTH:",
      translation:
        "For all the effects that may take place, it is stated that the Employee did not have to change his place of residence by reason of this contract.",
    },
    {
      id: "seventh",
      type: "clause",
      condition: "always",
      heading: "SÉPTIMO:",
      text: "Las causas de terminación de este contrato de trabajo están contenidas en los artículos 159, 160 y 161 del Código de Derecho del Trabajo y en el futuro se establezcan por ley, todos los cuales se incorporan expresamente por referencia y que se consideran formar parte de este contrato.",
      headingTranslation: "SEVENTH:",
      translation:
        "The termination causes of this employment contract are contained in Articles 159, 160 and 161 of the Labor Law Code and in the future be established by law, all of which are hereby expressly incorporated by reference and deemed to form part of this contract.",
    },
    {
      id: "eighth",
      type: "clause",
      condition: "always",
      heading: "OCTAVO:",
      text: "Para los efectos de este contrato, el Trabajador reconoce haber sido entrenado por el empleador para el papel y las funciones a realizar y se establece que el Trabajador recibió una copia del Reglamento Interno de Orden Higiene y Seguridad.",
      headingTranslation: "EIGHTH:",
      translation:
        "For the purposes of this contract, the Employee acknowledges to have been trained by the Employer for the role and functions to be performed and it is stated that the Employee received a copy of the Rules of Order Health and Safety.",
    },
    {
      id: "ninth",
      type: "clause",
      condition: "always",
      heading: "NOVENO:",
      text: "El Trabajador tiene expresamente prohibido realizar cualquier actividad que puede ser conflicto real o potencial con los intereses del empleador. El Trabajador también está prohibido para desarrollar o llevar a cabo, directamente a través de terceros, actividades que están dentro de la línea actual o futuro de los negocios.",
      headingTranslation: "NINTH:",
      translation:
        "The Employee is expressly prohibited from carrying out any activity that is or may reasonably be expected to be in actual or potential conflict with the interests of the Employer. The Employee is also prohibited to develop or carry out, directly or through third parties, activities that are within the current or future line of business.",
    },
    {
      id: "tenth",
      type: "clause",
      condition: "always",
      heading: "DÉCIMO:",
      text: "En el ejercicio de sus funciones, el trabajador, directa o indirectamente, en forma oral o escrita, tendrá acceso a la información relacionada con el funcionamiento del empleador, y sus respectivos clientes y/o proveedores, respecto de la cual el Trabajador reconoce que se trata de información secreta, privada y confidencial. Por lo tanto, a menos que cuente con la autorización previa y expresa del Contratante, el Trabajador tiene prohibido, durante la vigencia de este acuerdo y después de su terminación (i) utilizar para su propio beneficio o en beneficio de cualquier tercero, (ii) facilitar o (iii) permitir el uso en una forma o efecto, que pueda afectar negativamente, de cualquier manera el nombre o los intereses del negocio del empleador, cualquier información confidencial del empleador, y especialmente de cualquiera de las empresas vinculadas y sus subsidiarias, accionistas, directores, representantes, trabajadores, clientes y proveedores, a la que el Trabajador pudiera tener acceso en el ejercicio de sus funciones.",
      headingTranslation: "TENTH:",
      translation:
        "In the performance of his duties, the Employee, directly or indirectly, orally or in written, will have access to information related to the operation of the Employer, and their respective clients and/or providers, which the Employee acknowledges is secret, proprietary, private and confidential. Therefore, unless express and prior authorization of the Employer, Employee is forbidden, during the term of this agreement and after its termination, to (i) use for his own benefit or for the benefit of any other third party, (ii) facilitate or (iii) allow the use in a form or effect that could adversely affect in any manner the name or business interest of the Employer, any confidential information of the Employer or, and specially of any of related companies and subsidiaries, shareholders, directors, representatives, employees, customers and suppliers, to which the Employee may have access during the performance of his duties.",
    },
    {
      id: "tenth-secrecy",
      type: "clause",
      condition: "always",
      heading: "",
      text: "El Trabajador está obligado a mantener el secreto y la confidencialidad absoluta respecto de terceros, así como a no divulgar, copiar o transmitir de cualquier manera o forma, cualquier información relacionada con las actividades de la Empresa y sus empresas relacionadas y subsidiarias, accionistas, directores, representantes, trabajadores, clientes y proveedores, a los que el Trabajador pueda haber tenido acceso con ocasión de este contrato de trabajo, tanto antes de comenzar la relación laboral, como durante y después de su terminación, tales como proyectos, métodos, secretos, servicios de marketing estrategias, planes, evaluaciones económicas, licitaciones, investigación, softwares, valores y costos, know how y técnicas innovadoras, listas de precios, etc., a las cuales el Trabajador pueda tener acceso durante la prestación de los servicios.",
      headingTranslation: "",
      translation:
        "The Employee is obliged to maintain absolute secrecy and confidentiality to third parties, as well as not to disclose, copy or transmit in any manner or form whatsoever, any information related to the activities of the Employer and their related companies and subsidiaries, shareholders, directors, representatives, employees, customers and suppliers, to which the Employee may had access with occasion of this employment contract, both before starting the employment relationship and during and after its termination, such as projects, methods, secrets, services, marketing strategies, plans, economic evaluations, bids, research, software, values and costs, know-how and innovative techniques, price lists, etc. to which the Employee may have access during the provision of services.",
    },
    {
      id: "tenth-documents",
      type: "clause",
      condition: "always",
      heading: "",
      text: "Para este propósito, el empleador y el Trabajador reconocen y aceptan que cualquier documento e información directa o indirectamente proporcionada por, u obtenidos por el Trabajador del Empleador o cualquiera de las entidades o personas mencionadas anteriormente, es confidencial y secreta, a menos se manifiesta expresamente lo contrario por escrito.",
      headingTranslation: "",
      translation:
        "For this purpose, the Employer and Employee hereby acknowledge and agree that any document and information directly or indirectly provided by, or obtained by the Employee from, the Employer, or any of the entities or persons mentioned above, is confidential and a secret unless expressly states otherwise in writing.",
    },
    {
      id: "tenth-control",
      type: "clause",
      condition: "always",
      heading: "",
      text: "De acuerdo con los deberes del trabajador, se le requerirá asegurar el control de toda la información del Empleador (y de las personas y entidades antes mencionadas) como la información y los datos y asegurar que no va a ser utilizado en otros lugares, y también para prevenir la duplicación o reproducción de estos datos, en su totalidad o en parte, por cualquier otro Trabajador o tercera persona extraña al Empleador.",
      headingTranslation: "",
      translation:
        "As per the Employee's duties, he shall be required to ensure an adequate control of all the Employer's (and the above-mentioned persons' and entities') information and data and ensure that it will not be used elsewhere, and also to prevent duplication or reproduction of such data, in whole or in part, by any other employee or third person strange to the Employer.",
    },
    {
      id: "eleventh",
      type: "clause",
      condition: "always",
      heading: "UNDÉCIMO:",
      text: "Debido a la naturaleza de la posición del trabajador, no tendrá derecho a participar en negociaciones colectivas o para integrar las comisiones de negociación, de conformidad con el artículo 305 del Código del Trabajo.",
      headingTranslation: "ELEVENTH:",
      translation:
        "Due to the nature of the Employee's position, he shall not be entitled to participate in any collective bargaining or to integrate any bargaining commission, pursuant to Article 305 of the Labor Code.",
    },
    {
      id: "twelfth",
      type: "clause",
      condition: "always",
      heading: "DUODÉCIMO:",
      text: "Cualquier modificación a este contrato, adición o supresión de los párrafos o parte del mismo, se hará por escrito, y no requiere la firma de un nuevo contrato.",
      headingTranslation: "TWELFTH:",
      translation:
        "Any modification to this contract, addition or deletion of paragraphs or part thereof, shall be made in writing, and no matter the signing of a new contract, as amendments, deletions or additions do not alter in form substantial provisions hereof.",
    },
    {
      id: "thirteenth",
      type: "clause",
      condition: "always",
      heading: "DÉCIMO TERCERO:",
      text: "El presente contrato se firma en dos ejemplares de la misma fecha, quedando uno de ellos en poder del empleador y uno en poder del trabajador.",
      headingTranslation: "THIRTEENTH:",
      translation:
        "This contract is signed in two copies of the same date, one of them being held by the Employer and one held by the Employee.",
    },
    { id: "signatures", type: "signatures", condition: "always" },
    { id: "annex-break", type: "pageBreak", condition: "always" },
    {
      id: "annex",
      type: "jobDescription",
      condition: "always",
      heading: "ANEXO I – DESCRIPCIÓN DEL TRABAJO",
      headingTranslation: "ANNEX I – JOB DESCRIPTION",
    },
  ],
}
