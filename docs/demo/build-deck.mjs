// Builds the CEO progress deck. Run: cd docs/demo && npm install && npm run build
// Real screenshots in ./screenshots/<name>.png replace the recreated screens. Names used:
// admin-cluster-switcher, admin-quotation-detail, admin-contracts, admin-payroll-detail,
// employee-timesheets, employee-timesheet-new, employee-vacations, employee-expense-new, employee-payslips
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import PptxGenJS from "pptxgenjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "../..")
const SHOTS = path.join(here, "screenshots")
const OUT = path.join(here, "Intermediano-ERP-CEO-Progress-Review.pptx")
const LOGO = path.join(root, "public/brand/intermediano-logo.png")
const WORDMARK = path.join(root, "typst/assets/intermediano-wordmark.png")

const C = {
  primary: "7D2B1D",
  primaryDark: "5E1F14",
  red: "E30613",
  fg: "0A0A0A",
  body: "262626",
  muted: "737373",
  border: "E5E5E5",
  surface: "F5F5F5",
  sidebar: "FAFAFA",
  tint: "F6EDEB",
  tintStrong: "EBD6D2",
  white: "FFFFFF",
  amber: "B45309",
  amberBg: "FEF3C7",
  green: "047857",
  greenBg: "D1FAE5",
  rose: "B91C1C",
  roseBg: "FEE2E2",
}
const FONT = "Segoe UI"
const FONT_SEMI = "Segoe UI Semibold"

const pptx = new PptxGenJS()
pptx.layout = "LAYOUT_WIDE" // 13.333 x 7.5 in
pptx.author = "Reiniel"
pptx.company = "Intermediano"
pptx.title = "Intermediano ERP - Platform progress review"
const S = pptx.ShapeType

// ---------- image helpers ----------

function imageSize(file) {
  const b = fs.readFileSync(file)
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
  let i = 2
  while (i < b.length) {
    if (b[i] !== 0xff) {
      i++
      continue
    }
    const marker = b[i + 1]
    const len = b.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }
    }
    i += 2 + len
  }
  throw new Error(`Unsupported image format: ${file}`)
}

function fitBox(file, w, h) {
  const s = imageSize(file)
  const r = Math.min(w / s.w, h / s.h)
  return { w: s.w * r, h: s.h * r }
}

function shot(name) {
  for (const ext of ["png", "jpg", "jpeg"]) {
    const p = path.join(SHOTS, `${name}.${ext}`)
    if (fs.existsSync(p)) return p
  }
  return null
}

// ---------- drawing primitives ----------

function box(slide, x, y, w, h, { fill = C.white, line, lw = 0.75, r = 0, dash } = {}) {
  slide.addShape(r ? S.roundRect : S.rect, {
    x,
    y,
    w,
    h,
    fill: { color: fill },
    line: { color: line ?? fill, width: line ? lw : 0.1, dashType: dash },
    rectRadius: r || undefined,
  })
}

function text(slide, t, x, y, w, h, o = {}) {
  slide.addText(t, {
    x,
    y,
    w,
    h,
    fontFace: o.bold ? FONT_SEMI : FONT,
    fontSize: o.size ?? 12,
    color: o.color ?? C.fg,
    bold: false,
    align: o.align ?? "left",
    valign: o.valign ?? "top",
    margin: o.margin ?? 0,
    charSpacing: o.spacing,
    italic: o.italic,
    lineSpacingMultiple: o.lineSpacing,
    paraSpaceAfter: o.paraAfter,
    fit: o.fit,
  })
}

const BADGE = {
  tint: [C.tint, C.primary, C.tint],
  solid: [C.primary, C.white, C.primary],
  outline: [C.white, C.primary, C.primary],
  green: [C.greenBg, C.green, C.greenBg],
  amber: [C.amberBg, C.amber, C.amberBg],
  rose: [C.roseBg, C.rose, C.roseBg],
  muted: [C.surface, C.muted, C.border],
  secondary: [C.surface, C.body, C.surface],
}

function badgeWidth(label, size) {
  return label.length * size * 0.0082 + 0.14
}

function badge(slide, label, x, y, kind = "tint", size = 6) {
  const [fill, color, line] = BADGE[kind]
  const w = badgeWidth(label, size)
  const h = size * 0.022 + 0.06
  slide.addText(label, {
    x,
    y,
    w,
    h,
    shape: S.roundRect,
    rectRadius: h / 2,
    fill: { color: fill },
    line: { color: line, width: 0.5 },
    fontFace: FONT_SEMI,
    fontSize: size,
    color,
    align: "center",
    valign: "middle",
    margin: 0,
  })
  return w
}

function button(slide, label, x, y, w, { kind = "primary", size = 6, h = 0.2 } = {}) {
  const primary = kind === "primary"
  slide.addText(label, {
    x,
    y,
    w,
    h,
    shape: S.roundRect,
    rectRadius: 0.05,
    fill: { color: primary ? C.primary : C.white },
    line: { color: primary ? C.primary : C.border, width: 0.5 },
    fontFace: FONT_SEMI,
    fontSize: size,
    color: primary ? C.white : C.fg,
    align: "center",
    valign: "middle",
    margin: 0,
  })
}

function bullets(slide, items, x, y, w, h, { size = 13, color = C.body, gap = 8 } = {}) {
  slide.addText(
    items.map((item) => ({
      text: item,
      options: { bullet: { code: "25AA", indent: 14 }, breakLine: true, paraSpaceAfter: gap },
    })),
    { x, y, w, h, fontFace: FONT, fontSize: size, color, valign: "top", margin: 0 }
  )
}

function caption(slide, t, x, y, w) {
  text(slide, t, x, y, w, 0.2, { size: 8, color: C.muted, italic: true, align: "center" })
}

// ---------- app mock frames ----------

function browserWindow(slide, x, y, w, h, url) {
  box(slide, x + 0.05, y + 0.07, w, h, { fill: "EBEBEB", r: 0.12 })
  box(slide, x, y, w, h, { fill: C.white, line: "D4D4D4", r: 0.12 })
  box(slide, x + 0.01, y + 0.01, w - 0.02, 0.3, { fill: "F4F4F5", r: 0.11 })
  box(slide, x + 0.01, y + 0.18, w - 0.02, 0.13, { fill: "F4F4F5" })
  slide.addShape(S.line, { x, y: y + 0.31, w, h: 0, line: { color: "E4E4E7", width: 0.75 } })
  ;["FF5F57", "FEBC2E", "28C840"].forEach((color, i) => {
    slide.addShape(S.ellipse, { x: x + 0.14 + i * 0.15, y: y + 0.11, w: 0.09, h: 0.09, fill: { color }, line: { color, width: 0.1 } })
  })
  slide.addText(url, {
    x: x + 0.75,
    y: y + 0.07,
    w: w - 1.5,
    h: 0.17,
    shape: S.roundRect,
    rectRadius: 0.08,
    fill: { color: C.white },
    line: { color: C.border, width: 0.5 },
    fontFace: FONT,
    fontSize: 6.5,
    color: C.muted,
    align: "center",
    valign: "middle",
    margin: 0,
  })
  return { x, y: y + 0.31, w, h: h - 0.31 }
}

// Real screenshot inside a browser frame, sized to the image's aspect ratio.
function screenshotWindow(slide, file, x, y, maxW, maxH, url) {
  const fit = fitBox(file, maxW, maxH - 0.31)
  const fx = x + (maxW - fit.w) / 2
  const inner = browserWindow(slide, fx, y, fit.w, fit.h + 0.31, url)
  slide.addImage({ path: file, x: inner.x + 0.01, y: inner.y, w: fit.w - 0.02, h: fit.h - 0.02 })
  return { x: fx, y, w: fit.w, h: fit.h + 0.31 }
}

const ADMIN_NAV = [
  ["OVERVIEW", ["Dashboard"]],
  ["{cluster}", ["Quotations", "Employees", "Contracts", "Timesheets", "Vacations", "Expenses", "Payroll", "Payslips"]],
  ["SALES", ["Companies", "Partners"]],
  ["RECRUITMENT", ["Consultants"]],
  ["SETTINGS", ["Intermediano companies", "Contract templates", "Holidays", "Users & roles"]],
]

function logo(slide, x, y, h) {
  const s = imageSize(LOGO)
  slide.addImage({ path: LOGO, x, y, w: (h * s.w) / s.h, h })
}

function adminShell(slide, r, { active, cluster = "Intermediano Colombia SAS" }) {
  const sw = 1.42
  box(slide, r.x + 0.01, r.y, sw, r.h - 0.12, { fill: C.sidebar })
  logo(slide, r.x + 0.13, r.y + 0.13, 0.2)
  text(slide, "Intermediano", r.x + 0.43, r.y + 0.11, 1, 0.14, { size: 7, bold: true })
  text(slide, "Admin console", r.x + 0.43, r.y + 0.24, 1, 0.12, { size: 5.5, color: C.muted })

  let y = r.y + 0.5
  for (const [label, items] of ADMIN_NAV) {
    text(slide, label === "{cluster}" ? cluster.toUpperCase() : label, r.x + 0.13, y, sw - 0.2, 0.12, { size: 4.6, color: C.muted, bold: true, spacing: 0.3 })
    y += 0.14
    for (const item of items) {
      const isActive = item === active
      if (isActive) box(slide, r.x + 0.08, y - 0.015, sw - 0.15, 0.15, { fill: C.tint, r: 0.04 })
      box(slide, r.x + 0.14, y + 0.03, 0.06, 0.06, { fill: isActive ? C.primary : "BDBDBD", r: 0.01 })
      text(slide, item, r.x + 0.26, y, sw - 0.3, 0.12, { size: 5.8, color: isActive ? C.primary : C.body, bold: isActive })
      y += 0.152
    }
    y += 0.05
  }

  const hx = r.x + sw + 0.12
  const hw = r.w - sw - 0.24
  box(slide, hx, r.y + 0.1, hw, 0.36, { fill: C.white, line: C.border, r: 0.08 })
  box(slide, hx + 0.1, r.y + 0.21, 0.13, 0.13, { fill: C.white, line: C.border, r: 0.02 })
  slide.addShape(S.line, { x: hx + 0.31, y: r.y + 0.19, w: 0, h: 0.18, line: { color: C.border, width: 0.5 } })
  box(slide, hx + 0.39, r.y + 0.15, 1.6, 0.26, { fill: C.white, line: C.tintStrong, r: 0.05 })
  box(slide, hx + 0.43, r.y + 0.19, 0.18, 0.18, { fill: C.primary, r: 0.03 })
  text(slide, "◎", hx + 0.43, r.y + 0.19, 0.18, 0.18, { size: 7, color: C.white, align: "center", valign: "middle" })
  text(slide, "ACTIVE CLUSTER", hx + 0.66, r.y + 0.165, 1.2, 0.1, { size: 4.2, color: C.muted, bold: true, spacing: 0.3 })
  text(slide, cluster, hx + 0.66, r.y + 0.255, 1.25, 0.13, { size: 6, bold: true })
  text(slide, "⌄", hx + 1.85, r.y + 0.17, 0.12, 0.2, { size: 7, color: C.primary })
  slide.addShape(S.ellipse, { x: hx + hw - 1.0, y: r.y + 0.16, w: 0.24, h: 0.24, fill: { color: C.primary }, line: { color: C.primary, width: 0.1 } })
  text(slide, "AU", hx + hw - 1.0, r.y + 0.16, 0.24, 0.24, { size: 5.5, color: C.white, bold: true, align: "center", valign: "middle" })
  text(slide, "Admin User", hx + hw - 0.72, r.y + 0.17, 0.7, 0.11, { size: 5.8, bold: true })
  text(slide, "Admin", hx + hw - 0.72, r.y + 0.28, 0.7, 0.1, { size: 5, color: C.muted })

  return { x: hx, y: r.y + 0.56, w: hw, h: r.h - 0.68 }
}

function customerShell(slide, r, active) {
  slide.addShape(S.line, { x: r.x, y: r.y + 0.42, w: r.w, h: 0, line: { color: C.border, width: 0.5 } })
  logo(slide, r.x + 0.18, r.y + 0.11, 0.2)
  text(slide, "Intermediano", r.x + 0.48, r.y + 0.13, 0.8, 0.16, { size: 7, bold: true })
  badge(slide, "Client portal", r.x + 1.2, r.y + 0.13, "secondary", 5.5)
  let x = r.x + 2.15
  for (const item of ["Overview", "Contracts", "Timesheets", "Vacations", "Expenses"]) {
    const w = item.length * 0.052 + 0.2
    if (item === active) box(slide, x, r.y + 0.11, w, 0.21, { fill: C.tint, r: 0.1 })
    text(slide, item, x, r.y + 0.11, w, 0.21, { size: 6, align: "center", valign: "middle", bold: item === active, color: item === active ? C.primary : C.body })
    x += w + 0.06
  }
  slide.addShape(S.ellipse, { x: r.x + r.w - 0.45, y: r.y + 0.1, w: 0.22, h: 0.22, fill: { color: C.primary }, line: { color: C.primary, width: 0.1 } })
  text(slide, "RS", r.x + r.w - 0.45, r.y + 0.1, 0.22, 0.22, { size: 5.5, color: C.white, bold: true, align: "center", valign: "middle" })
  return { x: r.x + 0.25, y: r.y + 0.55, w: r.w - 0.5, h: r.h - 0.65 }
}

function employeeShell(slide, r, active) {
  slide.addShape(S.line, { x: r.x, y: r.y + 0.42, w: r.w, h: 0, line: { color: C.border, width: 0.5 } })
  logo(slide, r.x + 0.18, r.y + 0.11, 0.2)
  text(slide, "Intermediano", r.x + 0.48, r.y + 0.13, 0.8, 0.16, { size: 7, bold: true })
  badge(slide, "Employee hub", r.x + 1.2, r.y + 0.13, "outline", 5.5)
  slide.addShape(S.ellipse, { x: r.x + r.w - 0.45, y: r.y + 0.1, w: 0.22, h: 0.22, fill: { color: C.primary }, line: { color: C.primary, width: 0.1 } })
  text(slide, "JP", r.x + r.w - 0.45, r.y + 0.1, 0.22, 0.22, { size: 5.5, color: C.white, bold: true, align: "center", valign: "middle" })

  const sx = r.x + 0.18
  box(slide, sx, r.y + 0.55, 1.45, 0.55, { fill: C.tint, r: 0.07 })
  text(slide, "My profile", sx + 0.1, r.y + 0.61, 1.3, 0.14, { size: 6.5, bold: true, color: C.primary })
  text(slide, "Personal details, contract and payroll documents", sx + 0.1, r.y + 0.77, 1.3, 0.28, { size: 5, color: C.muted })
  const items = ["Overview", "Profile", "Contract", "Timesheets", "Vacations", "Expenses", "Payslips", "Documents"]
  items.forEach((item, i) => {
    const y = r.y + 1.22 + i * 0.2
    const isActive = item === active
    if (isActive) box(slide, sx, y - 0.02, 1.45, 0.18, { fill: C.tint, r: 0.04 })
    box(slide, sx + 0.08, y + 0.04, 0.07, 0.07, { fill: isActive ? C.primary : "BDBDBD", r: 0.01 })
    text(slide, item, sx + 0.22, y, 1.2, 0.14, { size: 6, bold: isActive, color: isActive ? C.primary : C.body })
  })
  return { x: r.x + 1.85, y: r.y + 0.55, w: r.w - 2.05, h: r.h - 0.65 }
}

function employeeTimesheetsMock(slide, r) {
  const c = employeeShell(slide, r, "Timesheets")
  const y = pageHeader(slide, c.x, c.y, c.w, "Employee hub", "Timesheets", "Log the hours you work each month and follow their review.")
  const tc = card(slide, c.x, y, c.w, 2.0, "My timesheets", "New timesheets are sent to Acme Logistics for review.")
  button(slide, "+  New timesheet", tc.x + tc.w - 0.95, y + 0.12, 0.95)
  table(slide, tc.x, tc.y, tc.w, ["Month", "Total hours", "Status", "Submitted"], [
    ["October 2026", "176 hrs", status("Pending", "amber"), "Nov 2, 2026"],
    ["September 2026", "176 hrs", status("Approved", "green"), "Oct 1, 2026"],
    ["August 2026", "168 hrs", status("Approved", "green"), "Sep 1, 2026"],
  ], { colW: [tc.w * 0.32, tc.w * 0.2, tc.w * 0.24, tc.w * 0.24], rowH: 0.26, size: 6 })
}

function employeeVacationsMock(slide, r) {
  const c = employeeShell(slide, r, "Vacations")
  let y = pageHeader(slide, c.x, c.y, c.w, "Employee hub", "Vacations", "Your accrued vacation balance, your requests and their review.")
  const cards = [["Accrued", "15 days", "15 days a year"], ["Taken", "3 days", "Approved requests"], ["Pending", "2 days", "Awaiting review"], ["Available", "10 days", "You can request"]]
  const cw = (c.w - 0.3) / 4
  cards.forEach(([label, value, hint], i) => {
    const x = c.x + i * (cw + 0.1)
    box(slide, x, y, cw, 0.62, { fill: C.white, line: C.border, r: 0.07 })
    text(slide, label, x + 0.1, y + 0.08, cw - 0.2, 0.12, { size: 5.5, color: C.muted })
    text(slide, value, x + 0.1, y + 0.2, cw - 0.2, 0.22, { size: 11, bold: true })
    text(slide, hint, x + 0.1, y + 0.45, cw - 0.2, 0.12, { size: 5, color: C.muted })
  })
  y += 0.74
  const tc = card(slide, c.x, y, c.w, 1.6, "My vacation requests", "New requests are sent to Acme Logistics for review.")
  button(slide, "+  New request", tc.x + tc.w - 0.9, y + 0.12, 0.9)
  table(slide, tc.x, tc.y, tc.w, ["Dates", "Days", "Status", "Submitted"], [
    ["Dec 22 – Dec 23, 2026", "2", status("Pending", "amber"), "Nov 2, 2026"],
    ["Jul 13 – Jul 15, 2026", "3", status("Approved", "green"), "Jun 20, 2026"],
  ], { colW: [tc.w * 0.38, tc.w * 0.14, tc.w * 0.24, tc.w * 0.24], rowH: 0.26, size: 6, align: ["left", "right", "left", "left"] })
}

function pageHeader(slide, x, y, w, eyebrow, title, desc) {
  text(slide, eyebrow.toUpperCase(), x, y, w, 0.12, { size: 5, color: C.muted, bold: true, spacing: 0.4 })
  text(slide, title, x, y + 0.13, w, 0.24, { size: 11.5, bold: true })
  if (desc) text(slide, desc, x, y + 0.38, w, 0.14, { size: 6, color: C.muted })
  return y + (desc ? 0.6 : 0.42)
}

function statCards(slide, x, y, w, items, h = 0.5) {
  const gap = 0.1
  const cw = (w - gap * (items.length - 1)) / items.length
  items.forEach(([label, value], i) => {
    const cx = x + i * (cw + gap)
    box(slide, cx, y, cw, h, { fill: C.white, line: C.border, r: 0.07 })
    box(slide, cx + 0.1, y + (h - 0.26) / 2, 0.26, 0.26, { fill: C.tint, r: 0.05 })
    box(slide, cx + 0.18, y + h / 2 - 0.05, 0.1, 0.1, { fill: C.primary, r: 0.02 })
    text(slide, label, cx + 0.45, y + 0.09, cw - 0.5, 0.12, { size: 5.5, color: C.muted })
    text(slide, value, cx + 0.45, y + 0.21, cw - 0.5, 0.22, { size: 11, bold: true })
  })
  return y + h + 0.12
}

const NO_BORDER = { type: "none" }
const ROW_BORDER = [NO_BORDER, NO_BORDER, { type: "solid", pt: 0.5, color: C.border }, NO_BORDER]

function cell(value, extra = {}) {
  if (value && typeof value === "object" && !Array.isArray(value) && "text" in value) {
    return { text: value.text, options: { border: ROW_BORDER, ...value.options, ...extra } }
  }
  return { text: value, options: { border: ROW_BORDER, ...extra } }
}

function table(slide, x, y, w, headers, rows, { colW, rowH = 0.22, size = 6, headSize = 5, align } = {}) {
  const head = headers.map((h, i) =>
    cell(h.toUpperCase(), { bold: true, color: C.primary, fill: { color: C.tint }, fontSize: headSize, fontFace: FONT_SEMI, align: align?.[i] ?? "left" })
  )
  const body = rows.map((row) => row.map((v, i) => cell(v, { align: align?.[i] ?? "left" })))
  slide.addTable([head, ...body], {
    x,
    y,
    w,
    colW,
    rowH,
    fontFace: FONT,
    fontSize: size,
    color: C.body,
    valign: "middle",
    margin: [0.02, 0.06, 0.02, 0.06],
  })
}

const two = (top, bottom, bold = true) => ({
  text: [
    { text: top, options: { bold, fontFace: bold ? FONT_SEMI : FONT, color: C.fg, breakLine: true } },
    { text: bottom, options: { fontSize: 5, color: C.muted } },
  ],
})
const status = (label, kind) => ({ text: `● ${label}`, options: { color: BADGE[kind][1], fontFace: FONT_SEMI } })

function card(slide, x, y, w, h, title, desc) {
  box(slide, x, y, w, h, { fill: C.white, line: C.border, r: 0.07 })
  if (title) text(slide, title, x + 0.12, y + 0.1, w - 0.24, 0.16, { size: 7.5, bold: true })
  if (desc) text(slide, desc, x + 0.12, y + 0.27, w - 0.24, 0.12, { size: 5.5, color: C.muted })
  return { x: x + 0.12, y: y + (desc ? 0.46 : 0.32), w: w - 0.24 }
}

function searchRow(slide, x, y, w, placeholder, action) {
  box(slide, x, y, 1.7, 0.2, { fill: C.white, line: C.border, r: 0.05 })
  text(slide, `⌕  ${placeholder}`, x + 0.06, y, 1.6, 0.2, { size: 5.5, color: C.muted, valign: "middle" })
  if (action) button(slide, action, x + w - 0.95, y, 0.95)
}

function chips(slide, x, y, labels, activeIndex = 0) {
  let cx = x
  labels.forEach((label, i) => {
    if (label === "|") {
      slide.addShape(S.line, { x: cx + 0.02, y: y + 0.02, w: 0, h: 0.14, line: { color: C.border, width: 0.5 } })
      cx += 0.08
      return
    }
    cx += badge(slide, label, cx, y, i === activeIndex ? "solid" : "muted", 5.5) + 0.05
  })
}

// ---------- slide chrome ----------

const logoSize = imageSize(LOGO)
pptx.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.white },
  objects: [
    { image: { path: LOGO, x: 12.42, y: 0.34, w: (0.3 * logoSize.w) / logoSize.h, h: 0.3 } },
    { line: { x: 0.6, y: 7.0, w: 12.13, h: 0, line: { color: C.border, width: 0.75 } } },
    {
      text: {
        text: "Intermediano ERP  ·  Platform progress review  ·  November 6, 2026",
        options: { x: 0.6, y: 7.06, w: 7, h: 0.22, fontFace: FONT, fontSize: 8, color: C.muted, margin: 0 },
      },
    },
  ],
  slideNumber: { x: 12.23, y: 7.06, w: 0.5, h: 0.22, fontFace: FONT, fontSize: 8, color: C.muted, align: "right" },
})

function heading(slide, eyebrow, title, subtitle) {
  text(slide, eyebrow.toUpperCase(), 0.6, 0.38, 10, 0.25, { size: 10, color: C.primary, bold: true, spacing: 1.5 })
  text(slide, title, 0.6, 0.66, 11.5, 0.6, { size: 28, bold: true })
  if (subtitle) text(slide, subtitle, 0.6, 1.26, 11.5, 0.35, { size: 14, color: C.muted })
}

function newSlide(notes) {
  const slide = pptx.addSlide({ masterName: "CONTENT" })
  if (notes) slide.addNotes(notes)
  return slide
}

const STEPS = ["Quote", "Contract", "Log time & requests", "Client approves", "Run payroll", "Payslip"]

function stepTracker(slide, current) {
  const x0 = 0.6
  const w = (12.13 - 0.08 * (STEPS.length - 1)) / STEPS.length
  STEPS.forEach((label, i) => {
    const x = x0 + i * (w + 0.08)
    const state = i + 1 < current ? "done" : i + 1 === current ? "current" : "next"
    const fill = state === "current" ? C.primary : state === "done" ? C.tint : C.white
    const color = state === "current" ? C.white : state === "done" ? C.primary : C.muted
    slide.addText(`${i + 1}  ${label}`, {
      x,
      y: 6.58,
      w,
      h: 0.28,
      shape: S.roundRect,
      rectRadius: 0.14,
      fill: { color: fill },
      line: { color: state === "next" ? C.border : fill, width: 0.75 },
      fontFace: FONT_SEMI,
      fontSize: 9,
      color,
      align: "center",
      valign: "middle",
      margin: 0,
    })
  })
}

// Right-hand narrative column used on every process slide.
function story(slide, { who, points, why }) {
  const x = 8.7
  const w = 4.03
  text(slide, "WHO", x, 1.85, w, 0.2, { size: 9, color: C.muted, bold: true, spacing: 1 })
  let bx = x
  for (const label of who) {
    bx += badge(slide, label, bx, 2.08, "tint", 9) + 0.08
  }
  text(slide, "WHAT HAPPENS", x, 2.55, w, 0.2, { size: 9, color: C.muted, bold: true, spacing: 1 })
  bullets(slide, points, x, 2.82, w, 2.4, { size: 12, gap: 6 })
  box(slide, x, 5.3, w, 1.08, { fill: C.tint, r: 0.1 })
  box(slide, x, 5.3, 0.07, 1.08, { fill: C.primary })
  text(slide, "WHY IT MATTERS", x + 0.22, 5.4, w - 0.35, 0.2, { size: 8.5, color: C.primary, bold: true, spacing: 1 })
  text(slide, why, x + 0.22, 5.62, w - 0.35, 0.72, { size: 11, color: C.body, lineSpacing: 1.05 })
}

// ---------- numbers used across slides ----------

// Real output of lib/quotations/calculators for Colombia (ordinary): 6,500,000 COP salary, 4,100 COP/USD, 10% fee, USD 25 bank fee.
const RATE = 4100
const QUOTE = [
  ["Gross Salary", 6500000],
  ["Total Gross Income", 6500000, true],
  ["Payroll Costs", 2076100],
  ["Provisions", 1782924],
  ["Subtotal Gross Salary + Payroll Costs", 10359024, true],
  ["Fee", 650000],
  ["Bank Fee", 102500],
  ["Subtotal", 11111524, true],
  ["Municipal tax - ICA 1%", 111115.24],
  ["Service taxes - VAT 19%", 2132301.46],
  ["Total Invoice", 13354940.7, true],
]
const money = (n, digits = 2) => n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })

// =====================================================================
// 1. Title
// =====================================================================
{
  const slide = pptx.addSlide()
  slide.background = { color: C.white }
  slide.addNotes(
    "Open by framing the purpose: this is a progress check on the new Intermediano ERP, which replaces the legacy Laravel/Filament system. " +
      "Today I'll show what is already working end to end, then walk through it live, and finish with what is next and the decisions I need."
  )
  const wm = imageSize(WORDMARK)
  slide.addImage({ path: WORDMARK, x: 0.45, y: 0.55, w: 3.3, h: (3.3 * wm.h) / wm.w })
  text(slide, "PLATFORM PROGRESS REVIEW", 0.75, 2.35, 7, 0.3, { size: 12, color: C.primary, bold: true, spacing: 2 })
  text(slide, "The new Intermediano ERP", 0.75, 2.7, 7.2, 0.9, { size: 40, bold: true })
  text(slide, "One platform for our team, our clients and our employees, from first quote to final payslip.", 0.75, 3.6, 6.8, 0.9, {
    size: 17,
    color: C.muted,
    lineSpacing: 1.1,
  })
  box(slide, 0.75, 4.85, 0.6, 0.05, { fill: C.primary })
  text(slide, "Friday, November 6, 2026", 0.75, 5.05, 6, 0.3, { size: 13, bold: true })
  text(slide, "Presented by Reiniel  ·  Software Engineering", 0.75, 5.37, 6, 0.3, { size: 12, color: C.muted })

  box(slide, 8.35, 0, 4.983, 7.5, { fill: C.primary })
  box(slide, 8.35, 0, 0.12, 7.5, { fill: C.red })
  const portals = [
    ["Admin console", "Quotes, contracts, payroll and settings for every country"],
    ["Client portal", "Customers approve hours, time off and expenses"],
    ["Employee hub", "Workers log time, request leave, claim expenses, get payslips"],
  ]
  text(slide, "THREE PORTALS, ONE PLATFORM", 8.95, 1.35, 4, 0.3, { size: 10, color: "F3D9D4", bold: true, spacing: 1.5 })
  portals.forEach(([title, desc], i) => {
    const y = 1.85 + i * 1.5
    box(slide, 8.95, y, 3.8, 1.2, { fill: C.primaryDark, r: 0.12 })
    text(slide, title, 9.2, y + 0.2, 3.4, 0.35, { size: 17, bold: true, color: C.white })
    text(slide, desc, 9.2, y + 0.58, 3.4, 0.5, { size: 11, color: "F3D9D4", lineSpacing: 1.05 })
  })
}

// =====================================================================
// 2. Agenda
// =====================================================================
{
  const slide = newSlide("Keep this quick, 20 seconds. Tell the CEO there will be a live demo in the middle and a short list of decisions at the end.")
  heading(slide, "Agenda", "What we'll cover today")
  const items = [
    ["01", "Where we are", "What has been built in the first two weeks"],
    ["02", "How it fits together", "Three portals on one platform, separated by country"],
    ["03", "The process, step by step", "Following one hire from quote to payslip"],
    ["04", "Live demo", "The same journey in the running application"],
    ["05", "What's next", "Remaining modules, rollout plan and decisions needed"],
  ]
  items.forEach(([n, title, desc], i) => {
    const y = 1.75 + i * 0.95
    box(slide, 0.6, y, 12.13, 0.8, { fill: i === 3 ? C.tint : C.white, line: C.border, r: 0.1 })
    text(slide, n, 0.9, y, 0.8, 0.8, { size: 22, bold: true, color: C.primary, valign: "middle" })
    text(slide, title, 1.85, y + 0.12, 6, 0.35, { size: 17, bold: true })
    text(slide, desc, 1.85, y + 0.44, 9, 0.3, { size: 12, color: C.muted })
  })
}

// =====================================================================
// 3. Why we are rebuilding
// =====================================================================
{
  const slide = newSlide(
    "Explain the why in business terms. We are moving the legacy Laravel Filament ERP, with its admin, client and employee areas, onto a modern platform. " +
      "Add one or two concrete pain points from the legacy system that the CEO will recognise (for example slow screens, hard-to-change pricing rules, or manual approval follow-ups). " +
      "Avoid tech names unless asked: it's Next.js, TypeScript, MySQL and Microsoft SSO."
  )
  heading(slide, "Why we're rebuilding", "Same business, a stronger foundation", "The legacy Laravel Filament ERP is being rebuilt on a modern platform, module by module")
  const benefits = [
    ["A modern experience", "Fast, clean screens for each audience. Clients and employees land on a dashboard showing exactly what needs their attention."],
    ["Country rules we can trust", "Cost calculators for 10 countries, with automated tests that lock the figures. Saved payrolls keep a snapshot of what was billed."],
    ["Configurable without code", "Each legal entity turns modules on or off. Roles control every module and cluster. Contract templates use a block editor."],
    ["Safe by default", "Company single sign-on, permission checks on every action, country data kept separate, and protected portal logins."],
  ]
  benefits.forEach(([title, desc], i) => {
    const x = 0.6 + (i % 2) * 6.17
    const y = 1.9 + Math.floor(i / 2) * 2.3
    box(slide, x, y, 5.96, 2.1, { fill: i === 0 || i === 3 ? C.tint : C.surface, r: 0.14 })
    box(slide, x + 0.35, y + 0.35, 0.55, 0.55, { fill: C.primary, r: 0.12 })
    text(slide, String(i + 1), x + 0.35, y + 0.35, 0.55, 0.55, { size: 18, bold: true, color: C.white, align: "center", valign: "middle" })
    text(slide, title, x + 1.15, y + 0.38, 4.6, 0.45, { size: 18, bold: true, color: C.primary })
    text(slide, desc, x + 1.15, y + 0.88, 4.55, 1.1, { size: 13, color: C.body, lineSpacing: 1.05 })
  })
}

// =====================================================================
// 4. Progress at a glance
// =====================================================================
{
  const slide = newSlide(
    "These are hard numbers from the codebase. Two weeks of build so far, merged through reviewed pull requests. " +
      "Emphasise that the core money flow (quote, contract, timesheet, payroll, payslip) is already in place. " +
      "Employee profile, contract and documents screens are in progress this week."
  )
  heading(slide, "Where we are", "Two weeks in: the core flow works end to end")
  const stats = [
    ["3", "portals live", "Admin, Client, Employee"],
    ["15", "admin modules", "From quotations to payslips"],
    ["10", "country calculators", "Plus Colombia integral and Quebec"],
    ["32", "permissions", "View or manage, per module"],
    ["154", "automated tests passing", "12 suites: payroll, calculators, approvals"],
  ]
  const w = (12.13 - 0.15 * 4) / 5
  stats.forEach(([value, label, sub], i) => {
    const x = 0.6 + i * (w + 0.15)
    box(slide, x, 1.8, w, 1.6, { fill: C.white, line: C.border, r: 0.12 })
    text(slide, value, x + 0.25, 1.92, w - 0.4, 0.7, { size: 36, bold: true, color: C.primary })
    text(slide, label, x + 0.25, 2.62, w - 0.4, 0.3, { size: 13, bold: true })
    text(slide, sub, x + 0.25, 2.94, w - 0.4, 0.3, { size: 10, color: C.muted })
  })

  text(slide, "DELIVERY TIMELINE", 0.6, 3.72, 6, 0.25, { size: 10, color: C.muted, bold: true, spacing: 1 })
  const timeline = [
    ["Oct 19", "Foundation", "App, database, country switching"],
    ["Oct 24", "Access & people", "SSO, roles, employees, consultants"],
    ["Oct 26", "Contracts", "Contracts and PDF templates"],
    ["Oct 27", "Sales", "Partners, quotations, calculators, module settings"],
    ["Oct 28", "Payroll", "Monthly runs with provisions"],
    ["Oct 29", "Hardening", "Tests, rate limits, holidays, vacations"],
    ["Nov 2", "Portals", "Expenses, client portal, payslips"],
    ["This week", "Employee hub", "Profile, contract and documents"],
  ]
  const tw = 12.13 / timeline.length
  slide.addShape(S.line, { x: 0.6 + tw / 2, y: 4.3, w: 12.13 - tw, h: 0, line: { color: C.tintStrong, width: 2 } })
  timeline.forEach(([date, title, desc], i) => {
    const cx = 0.6 + i * tw + tw / 2
    const last = i === timeline.length - 1
    slide.addShape(S.ellipse, {
      x: cx - 0.11,
      y: 4.19,
      w: 0.22,
      h: 0.22,
      fill: { color: last ? C.white : C.primary },
      line: { color: C.primary, width: 1.5, dashType: last ? "dash" : undefined },
    })
    text(slide, date, cx - tw / 2, 4.5, tw, 0.25, { size: 10, bold: true, color: C.primary, align: "center" })
    text(slide, title, cx - tw / 2 + 0.05, 4.78, tw - 0.1, 0.3, { size: 11.5, bold: true, align: "center" })
    text(slide, desc, cx - tw / 2 + 0.08, 5.1, tw - 0.16, 0.8, { size: 9.5, color: C.muted, align: "center", lineSpacing: 1.05 })
  })
  box(slide, 0.6, 6.05, 12.13, 0.6, { fill: C.tint, r: 0.1 })
  text(slide, "9 pull requests merged  ·  every screen permission-checked  ·  every record scoped to its country cluster", 0.6, 6.05, 12.13, 0.6, {
    size: 12,
    color: C.primary,
    bold: true,
    align: "center",
    valign: "middle",
  })
}

// =====================================================================
// 5. Architecture: three portals
// =====================================================================
{
  const slide = newSlide(
    "One platform, three doors. Our staff sign in with company Microsoft accounts. Clients and employees get their own portals with their own logins. " +
      "Underneath, everything is separated by country cluster (each Intermediano legal entity), so a Canada user never sees Brasil data unless their role allows it."
  )
  heading(slide, "How it fits together", "Three portals, one platform, data separated by country")
  const portals = [
    ["Admin console", "Intermediano team", "Sign in with Microsoft or Google SSO", ["Quotations & calculators", "Employees & contracts", "Timesheets, vacations, expenses", "Payroll & payslips", "Settings, roles & templates"]],
    ["Client portal", "Customers & partners", "Email and password, created by our team", ["Overview of their team", "Contracts (view & download PDF)", "Approve timesheets", "Approve vacations", "Approve expenses"]],
    ["Employee hub", "Placed workers", "Email and password, or SSO", ["Summary dashboard", "Submit monthly timesheets", "Request vacation", "Claim expenses with receipts", "Download payslips"]],
  ]
  portals.forEach(([title, who, auth, items], i) => {
    const x = 0.6 + i * 4.1
    box(slide, x, 1.8, 3.93, 3.25, { fill: C.white, line: C.border, r: 0.14 })
    box(slide, x, 1.8, 3.93, 0.85, { fill: i === 0 ? C.primary : C.tint, r: 0.14 })
    box(slide, x, 2.3, 3.93, 0.35, { fill: i === 0 ? C.primary : C.tint })
    text(slide, title, x + 0.25, 1.9, 3.5, 0.35, { size: 17, bold: true, color: i === 0 ? C.white : C.primary })
    text(slide, who, x + 0.25, 2.27, 3.5, 0.3, { size: 11, color: i === 0 ? "F3D9D4" : C.primary })
    text(slide, auth, x + 0.25, 2.78, 3.5, 0.25, { size: 9.5, color: C.muted, italic: true })
    bullets(slide, items, x + 0.25, 3.12, 3.5, 1.9, { size: 11.5, gap: 4 })
  })
  slide.addShape(S.downArrow, { x: 6.37, y: 5.1, w: 0.6, h: 0.32, fill: { color: C.tintStrong }, line: { color: C.tintStrong, width: 0.1 } })
  box(slide, 0.6, 5.48, 12.13, 0.95, { fill: C.primary, r: 0.14 })
  const core = [
    ["Country clusters", "Every record belongs to one legal entity"],
    ["Roles & permissions", "View or manage, per module and cluster"],
    ["Module switches", "Each entity turns features on or off"],
    ["Contract PDF engine", "Templates per country, generated on demand"],
  ]
  core.forEach(([title, desc], i) => {
    const x = 0.85 + i * 3.0
    text(slide, title, x, 5.6, 2.85, 0.3, { size: 13, bold: true, color: C.white })
    text(slide, desc, x, 5.92, 2.85, 0.4, { size: 10, color: "F3D9D4" })
  })
}

// =====================================================================
// 6. The journey
// =====================================================================
{
  const slide = newSlide(
    "This is the story for the rest of the presentation and the demo. We follow one hire, Juan Pérez, placed with Acme Logistics in Colombia, from the first quote to his payslip. " +
      "Point out that three different audiences touch this process, and today each of them has their own portal."
  )
  heading(slide, "The process", "Following one hire from quote to payslip", "Juan Pérez, Software Engineer, placed with Acme Logistics by Intermediano Colombia")
  const steps = [
    ["Quote", "Admin", "Build the monthly cost for the client using the country calculator"],
    ["Contract", "Admin", "Generate the contract PDF from the country template and track signatures"],
    ["Log time & requests", "Employee", "Submit hours, request vacation and claim expenses with receipts"],
    ["Client approves", "Client", "Approve or reject hours, time off and expenses in the client portal"],
    ["Run payroll", "Admin", "Monthly payroll with provisions tracked over time"],
    ["Payslip", "Admin → Employee", "Upload the payslip; the employee downloads it in their hub"],
  ]
  const w = (12.13 - 0.12 * 5) / 6
  steps.forEach(([title, who, desc], i) => {
    const x = 0.6 + i * (w + 0.12)
    slide.addText("", {
      x,
      y: 2.05,
      w,
      h: 0.75,
      shape: i === 0 ? S.homePlate : S.chevron,
      fill: { color: i % 2 === 0 ? C.primary : C.primaryDark },
      line: { color: C.white, width: 0.1 },
    })
    text(slide, `${i + 1}`, x, 2.05, w, 0.75, { size: 22, bold: true, color: C.white, align: "center", valign: "middle" })
    text(slide, title, x, 3.0, w, 0.35, { size: 14, bold: true, align: "center" })
    badge(slide, who, x + (w - badgeWidth(who, 9)) / 2, 3.4, "tint", 9)
    text(slide, desc, x + 0.08, 3.8, w - 0.16, 1.1, { size: 11, color: C.muted, align: "center", lineSpacing: 1.05 })
  })
  box(slide, 0.6, 5.2, 12.13, 1.1, { fill: C.surface, r: 0.12 })
  text(slide, "Before step 1", 0.9, 5.33, 3, 0.3, { size: 12, bold: true, color: C.primary })
  text(
    slide,
    "Our team signs in with their Microsoft account and picks the country cluster they're working in. Everything they see from then on, including employees, contracts and payroll, belongs to that legal entity only.",
    0.9,
    5.63,
    11.5,
    0.6,
    { size: 12, color: C.body }
  )
}

// =====================================================================
// 7. Sign-in and cluster switching
// =====================================================================
{
  const slide = newSlide(
    "Show the cluster switcher. Each Intermediano legal entity is a cluster. Switching changes every list in the sidebar to that entity's data, " +
      "and modules that the entity doesn't use (for example Partner/EOR) disappear from the menu. Roles decide which clusters a person can pick."
  )
  heading(slide, "Before we start", "Sign in once, then pick the country you're working in")
  const real = shot("admin-cluster-switcher")
  if (real) {
    screenshotWindow(slide, real, 0.6, 1.75, 7.8, 4.65, "localhost:3000/admin/dashboard")
    caption(slide, "Screenshot of the running admin console  ·  test data", 0.6, 6.42, 7.8)
  } else {
  const r = browserWindow(slide, 0.6, 1.75, 7.8, 4.65, "localhost:3000/admin/dashboard")
  const c = adminShell(slide, r, { active: "Dashboard" })
  let y = pageHeader(slide, c.x, c.y, c.w, "Admin console", "Workforce overview", "Employee and contract totals for the cluster selected in the header.")
  y = statCards(slide, c.x, y, c.w, [
    ["Employees", "24"],
    ["Active contracts", "19"],
    ["Pending signature", "3"],
  ])
  button(slide, "View all employees  →", c.x, y, 1.2, { kind: "outline" })

  const dx = c.x + 0.39
  const dy = r.y + 0.47
  box(slide, dx + 0.03, dy + 0.04, 2.3, 2.05, { fill: "E7E5E4", r: 0.07 })
  box(slide, dx, dy, 2.3, 2.05, { fill: C.white, line: C.border, r: 0.07 })
  text(slide, "Intermediano Group Companies", dx + 0.12, dy + 0.08, 2.1, 0.15, { size: 5.5, color: C.muted, bold: true })
  const clusters = [
    "Intermediano Colombia SAS",
    "Intermediano Canada",
    "Intermediano do Brasil Ltda",
    "Intermediano Global Services Ltda",
    "Intermediano Costa Rica",
    "Intermediano Uruguay",
    "Intermediano Hongkong",
  ]
  clusters.forEach((name, i) => {
    const iy = dy + 0.3 + i * 0.24
    if (i === 0) box(slide, dx + 0.06, iy - 0.02, 2.18, 0.22, { fill: C.tint, r: 0.04 })
    slide.addShape(S.ellipse, { x: dx + 0.13, y: iy + 0.05, w: 0.09, h: 0.09, fill: { color: i === 0 ? C.primary : C.white }, line: { color: i === 0 ? C.primary : "A3A3A3", width: 0.5 } })
    text(slide, name, dx + 0.3, iy, 1.9, 0.18, { size: 6.3, valign: "middle", bold: i === 0, color: i === 0 ? C.primary : C.body })
  })
  caption(slide, "Recreated from the live admin console  ·  sample data", 0.6, 6.42, 7.8)
  }

  story(slide, {
    who: ["Intermediano team"],
    points: [
      "Staff sign in with their company Microsoft account (Google also supported)",
      "The header shows the active cluster: one Intermediano legal entity",
      "Switching cluster re-scopes every list: employees, contracts, payroll",
      "Roles decide which clusters and modules each person can open",
    ],
    why: "No more mixing countries by mistake. A user only sees the legal entities their role allows.",
  })
}

// =====================================================================
// 8. Step 1: Quotation
// =====================================================================
{
  const slide = newSlide(
    "Step 1. A quotation turns a gross salary into the full monthly invoice for the client: gross salary, payroll costs and provisions, then our fee, the bank fee and local taxes. " +
      "Read the Total invoice at the top right and walk down the summary. Each of the 10 countries has its own rules, " +
      "and automated tests lock the results so a change can't silently alter prices."
  )
  heading(slide, "Step 1  ·  Admin console", "Quote the client in minutes, with every cost explained")
  const real = shot("admin-quotation-detail")
  if (real) {
    screenshotWindow(slide, real, 0.6, 1.75, 7.8, 4.65, "localhost:3000/admin/quotations/…")
    caption(slide, "Screenshot of the running admin console  ·  test data", 0.6, 6.42, 7.8)
  } else {
  const r = browserWindow(slide, 0.6, 1.75, 7.8, 4.65, "localhost:3000/admin/quotations/…")
  const c = adminShell(slide, r, { active: "Quotations" })
  const h = card(slide, c.x, c.y, c.w, 0.62)
  text(slide, "Software Engineer quotation", h.x, c.y + 0.08, 3, 0.18, { size: 9, bold: true })
  text(slide, "for Acme Logistics  ·  Colombia", h.x, c.y + 0.27, 3, 0.12, { size: 5.8, color: C.muted })
  let bx = h.x
  bx += badge(slide, "Ordinary", bx, c.y + 0.42, "tint", 5) + 0.05
  badge(slide, "Intermediano Colombia SAS", bx, c.y + 0.42, "outline", 5)
  text(slide, "TOTAL INVOICE", c.x + c.w - 1.55, c.y + 0.08, 1.4, 0.1, { size: 4.6, color: C.muted, bold: true, align: "right", spacing: 0.3 })
  text(slide, `USD ${money(QUOTE[10][1] / RATE)}`, c.x + c.w - 1.95, c.y + 0.18, 1.8, 0.22, { size: 11, bold: true, color: C.primary, align: "right" })
  text(slide, `COP ${money(QUOTE[10][1])}`, c.x + c.w - 1.95, c.y + 0.41, 1.8, 0.12, { size: 5.5, color: C.muted, align: "right" })

  const lw = c.w * 0.63
  const ty = c.y + 0.72
  const lc = card(slide, c.x, ty, lw, 3.0, "Summary")
  table(
    slide,
    lc.x,
    lc.y,
    lc.w,
    ["Item", "COP", "USD"],
    QUOTE.map(([label, amount, isTotal]) => {
      const o = isTotal ? { bold: true, fontFace: FONT_SEMI, fill: { color: C.surface }, color: C.fg } : {}
      return [{ text: label, options: o }, { text: money(amount), options: o }, { text: money(amount / RATE), options: o }]
    }),
    { colW: [lc.w * 0.52, lc.w * 0.27, lc.w * 0.21], rowH: 0.205, size: 5.6, align: ["left", "right", "right"] }
  )
  const rx = c.x + lw + 0.1
  const rw = c.w - lw - 0.1
  const qc = card(slide, rx, ty, rw, 3.0, "Quoted values", "What the breakdown is calculated from.")
  const values = [
    ["Gross salary", "6,500,000.00"],
    ["Exchange rate", "4100 COP per USD"],
    ["Type of fee", "Percentage rate"],
    ["Fee", "10%"],
    ["Bank fee", "USD 25.00"],
    ["Dependent", "No"],
    ["Bonus", "0.00"],
    ["Transport allowance", "0.00"],
  ]
  values.forEach(([k, v], i) => {
    const vy = qc.y + i * 0.3
    text(slide, k, qc.x, vy, qc.w, 0.11, { size: 5, color: C.muted })
    text(slide, v, qc.x, vy + 0.11, qc.w, 0.14, { size: 6.3, bold: true })
  })
  caption(slide, "Recreated from the live quotation screen  ·  figures are real calculator output", 0.6, 6.42, 7.8)
  }
  stepTracker(slide, 1)

  story(slide, {
    who: ["Sales / Operations"],
    points: [
      "Enter the gross salary, exchange rate and fee; the country calculator does the rest",
      "Full breakdown: payroll costs, provisions, fee, bank fee and local taxes",
      "Shown in payroll currency and billing currency side by side",
      "10 countries covered, plus Colombia integral and Quebec rules",
    ],
    why: "Consistent, auditable pricing in every country. Tests lock the formulas so a change can't silently alter a client's price.",
  })
}

// =====================================================================
// 9. Step 2: Contract
// =====================================================================
{
  const slide = newSlide(
    "Step 2. Once the client accepts, we create the contract. The PDF is generated from the country's template (we built a block editor for templates), " +
      "and the list shows at a glance who still has to sign. Status is automatic: upcoming, pending signature, active or ended, based on dates and signatures."
  )
  heading(slide, "Step 2  ·  Admin console", "Contracts from country templates, signatures tracked")
  const real = shot("admin-contracts")
  if (real) {
    screenshotWindow(slide, real, 0.6, 1.75, 7.8, 4.65, "localhost:3000/admin/contracts")
    caption(slide, "Screenshot of the running admin console  ·  test data", 0.6, 6.42, 7.8)
  } else {
  const r = browserWindow(slide, 0.6, 1.75, 7.8, 4.65, "localhost:3000/admin/contracts")
  const c = adminShell(slide, r, { active: "Contracts" })
  const y = pageHeader(slide, c.x, c.y, c.w, "Cluster workspace", "Contracts", "Every contract signed under the cluster selected in the header.")
  const tc = card(slide, c.x, y, c.w, 3.0, "Contracts", "Employee, customer and partner contracts under this legal entity.")
  searchRow(slide, tc.x, tc.y, tc.w, "Search employee, position, client…", "+  Add contract")
  chips(slide, tc.x, tc.y + 0.27, ["All kinds", "Employee", "Customer", "Partner", "|", "Any period", "Fixed term", "Open-ended"])
  const tw = tc.w - 1.7
  table(
    slide,
    tc.x,
    tc.y + 0.55,
    tw,
    ["Employee", "Client", "Signatures", "Status"],
    [
      [two("Juan Pérez", "Software Engineer · Jan 1, 2026 – open-ended"), "Acme Logistics", "✓ Employee  ✓ Admin", status("Active", "solid")],
      [two("Camila Torres", "Data Analyst · Nov 1, 2026 – Oct 31, 2027"), "Northwind", "◷ Employee  ✓ Admin", status("Pending signature", "outline")],
      [two("Lucas Almeida", "QA Engineer · Dec 1, 2026 – open-ended"), "Maple Staffing", "◷ Employee  ◷ Admin", status("Upcoming", "secondary")],
      [two("Acme Logistics", "Customer · Service agreement"), "—", "✓ Customer  ✓ Admin", status("Active", "solid")],
    ],
    { colW: [tw * 0.4, tw * 0.2, tw * 0.22, tw * 0.18], rowH: 0.36, size: 5.5 }
  )

  const pw = 1.5
  const ph = 1.95
  const px = tc.x + tc.w - pw
  const py = tc.y + 0.55
  box(slide, px + 0.05, py + 0.06, pw, ph, { fill: "D6D3D1", r: 0.03 })
  box(slide, px, py, pw, ph, { fill: C.white, line: "A8A29E", r: 0.03 })
  const wm = imageSize(WORDMARK)
  slide.addImage({ path: WORDMARK, x: px + 0.1, y: py + 0.08, w: 0.7, h: (0.7 * wm.h) / wm.w })
  badge(slide, "PDF", px + pw - 0.38, py + 0.1, "solid", 6)
  text(slide, "CONTRATO INDIVIDUAL DE TRABAJO", px + 0.08, py + 0.38, pw - 0.16, 0.15, { size: 4.8, bold: true, align: "center" })
  for (let i = 0; i < 9; i++) {
    box(slide, px + 0.12, py + 0.62 + i * 0.11, i % 4 === 3 ? 0.75 : pw - 0.24, 0.03, { fill: "D4D4D4" })
  }
  slide.addShape(S.line, { x: px + 0.12, y: py + 1.75, w: 0.5, h: 0, line: { color: "737373", width: 0.5 } })
  slide.addShape(S.line, { x: px + pw - 0.62, y: py + 1.75, w: 0.5, h: 0, line: { color: "737373", width: 0.5 } })
  button(slide, "Open PDF", px, py + ph + 0.1, 0.72, { size: 5.5 })
  button(slide, "Download", px + 0.78, py + ph + 0.1, 0.72, { kind: "outline", size: 5.5 })
  caption(slide, "Recreated from the live contracts screen  ·  sample data", 0.6, 6.42, 7.8)
  }
  stepTracker(slide, 2)

  story(slide, {
    who: ["Operations", "Legal"],
    points: [
      "Contract terms come straight from the employee, client and quotation",
      "One click opens or downloads the PDF in the country's legal format",
      "Templates are edited with a block editor, so most changes need no developer",
      "Status updates automatically: upcoming, pending signature, active, ended",
    ],
    why: "Contracts are consistent per country, and nobody loses track of who still has to sign.",
  })
}

// =====================================================================
// 10-11. Step 3: Employee hub (real screenshots when available)
// =====================================================================
function employeeSlide({ title, notes, primary, secondary, mock, story: s }) {
  const slide = newSlide(notes)
  heading(slide, "Step 3  ·  Employee hub", title)
  const a = shot(primary.name)
  const b = secondary ? shot(secondary.name) : null
  if (a && b) {
    screenshotWindow(slide, a, 0.6, 1.75, 5.2, 4.6, primary.url)
    screenshotWindow(slide, b, 3.2, 2.7, 5.2, 3.7, secondary.url)
  } else if (a) {
    screenshotWindow(slide, a, 0.6, 1.75, 7.8, 4.65, primary.url)
  } else {
    mock.draw(slide, browserWindow(slide, 0.6, 1.75, 7.8, 4.65, mock.url))
  }
  caption(slide, a ? "Screenshot of the running employee hub" : "Recreated from the live employee hub  ·  sample data", 0.6, 6.42, 7.8)
  stepTracker(slide, 3)
  story(slide, s)
}

employeeSlide({
  title: "Employees log their hours themselves",
  notes:
    "Step 3. The employee signs in to the Employee hub and sees their timesheets, vacations, expenses and payslips in one place. " +
    "Each month they submit a timesheet; it goes to the client for approval. Live demo: sign in as juan.perez@employee.test.",
  primary: { name: "employee-timesheets", url: "localhost:3000/employee/timesheets" },
  secondary: { name: "employee-timesheet-new", url: "localhost:3000/employee/timesheets/new" },
  mock: { url: "localhost:3000/employee/timesheets", draw: employeeTimesheetsMock },
  story: {
    who: ["Employee"],
    points: [
      "Timesheet history with each month's review status",
      "Monthly timesheet filled in day by day, then submitted for approval",
      "Status and reviewer comments come back to the employee",
      "Works with email and password, or SSO",
    ],
    why: "Hours come in on time, in one format, straight from the person who worked them.",
  },
})

employeeSlide({
  title: "Vacation and expense requests, with receipts",
  notes:
    "Still step 3. Vacation requests check the employee's balance; expense claims carry the receipt for each item, " +
    "local or abroad, with taxes or exchange rates. Both go to the client and to our team for approval.",
  primary: { name: "employee-vacations", url: "localhost:3000/employee/vacations" },
  secondary: { name: "employee-expense-new", url: "localhost:3000/employee/expenses/new" },
  mock: { url: "localhost:3000/employee/vacations", draw: employeeVacationsMock },
  story: {
    who: ["Employee"],
    points: [
      "Request time off; approved days come out of the vacation balance",
      "Claim expenses item by item with the receipt attached",
      "Local claims include taxes; abroad claims include the exchange rate",
      "Rejected requests can be corrected and sent again",
    ],
    why: "Every request has a clear status and a full history of who decided what, and when.",
  },
})

// =====================================================================
// 12. Step 4: Client portal overview
// =====================================================================
{
  const slide = newSlide(
    "Step 4. This is the client's view. When Acme Logistics signs in, the overview tells them exactly what is waiting for them: timesheets, vacations and expenses to review, plus their active contracts. " +
      "Client accounts are created by our team from the Portal accounts screen."
  )
  heading(slide, "Step 4  ·  Client portal", "Clients see their team and approve in one place")
  const r = browserWindow(slide, 0.6, 1.75, 7.8, 4.65, "localhost:3000/customer/dashboard")
  const c = customerShell(slide, r, "Overview")
  slide.addShape(S.roundRect, {
    x: c.x,
    y: c.y,
    w: c.w,
    h: 1.25,
    rectRadius: 0.12,
    fill: { type: "solid", color: C.primary },
    line: { color: C.primary, width: 0.1 },
  })
  box(slide, c.x + c.w - 2.2, c.y, 2.2, 1.25, { fill: C.primaryDark, r: 0.12 })
  box(slide, c.x + c.w - 2.2, c.y, 0.4, 1.25, { fill: C.primaryDark })
  text(slide, "CLIENT PORTAL", c.x + 0.25, c.y + 0.18, 3, 0.14, { size: 5.5, color: "F3D9D4", bold: true, spacing: 1 })
  text(slide, "Welcome, Acme Logistics", c.x + 0.25, c.y + 0.35, 5, 0.3, { size: 14, color: C.white, bold: true })
  text(
    slide,
    "Everything about the team Intermediano manages for you, from contracts to timesheet, vacation and expense approvals, in one place.",
    c.x + 0.25,
    c.y + 0.72,
    4.3,
    0.4,
    { size: 6.8, color: "F3D9D4", lineSpacing: 1.1 }
  )
  text(slide, "Where would you like to start?", c.x, c.y + 1.45, 4, 0.2, { size: 9, bold: true })
  const shortcuts = [
    ["Timesheets", "Approve the monthly hours your team submits.", "3 to review"],
    ["Vacations", "Respond to time off requested by your staff.", "1 to review"],
    ["Expenses", "Review expenses your team submits for reimbursement.", "2 to review"],
    ["Contracts", "Your service agreements and your placed staff's contracts.", "4 active"],
  ]
  const sw = (c.w - 0.15) / 2
  shortcuts.forEach(([title, desc, count], i) => {
    const x = c.x + (i % 2) * (sw + 0.15)
    const y = c.y + 1.75 + Math.floor(i / 2) * 0.95
    box(slide, x, y, sw, 0.82, { fill: C.white, line: C.border, r: 0.08 })
    box(slide, x + 0.14, y + 0.14, 0.3, 0.3, { fill: C.tint, r: 0.06 })
    box(slide, x + 0.24, y + 0.24, 0.1, 0.1, { fill: C.primary, r: 0.02 })
    text(slide, title, x + 0.55, y + 0.13, 1.5, 0.18, { size: 8, bold: true })
    text(slide, desc, x + 0.55, y + 0.34, sw - 0.7, 0.35, { size: 6, color: C.muted })
    const bw = badgeWidth(count, 5.5)
    badge(slide, count, x + sw - bw - 0.12, y + 0.13, i < 3 ? "amber" : "tint", 5.5)
  })
  caption(slide, "Recreated from the live client portal  ·  sample data", 0.6, 6.42, 7.8)
  stepTracker(slide, 4)

  story(slide, {
    who: ["Client HR / Manager"],
    points: [
      "One overview of everything waiting for the client's decision",
      "Contracts for their service agreement and placed staff, as PDFs",
      "Accounts for client and partner contacts are managed by our team",
      "Clients only ever see their own company's people",
    ],
    why: "Approvals happen in one place, so payroll can start as soon as the client says yes.",
  })
}

// =====================================================================
// 13. Step 4: Timesheet review
// =====================================================================
{
  const slide = newSlide(
    "The client opens a timesheet, sees the hours day by day on a calendar, and approves or rejects with a comment. " +
      "The employee sees the decision and the comment in their hub. Vacations and expenses work the same way; expenses can be approved per item or all at once."
  )
  heading(slide, "Step 4  ·  Client portal", "Approve hours with one click, and leave a comment")
  const r = browserWindow(slide, 0.6, 1.75, 7.8, 4.65, "localhost:3000/customer/timesheets/…")
  const c = customerShell(slide, r, "Timesheets")
  const h = card(slide, c.x, c.y, c.w, 0.6)
  text(slide, "October 2026 timesheet", h.x, c.y + 0.08, 3, 0.18, { size: 9, bold: true })
  text(slide, "Juan Pérez  ·  for Acme Logistics", h.x, c.y + 0.27, 3, 0.12, { size: 5.8, color: C.muted })
  badge(slide, "Pending", h.x, c.y + 0.41, "amber", 5)
  text(slide, "TOTAL HOURS", c.x + c.w - 1.4, c.y + 0.1, 1.25, 0.1, { size: 4.6, color: C.muted, bold: true, align: "right", spacing: 0.3 })
  text(slide, "176 hrs", c.x + c.w - 1.4, c.y + 0.2, 1.25, 0.25, { size: 12, bold: true, color: C.primary, align: "right" })

  const lw = c.w * 0.64
  const cy = c.y + 0.7
  const dc = card(slide, c.x, cy, lw, 2.95, "Daily hours", "22 days with hours logged in October 2026.")
  const cw = dc.w / 7
  ;["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d, i) => {
    text(slide, d, dc.x + i * cw, dc.y, cw, 0.12, { size: 5, color: C.muted, bold: true, align: "center" })
  })
  // October 1, 2026 is a Thursday.
  for (let day = 1; day <= 31; day++) {
    const idx = day + 3
    const col = idx % 7
    const row = Math.floor(idx / 7)
    const weekend = col === 0 || col === 6
    const x = dc.x + col * cw + 0.02
    const y = dc.y + 0.16 + row * 0.42
    box(slide, x, y, cw - 0.04, 0.38, { fill: weekend ? C.surface : C.tint, line: weekend ? C.border : C.tintStrong, r: 0.04, lw: 0.5 })
    text(slide, String(day), x + 0.04, y + 0.03, 0.3, 0.1, { size: 4.8, color: C.muted })
    if (!weekend) text(slide, "8h", x, y + 0.14, cw - 0.04, 0.2, { size: 7, bold: true, color: C.primary, align: "center" })
  }
  const rx = c.x + lw + 0.1
  const rw = c.w - lw - 0.1
  const rc = card(slide, rx, cy, rw, 2.95, "Your review", "The employee sees the status and your comment.")
  box(slide, rc.x, rc.y, rc.w, 0.26, { fill: C.surface, r: 0.05 })
  box(slide, rc.x + 0.02, rc.y + 0.02, rc.w / 2 - 0.02, 0.22, { fill: C.white, line: C.border, r: 0.04 })
  text(slide, "✓ Approve", rc.x + 0.02, rc.y + 0.02, rc.w / 2 - 0.02, 0.22, { size: 6, bold: true, color: C.green, align: "center", valign: "middle" })
  text(slide, "✕ Reject", rc.x + rc.w / 2, rc.y + 0.02, rc.w / 2, 0.22, { size: 6, color: C.muted, align: "center", valign: "middle" })
  text(slide, "Comment", rc.x, rc.y + 0.38, rc.w, 0.12, { size: 5.5, bold: true })
  box(slide, rc.x, rc.y + 0.53, rc.w, 0.8, { fill: C.white, line: C.border, r: 0.05 })
  text(slide, "Thanks Juan, all good for October.", rc.x + 0.06, rc.y + 0.58, rc.w - 0.12, 0.3, { size: 5.8, color: C.body })
  text(slide, "33/255 characters", rc.x, rc.y + 1.37, rc.w, 0.1, { size: 4.6, color: C.muted, align: "right" })
  button(slide, "Save review", rc.x, rc.y + 1.55, rc.w, { h: 0.22 })
  caption(slide, "Recreated from the live client portal  ·  sample data", 0.6, 6.42, 7.8)
  stepTracker(slide, 4)

  story(slide, {
    who: ["Client", "Intermediano team"],
    points: [
      "Calendar view of the month's hours, weekends greyed out",
      "Approve or reject with an optional comment for the employee",
      "Vacations: approve or reject with a confirmation step",
      "Expenses: approve per item, or approve all pending at once",
    ],
    why: "Approved hours flow straight into payroll, with a record of who approved what and when.",
  })
}

// =====================================================================
// 14. Step 5: Payroll
// =====================================================================
{
  const slide = newSlide(
    "Step 5. Payroll runs monthly per consultant using the same country calculators as quotations. " +
      "The provisions ledger tracks what has been accrued over every run (for Colombia: cesantías, intereses, prima, vacation, indemnization), what was already paid, and the balance. " +
      "Every saved payroll keeps a snapshot, so a later rate change never alters a month that was already billed."
  )
  heading(slide, "Step 5  ·  Admin console", "Monthly payroll, every provision tracked")
  const real = shot("admin-payroll-detail")
  if (real) {
    screenshotWindow(slide, real, 0.6, 1.75, 7.8, 4.65, "localhost:3000/admin/payroll/…")
    caption(slide, "Screenshot of the running admin console  ·  test data", 0.6, 6.42, 7.8)
  } else {
  const r = browserWindow(slide, 0.6, 1.75, 7.8, 4.65, "localhost:3000/admin/payroll/…")
  const c = adminShell(slide, r, { active: "Payroll" })
  const h = card(slide, c.x, c.y, c.w, 0.6)
  text(slide, "October 2026 payroll", h.x, c.y + 0.08, 3, 0.18, { size: 9, bold: true })
  text(slide, "Juan Pérez  ·  for Acme Logistics", h.x, c.y + 0.27, 3, 0.12, { size: 5.8, color: C.muted })
  badge(slide, "Ordinary", h.x, c.y + 0.41, "tint", 5)
  text(slide, "TOTAL INVOICE", c.x + c.w - 1.55, c.y + 0.08, 1.4, 0.1, { size: 4.6, color: C.muted, bold: true, align: "right", spacing: 0.3 })
  text(slide, `USD ${money(QUOTE[10][1] / RATE)}`, c.x + c.w - 1.95, c.y + 0.18, 1.8, 0.22, { size: 11, bold: true, color: C.primary, align: "right" })
  text(slide, `COP ${money(QUOTE[10][1])}`, c.x + c.w - 1.95, c.y + 0.41, 1.8, 0.12, { size: 5.5, color: C.muted, align: "right" })

  const lc = card(slide, c.x, c.y + 0.7, c.w, 2.25, "Provisions ledger", "Accrued over this run and 9 earlier runs for this consultant, in COP.")
  const ledger = [
    ["Cesantias", 5414500, 0],
    ["Interests over Cesantias", 649740, 0],
    ["Prima", 5414500, 3248700],
    ["Vacation", 2710500, 0],
    ["Indemnization", 3640000, 0],
  ]
  const rows = ledger.map(([name, accrued, paid]) => [name, money(accrued, 0), money(paid, 0), money(accrued - paid, 0), "0", money(accrued - paid, 0)])
  const tot = ledger.reduce((a, [, acc, paid]) => [a[0] + acc, a[1] + paid], [0, 0])
  const bold = { bold: true, fontFace: FONT_SEMI, fill: { color: C.surface }, color: C.fg }
  rows.push(
    ["Total", money(tot[0], 0), money(tot[1], 0), money(tot[0] - tot[1], 0), "0", money(tot[0] - tot[1], 0)].map((t) => ({ text: t, options: bold }))
  )
  table(slide, lc.x, lc.y, lc.w, ["Provision", "Accrued", "Paid earlier", "Accumulated", "Paid this run", "Balance"], rows, {
    colW: [lc.w * 0.25, lc.w * 0.15, lc.w * 0.15, lc.w * 0.16, lc.w * 0.14, lc.w * 0.15],
    rowH: 0.22,
    size: 5.6,
    align: ["left", "right", "right", "right", "right", "right"],
  })
  card(slide, c.x, c.y + 3.05, c.w * 0.49, 0.5, "Paid provisions", "None paid this month.")
  card(slide, c.x + c.w * 0.51, c.y + 3.05, c.w * 0.49, 0.5, "Snapshot saved", "Figures frozen when this payroll was saved.")
  caption(slide, "Recreated from the live payroll screen  ·  provision amounts from the real Colombia calculator", 0.6, 6.42, 7.8)
  }
  stepTracker(slide, 5)

  story(slide, {
    who: ["Payroll / Finance"],
    points: [
      "One payroll run per consultant per month, using the country calculator",
      "Ledger shows accrued, already paid, and remaining balance per provision",
      "Each saved run keeps a snapshot of its figures",
      "Filter by month, consultant and contract type",
    ],
    why: "We always know what we owe each worker in provisions, and past invoices can't change when rates do.",
  })
}

// =====================================================================
// 15. Step 6: Payslips
// =====================================================================
{
  const slide = newSlide(
    "Step 6. Our team uploads the payslip PDF for the period. It appears immediately in the employee's hub, where they can download it any time. " +
      "This closes the loop we started at the quote."
  )
  heading(slide, "Step 6  ·  Admin console → Employee hub", "Payslips delivered straight to each employee")
  const r = browserWindow(slide, 0.6, 1.75, 7.8, 4.65, "localhost:3000/admin/payslips")
  const c = adminShell(slide, r, { active: "Payslips" })
  let y = pageHeader(slide, c.x, c.y, c.w, "Cluster workspace", "Payslips", "Payslip PDFs for employees in the cluster selected in the header. Employees see theirs in the Employee hub.")
  y = statCards(slide, c.x, y, c.w, [
    ["Payslips", "42"],
    ["Employees with payslips", "21"],
    ["Latest period", "Oct 2026"],
  ], 0.44)
  const tc = card(slide, c.x, y, c.w, 2.2, "Payslips", "Uploaded payslips, newest period first.")
  searchRow(slide, tc.x, tc.y, tc.w, "Search employee or file name…", "⤒  Upload payslip")
  table(
    slide,
    tc.x,
    tc.y + 0.3,
    tc.w,
    ["Employee", "Period", "File", "Uploaded"],
    [
      ["Juan Pérez", "October 2026", "⤓ payslip-2026-10-juan-perez.pdf", "Nov 3, 2026"],
      ["Camila Torres", "October 2026", "⤓ payslip-2026-10-camila-torres.pdf", "Nov 3, 2026"],
      ["Juan Pérez", "September 2026", "⤓ payslip-2026-09-juan-perez.pdf", "Oct 2, 2026"],
      ["Camila Torres", "September 2026", "⤓ payslip-2026-09-camila-torres.pdf", "Oct 2, 2026"],
    ],
    { colW: [tc.w * 0.22, tc.w * 0.2, tc.w * 0.4, tc.w * 0.18], rowH: 0.24, size: 5.6 }
  )

  const emp = shot("employee-payslips")
  if (emp) {
    screenshotWindow(slide, emp, 4.6, 3.9, 3.9, 2.6, "localhost:3000/employee/payslips")
    caption(slide, "Admin screen recreated  ·  employee hub inset is a live screenshot", 0.6, 6.42, 4.0)
  } else {
    caption(slide, "Recreated from the live admin console  ·  sample data", 0.6, 6.42, 7.8)
  }
  stepTracker(slide, 6)

  story(slide, {
    who: ["Payroll", "Employee"],
    points: [
      "Upload the payslip PDF for an employee and period",
      "It shows up immediately in the employee's hub",
      "Employees download any past payslip themselves",
      "Search and filter by employee, file name or month",
    ],
    why: "Employees get their own payslips any time, and every document is in one secure place.",
  })
}

// =====================================================================
// 16. Control & governance
// =====================================================================
{
  const slide = newSlide(
    "Behind the process there's a control layer that the business can manage without developers: roles with view/manage permissions per module, " +
      "which clusters each role can access, which modules each legal entity uses, contract templates per country, and public holidays per country."
  )
  heading(slide, "Control without developers", "Roles, modules and templates, managed by the business")

  const r1 = browserWindow(slide, 0.6, 1.75, 6.0, 3.25, "localhost:3000/admin/users/roles")
  text(slide, "Roles", r1.x + 0.25, r1.y + 0.15, 3, 0.25, { size: 11, bold: true })
  const roles = [
    ["admin", "Full access to every module", "16 of 16", "All clusters", true],
    ["payroll officer", "Runs payroll and payslips", "5 of 16", "Colombia, Canada", false],
    ["sales", "Quotes, companies and partners", "4 of 16", "All clusters", false],
  ]
  roles.forEach(([name, desc, modules, clusters, locked], i) => {
    const x = r1.x + 0.25 + i * 1.85
    const y = r1.y + 0.5
    box(slide, x, y, 1.72, 2.25, { fill: C.white, line: C.border, r: 0.08 })
    box(slide, x + 0.12, y + 0.12, 0.24, 0.24, { fill: C.tint, r: 0.05 })
    text(slide, "⛨", x + 0.12, y + 0.12, 0.24, 0.24, { size: 8, color: C.primary, align: "center", valign: "middle" })
    text(slide, name, x + 0.42, y + 0.14, 1.2, 0.2, { size: 8, bold: true })
    if (locked) badge(slide, "Protected", x + 0.12, y + 0.44, "muted", 5)
    text(slide, desc, x + 0.12, y + 0.66, 1.5, 0.3, { size: 6, color: C.muted })
    box(slide, x + 0.12, y + 1.0, 0.7, 0.45, { fill: C.surface, r: 0.05 })
    box(slide, x + 0.9, y + 1.0, 0.7, 0.45, { fill: C.surface, r: 0.05 })
    text(slide, "Users", x + 0.18, y + 1.04, 0.6, 0.12, { size: 5, color: C.muted })
    text(slide, String([2, 3, 4][i]), x + 0.18, y + 1.17, 0.6, 0.22, { size: 10, bold: true })
    text(slide, "Modules", x + 0.96, y + 1.04, 0.6, 0.12, { size: 5, color: C.muted })
    text(slide, modules, x + 0.96, y + 1.19, 0.65, 0.2, { size: 7.5, bold: true })
    text(slide, `◎  ${clusters}`, x + 0.12, y + 1.55, 1.5, 0.15, { size: 5.5, color: C.body })
    button(slide, locked ? "View permissions" : "Edit permissions", x + 0.12, y + 1.85, 1.48, { kind: "outline", size: 5.5 })
  })

  const r2 = browserWindow(slide, 6.85, 1.75, 5.88, 3.25, "localhost:3000/admin/intermediano-companies/…")
  text(slide, "Modules", r2.x + 0.25, r2.y + 0.15, 1.2, 0.25, { size: 11, bold: true })
  badge(slide, "6 of 10", r2.x + 1.1, r2.y + 0.2, "tint", 6)
  text(slide, "What this entity offers. Disabled modules are hidden from its cluster workspace.", r2.x + 0.25, r2.y + 0.43, 5.4, 0.15, { size: 6, color: C.muted })
  const modules = [
    ["Quotations", true],
    ["Employees", true],
    ["Contracts", true],
    ["Timesheets", true],
    ["Expenses", true],
    ["Payroll", true],
    ["Partner (EOR)", false],
    ["Payslips", false],
    ["Invoices", false],
    ["MSP payroll", false],
  ]
  modules.forEach(([label, on], i) => {
    const x = r2.x + 0.25 + (i % 2) * 2.75
    const y = r2.y + 0.72 + Math.floor(i / 2) * 0.4
    box(slide, x, y, 2.6, 0.33, { fill: on ? C.tint : C.white, line: on ? C.tintStrong : C.border, r: 0.05 })
    box(slide, x + 0.1, y + 0.1, 0.13, 0.13, { fill: on ? C.primary : C.white, line: on ? C.primary : "A3A3A3", r: 0.02 })
    if (on) text(slide, "✓", x + 0.1, y + 0.08, 0.13, 0.15, { size: 6, color: C.white, bold: true, align: "center" })
    text(slide, label, x + 0.32, y, 2.2, 0.33, { size: 7, bold: on, valign: "middle", color: on ? C.primary : C.body })
  })

  const pillars = [
    ["Roles & permissions", "View or manage, per module, for 16 areas"],
    ["Cluster access", "Each role can be limited to certain legal entities"],
    ["Module switches", "10 modules, on or off per legal entity"],
    ["Contract templates", "Block editor: clauses, tables, signatures, conditions"],
    ["Holidays", "Public holidays per country and year"],
  ]
  const pw = (12.13 - 0.12 * 4) / 5
  pillars.forEach(([title, desc], i) => {
    const x = 0.6 + i * (pw + 0.12)
    box(slide, x, 5.3, pw, 1.1, { fill: i % 2 ? C.surface : C.tint, r: 0.1 })
    text(slide, title, x + 0.18, 5.42, pw - 0.3, 0.3, { size: 12, bold: true, color: C.primary })
    text(slide, desc, x + 0.18, 5.74, pw - 0.3, 0.6, { size: 10, color: C.body })
  })
  caption(slide, "Recreated from the live settings screens  ·  sample roles", 0.6, 6.5, 12.13)
}

// =====================================================================
// 17. Built for safety
// =====================================================================
{
  const slide = newSlide(
    "For the CEO, the point is risk: this handles payroll and personal data. Key safeguards are already in: SSO, permission checks on every action, " +
      "data scoped per legal entity, login rate-limiting, payroll snapshots, and automated tests on the calculators and approval flows."
  )
  heading(slide, "Built for trust", "Payroll and personal data, protected by design")
  const items = [
    ["Company sign-in", "Our staff use Microsoft (or Google) single sign-on, and only people added as users can get in."],
    ["Every action checked", "Each screen and each save checks the person's role, their cluster access and whether the module is on."],
    ["Country separation", "Records are tied to one legal entity; lists and searches never mix clusters."],
    ["Login protection", "Client and employee logins are rate-limited and lock out repeated failed attempts."],
    ["Frozen payroll figures", "Each saved payroll keeps a snapshot, so billed months don't change when rates change."],
    ["Automated tests", "154 tests in 12 suites cover calculators, payroll ledger, approvals, portals and templates."],
  ]
  items.forEach(([title, desc], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 0.6 + col * 4.1
    const y = 1.85 + row * 2.3
    box(slide, x, y, 3.93, 2.05, { fill: C.white, line: C.border, r: 0.14 })
    box(slide, x + 0.3, y + 0.3, 0.5, 0.5, { fill: C.tint, r: 0.1 })
    text(slide, String(i + 1), x + 0.3, y + 0.3, 0.5, 0.5, { size: 16, bold: true, color: C.primary, align: "center", valign: "middle" })
    text(slide, title, x + 0.3, y + 0.92, 3.4, 0.35, { size: 15, bold: true })
    text(slide, desc, x + 0.3, y + 1.27, 3.4, 0.75, { size: 11, color: C.muted, lineSpacing: 1.05 })
  })
}

// =====================================================================
// 18. Live demo divider
// =====================================================================
{
  const slide = pptx.addSlide()
  slide.background = { color: C.primary }
  slide.addNotes(
    "Switch to the browser. Run sheet: (1) Admin: cluster switcher, (2) Quotation detail, (3) Contract → Open PDF, (4) Employee hub as Juan: timesheet, vacation, expense, " +
      "(5) Client portal: approve the timesheet, (6) Admin payroll ledger, (7) Employee payslips. Backup: recorded video on the desktop."
  )
  box(slide, 0, 0, 0.18, 7.5, { fill: C.red })
  text(slide, "LIVE DEMO", 1.0, 2.3, 8, 0.4, { size: 14, color: "F3D9D4", bold: true, spacing: 3 })
  text(slide, "Let's follow Juan from quote to payslip", 1.0, 2.75, 11, 1.0, { size: 40, bold: true, color: C.white })
  const steps = ["Pick a cluster", "Quote", "Contract PDF", "Employee requests", "Client approves", "Payroll", "Payslip"]
  steps.forEach((label, i) => {
    const x = 1.0 + i * 1.6
    slide.addText(label, {
      x,
      y: 4.3,
      w: 1.48,
      h: 0.5,
      shape: S.roundRect,
      rectRadius: 0.25,
      fill: { color: C.primaryDark },
      line: { color: "A0473A", width: 0.75 },
      fontFace: FONT_SEMI,
      fontSize: 10.5,
      color: C.white,
      align: "center",
      valign: "middle",
      margin: 0,
    })
  })
}

// =====================================================================
// 19. Coverage vs legacy
// =====================================================================
{
  const slide = newSlide(
    "Be transparent about scope. Green is live in the new platform, amber is being finished this week, grey is still to port from the legacy system. " +
      "The remaining items exist in the legacy ERP and in our permission model, so they're planned rather than open questions."
  )
  heading(slide, "Scope", "What's live, what's in progress, what's next")
  const cols = [
    [
      "Live now",
      C.greenBg,
      C.green,
      ["Quotations & 10 country calculators", "Employees & consultants", "Contracts & PDF templates", "Timesheets", "Vacations", "Expenses with receipts", "Payroll & provisions ledger", "Payslips", "Companies & partners", "Client portal & portal accounts", "Users, roles, modules, holidays"],
    ],
    ["In progress (this week)", C.amberBg, C.amber, ["Employee profile (personal, dependents, banking)", "Employee contract view", "Employee documents", "More country contract templates (Chile)"]],
    ["Next to port from legacy", C.surface, C.muted, ["Invoices", "MSP payroll", "Leads & contacts (CRM)", "Vacancies (recruitment)", "Investments", "Data migration & cutover"]],
  ]
  cols.forEach(([title, fill, accent, items], i) => {
    const x = 0.6 + i * 4.1
    box(slide, x, 1.8, 3.93, 4.65, { fill: C.white, line: C.border, r: 0.14 })
    box(slide, x, 1.8, 3.93, 0.6, { fill, r: 0.14 })
    box(slide, x, 2.1, 3.93, 0.3, { fill })
    text(slide, `●  ${title}`, x + 0.25, 1.8, 3.5, 0.6, { size: 14, bold: true, color: accent, valign: "middle" })
    bullets(slide, items, x + 0.25, 2.58, 3.5, 3.8, { size: 11.5, gap: 3 })
  })
}

// =====================================================================
// 20. Roadmap
// =====================================================================
{
  const slide = newSlide(
    "Proposed plan, not committed dates: adjust to what the CEO prioritises. " +
      "The recommendation is a phased rollout, one cluster at a time, starting with a pilot, and running the legacy system in parallel for one payroll cycle."
  )
  heading(slide, "Roadmap", "Proposed path to go-live", "Phased by country cluster, so each rollout is small and reversible")
  const phases = [
    ["Now – mid Nov", "Complete the core", ["Finish employee profile, contract & documents", "Remaining contract templates", "Invoices module"]],
    ["Mid Nov – early Dec", "Port the rest", ["CRM: leads & contacts", "Vacancies, investments, MSP payroll", "Data migration scripts & dry runs"]],
    ["December", "Pilot", ["One cluster, one or two clients", "Run in parallel with legacy for one payroll", "Finance checks the figures"]],
    ["January", "Roll out", ["Cluster by cluster go-live", "Train teams, invite clients & employees", "Retire legacy per cluster"]],
  ]
  const w = (12.13 - 0.15 * 3) / 4
  phases.forEach(([when, title, items], i) => {
    const x = 0.6 + i * (w + 0.15)
    slide.addText(when, {
      x,
      y: 1.9,
      w,
      h: 0.5,
      shape: i === 0 ? S.homePlate : S.chevron,
      fill: { color: i === 0 ? C.primary : i === 1 ? "9A4334" : i === 2 ? "B8695B" : "D49A8F" },
      line: { color: C.white, width: 0.1 },
      fontFace: FONT_SEMI,
      fontSize: 12,
      color: C.white,
      align: "center",
      valign: "middle",
      margin: 0,
    })
    box(slide, x, 2.6, w, 3.0, { fill: i === 0 ? C.tint : C.white, line: C.border, r: 0.12 })
    text(slide, title, x + 0.25, 2.8, w - 0.4, 0.35, { size: 15, bold: true, color: C.primary })
    bullets(slide, items, x + 0.25, 3.3, w - 0.45, 2.2, { size: 11.5, gap: 6 })
  })
  box(slide, 0.6, 5.85, 12.13, 0.55, { fill: C.surface, r: 0.1 })
  text(slide, "Dates are a proposal and depend on the decisions on the next slide.", 0.6, 5.85, 12.13, 0.55, {
    size: 11.5,
    color: C.muted,
    italic: true,
    align: "center",
    valign: "middle",
  })
}

// =====================================================================
// 21. Decisions needed
// =====================================================================
{
  const slide = newSlide(
    "This is the most important slide for the CEO. Ask for these decisions explicitly; each one unblocks part of the roadmap. " +
      "My recommendation for the pilot is Intermediano Colombia, because it has the most complete calculators and templates today."
  )
  heading(slide, "What I need from you", "Five decisions to keep us on track")
  const decisions = [
    ["Pilot cluster", "Which legal entity goes first?", "Recommend: Intermediano Colombia"],
    ["Pilot clients", "Which one or two clients test the Client portal?", "Recommend: a friendly, active client"],
    ["Rollout style", "Cluster by cluster, or everyone at once?", "Recommend: phased, with a parallel payroll"],
    ["Priorities", "Which remaining module matters most?", "Invoices, CRM, vacancies, investments, MSP payroll"],
    ["Sign-off owners", "Who validates payroll figures and contract templates?", "Recommend: Finance lead + Legal per country"],
  ]
  decisions.forEach(([title, question, rec], i) => {
    const y = 1.78 + i * 0.93
    box(slide, 0.6, y, 12.13, 0.8, { fill: C.white, line: C.border, r: 0.1 })
    box(slide, 0.6, y, 0.09, 0.8, { fill: C.primary })
    text(slide, String(i + 1), 0.9, y, 0.5, 0.8, { size: 20, bold: true, color: C.primary, valign: "middle" })
    text(slide, title, 1.45, y + 0.1, 3, 0.3, { size: 15, bold: true })
    text(slide, question, 1.45, y + 0.42, 5.5, 0.3, { size: 11.5, color: C.muted })
    slide.addText(rec, {
      x: 7.6,
      y: y + 0.17,
      w: 4.9,
      h: 0.46,
      shape: S.roundRect,
      rectRadius: 0.1,
      fill: { color: C.tint },
      line: { color: C.tint, width: 0.1 },
      fontFace: FONT_SEMI,
      fontSize: 11,
      color: C.primary,
      align: "center",
      valign: "middle",
      margin: 0,
    })
  })
}

// =====================================================================
// 22. Q&A
// =====================================================================
{
  const slide = pptx.addSlide()
  slide.background = { color: C.white }
  slide.addNotes("Thank the CEO, take questions. If a question needs data, offer to follow up in writing.")
  box(slide, 0, 0, 13.333, 7.5, { fill: C.white })
  const wm = imageSize(WORDMARK)
  slide.addImage({ path: WORDMARK, x: 4.67, y: 1.6, w: 4.0, h: (4.0 * wm.h) / wm.w })
  text(slide, "Thank you", 0, 3.2, 13.333, 0.8, { size: 40, bold: true, align: "center" })
  text(slide, "Questions, feedback and priorities welcome", 0, 4.0, 13.333, 0.4, { size: 16, color: C.muted, align: "center" })
  box(slide, 6.37, 4.7, 0.6, 0.05, { fill: C.primary })
}

// =====================================================================
// Appendix: demo run sheet
// =====================================================================
{
  const slide = newSlide("Presenter-only appendix. Hide this slide in PowerPoint (right-click → Hide Slide) if you don't want it shown.")
  heading(slide, "Appendix  ·  Presenter only", "Live demo run sheet")
  const rows = [
    ["0:00", "Admin", "Sign in with SSO → dashboard → cluster switcher → Intermediano Chile SPA (has test data)", "Your Microsoft account"],
    ["1:00", "Admin", "Quotations → open the Acme Logistics quotation → walk through the breakdown", "—"],
    ["3:00", "Admin", "Contracts → open Juan Perez's contract → Open PDF", "—"],
    ["5:00", "Employee", "Employee hub: dashboard → new timesheet → vacation → expense with receipt", "juan.perez@employee.test"],
    ["8:00", "Client", "Client portal: overview → timesheet → Approve with comment", "Client portal account"],
    ["10:00", "Admin", "Payroll → open the Acme Logistics run → provisions ledger", "—"],
    ["12:00", "Employee", "Employee hub → Payslips → download", "juan.perez@employee.test"],
    ["13:00", "Admin", "Users & roles → a role's permissions → a company's modules", "—"],
  ].map((r) => r.map((t, i) => (i === 1 ? { text: t, options: { bold: true, fontFace: FONT_SEMI, color: C.primary } } : t)))
  table(slide, 0.6, 1.75, 12.13, ["Time", "Portal", "What to show", "Login"], rows, {
    colW: [0.9, 1.3, 6.93, 3.0],
    rowH: 0.48,
    size: 12,
    headSize: 10,
  })
  box(slide, 0.6, 6.1, 12.13, 0.65, { fill: C.amberBg, r: 0.1 })
  text(slide, "Before you start: production build (npm run build && npm run start), open every demo page once to warm it up, separate browser profile per portal, backup video ready.", 0.85, 6.1, 11.7, 0.65, {
    size: 11,
    color: C.amber,
    bold: true,
    valign: "middle",
  })
}

await pptx.writeFile({ fileName: OUT })
console.log(`Wrote ${OUT}`)
