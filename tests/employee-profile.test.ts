import { describe, expect, it } from "vitest"
import {
  documentFileUrl,
  documentPathFor,
  documentsFormSchema,
  emptyDocumentsValues,
  emptyProfileValues,
  expatFromIsLocal,
  isAcceptableDocumentPath,
  isEmployeeDocumentPath,
  isLocalFromExpat,
  isSocialSecurityFileColumn,
  MAX_DEPENDENTS,
  profileFormSchema,
  sanitizeDocumentFileName,
  taxIdLabel,
  type ProfileFormInput,
} from "@/lib/employee-profile"

const uuid = "0f8fad5b-d9cb-469f-a165-70867728950e"

function validProfile(overrides: Partial<ProfileFormInput> = {}): ProfileFormInput {
  return {
    ...emptyProfileValues(),
    gender: "Female",
    civilStatus: "Single",
    educationAttainment: "College",
    educationStatus: "complete",
    expat: "no",
    emergencyContact: { name: "Ana Souza", relationship: "Mother", mobile: "+55 11 99999-0000", email: "ana@example.com" },
    ...overrides,
  }
}

describe("profileFormSchema", () => {
  it("accepts a complete profile", () => {
    expect(profileFormSchema.safeParse(validProfile()).success).toBe(true)
  })

  it("requires the fields legacy required", () => {
    const result = profileFormSchema.safeParse(emptyProfileValues())
    expect(result.success).toBe(false)
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path.join("."))
    expect(paths).toEqual(
      expect.arrayContaining(["gender", "civilStatus", "educationAttainment", "educationStatus", "expat", "emergencyContact.name"]),
    )
  })

  it("caps gender at the column's 10 characters", () => {
    expect(profileFormSchema.safeParse(validProfile({ gender: "Non-binary" })).success).toBe(true)
    expect(profileFormSchema.safeParse(validProfile({ gender: "Genderfluid" })).success).toBe(false)
  })

  it("caps the dependents list and needs a name on each", () => {
    const dependent = { fullName: "Leo", relationship: "Son", dateOfBirth: "2019-04-02", taxId: "" }
    expect(profileFormSchema.safeParse(validProfile({ dependents: [dependent] })).success).toBe(true)
    expect(
      profileFormSchema.safeParse(validProfile({ dependents: Array.from({ length: MAX_DEPENDENTS + 1 }, () => dependent) }))
        .success,
    ).toBe(false)
    expect(profileFormSchema.safeParse(validProfile({ dependents: [{ ...dependent, fullName: " " }] })).success).toBe(false)
  })

  it("rejects malformed dates and emergency emails", () => {
    expect(profileFormSchema.safeParse(validProfile({ dateOfBirth: "02/04/1990" })).success).toBe(false)
    expect(
      profileFormSchema.safeParse(
        validProfile({ emergencyContact: { name: "Ana", relationship: "Mother", mobile: "1", email: "not-an-email" } }),
      ).success,
    ).toBe(false)
  })
})

describe("documentsFormSchema", () => {
  it("accepts empty documents", () => {
    expect(documentsFormSchema.safeParse(emptyDocumentsValues()).success).toBe(true)
  })

  it("only accepts the legacy document types and needs a file on each row", () => {
    const file = { documentType: "copy_of_id", path: documentPathFor("12", `${uuid}.pdf`), fileName: "id.pdf" }
    expect(documentsFormSchema.safeParse({ ...emptyDocumentsValues(), files: [file] }).success).toBe(true)
    expect(documentsFormSchema.safeParse({ ...emptyDocumentsValues(), files: [{ ...file, documentType: "selfie" }] }).success).toBe(
      false,
    )
    expect(documentsFormSchema.safeParse({ ...emptyDocumentsValues(), files: [{ ...file, path: "" }] }).success).toBe(false)
  })
})

describe("document paths", () => {
  it("recognises this employee's own new uploads only", () => {
    expect(isEmployeeDocumentPath(`employee-documents/12/${uuid}.webp`, "12")).toBe(true)
    expect(isEmployeeDocumentPath(`employee-documents/13/${uuid}.webp`, "12")).toBe(false)
    expect(isEmployeeDocumentPath(`employee-documents/12/../13/${uuid}.webp`, "12")).toBe(false)
    expect(isEmployeeDocumentPath(`employee-documents/12/${uuid}.exe`, "12")).toBe(false)
    expect(isEmployeeDocumentPath("employees/12/documents/Ana_copy_of_id.webp", "12")).toBe(false)
  })

  it("keeps legacy paths only when they are already stored for the employee", () => {
    const legacy = "employees/12/documents/Ana_copy_of_id.webp"
    expect(isAcceptableDocumentPath(legacy, "12", new Set([legacy]))).toBe(true)
    expect(isAcceptableDocumentPath(legacy, "12", new Set())).toBe(false)
    expect(isAcceptableDocumentPath(`employee-documents/12/${uuid}.pdf`, "12", new Set())).toBe(true)
  })

  it("builds file URLs for employees and admins", () => {
    expect(documentFileUrl("12", "f-5")).toBe("/api/employee-documents/12/f-5")
    expect(documentFileUrl("12", "curp_file", "3")).toBe("/api/employee-documents/12/curp_file?cluster=3")
  })

  it("only treats social security file columns as file references", () => {
    expect(isSocialSecurityFileColumn("health_fund_file")).toBe(true)
    expect(isSocialSecurityFileColumn("health_fund")).toBe(false)
  })

  it("strips paths and unsafe characters from uploaded names", () => {
    expect(sanitizeDocumentFileName("C:\\Users\\ana\\my <id>.pdf")).toBe("my id.pdf")
    expect(sanitizeDocumentFileName("   ")).toBe("document")
  })
})

describe("legacy field mappings", () => {
  it("keeps legacy's 'Expat: Yes' stored as is_local = 1", () => {
    expect(isLocalFromExpat("yes")).toBe(true)
    expect(isLocalFromExpat("no")).toBe(false)
    expect(expatFromIsLocal(true)).toBe("yes")
    expect(expatFromIsLocal(false)).toBe("no")
  })

  it("labels the tax ID RFC for Mexico", () => {
    expect(taxIdLabel("Mexico")).toBe("Tax ID (RFC)")
    expect(taxIdLabel("México")).toBe("Tax ID (RFC)")
    expect(taxIdLabel("Brazil")).toBe("Tax ID")
    expect(taxIdLabel(null)).toBe("Tax ID")
  })
})
