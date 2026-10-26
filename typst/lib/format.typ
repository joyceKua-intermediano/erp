// Small helpers for printing contract data.

// Reads a dotted path such as "contract.endDate.long", returning none if any step is missing.
#let lookup(value, path) = {
  let current = value
  for key in path.split(".") {
    if type(current) != dictionary { return none }
    current = current.at(key, default: none)
  }
  current
}

// Prints a value, or a blank line when it's missing, so gaps stand out in drafts.
#let field(value, placeholder: "____________") = {
  if value == none or value == "" { placeholder } else { value }
}

// Prints a date object (`iso`, `short`, `long`, `longEn`) in the requested style.
#let date(value, style: "long", placeholder: "____________") = {
  if value == none { placeholder } else { value.at(style) }
}

// Prints plain text that uses blank lines between paragraphs and single line breaks inside them.
#let paragraphs(value, placeholder: none) = {
  if value == none or value.trim() == "" {
    placeholder
  } else {
    for chunk in value.split(regex("\n\s*\n")) {
      let lines = chunk.trim().split("\n")
      par(lines.join(linebreak()))
    }
  }
}

// Two columns side by side: the contract language on the left, the translation on the right.
// Rows with automatic height may split across pages, so long clauses never leave a gap at the bottom of a page.
#let bilingual(left, right, right-lang: "en", bordered: false) = {
  let row = grid(
    columns: (1fr, 1fr),
    column-gutter: if bordered { 0pt } else { 1.4em },
    stroke: if bordered { 0.5pt + luma(170) } else { none },
    inset: if bordered { (x: 7pt, y: 6pt) } else { 0pt },
    left,
    text(lang: right-lang, right),
  )
  // Bordered rows sit flush so consecutive clauses read as one table, like the legacy contracts.
  if bordered { block(above: 0pt, below: 0pt, row) } else { row }
}

// A label/value table, one row per entry: ((label, value), ...).
#let facts(rows) = {
  set par(justify: false)
  set text(9.5pt, hyphenate: false)
  table(
    columns: (auto, 1fr),
    stroke: 0.5pt + luma(200),
    inset: (x: 6pt, y: 5pt),
    ..rows.map(((label, value)) => (text(weight: "bold", label), value)).flatten(),
  )
}

// Prints the employee's dependents as "Name, relationship" lines.
#let dependents(list, empty: "No dependents.") = {
  if list.len() == 0 { empty } else {
    list.map(d => [#d.name, #d.relationship]).join(linebreak())
  }
}
