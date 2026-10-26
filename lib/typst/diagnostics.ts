export type TypstDiagnostic = {
  message: string
  line: number | null
  column: number | null
  inTemplate: boolean
}
