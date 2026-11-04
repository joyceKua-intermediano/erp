// Page setup shared by every contract template. Usage:
//   #show: contract.with(data.cluster, title: "Contrato individual de trabajo")

// Letterhead taken from the legacy contracts: logo and entity name above a red rule, entity details and logo below
// another red rule. Both are drawn at fixed page positions, so they repeat identically on every page.
#let brand-red = rgb("#e30613")
#let heading-gray = rgb("#1f2937")
#let wordmark = "/assets/intermediano-wordmark.png"

#let letterhead(cluster) = {
  place(top + left, dx: 30pt, dy: 7.5pt, image(wordmark, height: 36pt))
  place(top + right, dx: -30pt, dy: 17pt, text(12.8pt, weight: "bold", fill: heading-gray, cluster.legalName))
  place(top + left, dy: 52.1pt, line(length: 100%, stroke: 2.25pt + brand-red))

  place(top + left, dy: 798pt, line(length: 100%, stroke: 2.25pt + brand-red))
  place(top + left, dx: 30pt, dy: 804.5pt, block(width: 440pt)[
    #set text(6.8pt, fill: rgb("#4b5563"))
    #set par(justify: false, leading: 0.35em, spacing: 0.35em)
    #text(weight: "bold", fill: heading-gray, cluster.legalName) \
    #if cluster.address != none [#cluster.address \ ]
    #(cluster.website, cluster.phone).filter(part => part != none).join(" — ")
  ])
  place(top + right, dx: -30pt, dy: 806.3pt, image(wordmark, height: 22.5pt))
}

#let contract(cluster, title: none, body) = {
  set document(title: title)
  set page(
    paper: "a4",
    margin: (top: 86pt, bottom: 62pt, x: 30pt),
    background: letterhead(cluster),
  )
  set text(font: ("Liberation Sans", "Arial"), size: 10.5pt, lang: cluster.language)
  set par(justify: true, leading: 0.7em, spacing: 1.1em)
  show heading.where(level: 1): it => align(center, block(below: 1.2em, text(13pt, weight: "bold", upper(it.body))))
  show heading.where(level: 2): it => block(above: 1.4em, below: 0.8em, text(11pt, weight: "bold", it.body))
  body
}
