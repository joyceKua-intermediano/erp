// Signature blocks. Per-cluster details (signer titles, tax ID lines) come from data.signatures.

// One signer: space to sign, a line, then the name and any extra lines.
#let signature-block(signer) = block(breakable: false, width: 100%)[
  #set par(justify: false)
  #set text(9.5pt)
  #text(weight: "bold", signer.title)
  #v(2cm)
  #line(length: 90%, stroke: 0.6pt)
  #v(-0.3em)
  #if signer.name != none [*#signer.name* \ ]
  #for extra in signer.lines [#extra \ ]
  #if signer.signedAt != none [#text(8.5pt, fill: luma(100))[#signer.signedAt]]
]

// The employer and the employee side by side.
#let signature-row(data) = block(above: 2.5em, breakable: false, grid(
  columns: (1fr, 1fr),
  column-gutter: 1.5cm,
  signature-block(data.signatures.employer),
  signature-block(data.signatures.employee),
))
