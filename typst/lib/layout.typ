// Page setup shared by every contract template. Usage:
//   #show: contract.with(data.cluster, title: "Contrato individual de trabajo")

#let contract(cluster, title: none, body) = {
  set document(title: title)
  set page(
    paper: "a4",
    margin: (top: 3cm, bottom: 2.6cm, x: 2.2cm),
    header: [
      #set text(9pt, fill: luma(90))
      #grid(
        columns: (1fr, auto),
        align: (left + horizon, right + horizon),
        text(11pt, weight: "bold", fill: black, cluster.legalName),
        if cluster.website != none { cluster.website },
      )
      #v(-0.4em)
      #line(length: 100%, stroke: 0.5pt + luma(180))
    ],
    footer: context [
      #set text(8pt, fill: luma(110))
      #line(length: 100%, stroke: 0.5pt + luma(180))
      #v(-0.4em)
      #grid(
        columns: (1fr, auto),
        column-gutter: 1em,
        [
          #cluster.legalName
          #if cluster.address != none [ · #cluster.address]
          #if cluster.phone != none [ · #cluster.phone]
        ],
        counter(page).display("1 / 1", both: true),
      )
    ],
  )
  set text(font: ("Liberation Sans", "Arial"), size: 10.5pt, lang: cluster.language)
  set par(justify: true, leading: 0.7em, spacing: 1.1em)
  show heading.where(level: 1): it => align(center, block(below: 1.2em, text(13pt, weight: "bold", upper(it.body))))
  show heading.where(level: 2): it => block(above: 1.4em, below: 0.8em, text(11pt, weight: "bold", it.body))
  body
}
