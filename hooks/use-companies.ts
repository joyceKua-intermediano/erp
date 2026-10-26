import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveCompany,
  createCompany,
  createContact,
  getCompanies,
  getCompany,
  getIndustryFieldOptions,
  removeContact,
  setMainContact,
  updateCompany,
  updateContact,
} from "@/app/actions/companies"
import { unwrapActionResult } from "@/lib/action-result"
import type { CompanyFormInput, ContactFormInput } from "@/lib/companies"

export const companyQueryKeys = {
  all: ["companies"] as const,
  detail: (companyId: string) => ["companies", companyId] as const,
  industries: ["companies", "industries"] as const,
}

export function useCompanies() {
  return useQuery({
    queryKey: companyQueryKeys.all,
    queryFn: () => getCompanies(),
  })
}

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: companyQueryKeys.detail(companyId),
    queryFn: () => getCompany(companyId),
  })
}

export function useIndustryFieldOptions() {
  return useQuery({
    queryKey: companyQueryKeys.industries,
    queryFn: () => getIndustryFieldOptions(),
    staleTime: 30 * 60 * 1000,
  })
}

function useInvalidateCompanies() {
  const queryClient = useQueryClient()
  return (skipCompanyId?: string) => {
    const skippedKey = skipCompanyId ? companyQueryKeys.detail(skipCompanyId).join("/") : null
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: companyQueryKeys.all,
        predicate: (query) => query.queryKey.join("/") !== skippedKey,
      }),
      // Employee lists show the client company of each employee's latest contract.
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "cluster" && query.queryKey[2] === "employees",
      }),
    ])
  }
}

export function useSaveCompany() {
  const invalidate = useInvalidateCompanies()

  return useMutation({
    mutationFn: async ({ companyId, input }: { companyId: string | null; input: CompanyFormInput }) =>
      unwrapActionResult(companyId ? await updateCompany(companyId, input) : await createCompany(input)),
    onSuccess: () => invalidate(),
  })
}

export function useArchiveCompany() {
  const invalidate = useInvalidateCompanies()

  return useMutation({
    mutationFn: async (companyId: string) => unwrapActionResult(await archiveCompany(companyId)),
    // Refetching the archived company's own detail would flash "not found" before the page navigates away.
    onSuccess: (_result, companyId) => invalidate(companyId),
  })
}

function useInvalidateCompanyContacts() {
  const queryClient = useQueryClient()
  return (companyId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: companyQueryKeys.detail(companyId) }),
      queryClient.invalidateQueries({ queryKey: companyQueryKeys.all, exact: true }),
    ])
}

export function useSaveContact(companyId: string) {
  const invalidate = useInvalidateCompanyContacts()

  return useMutation({
    mutationFn: async ({ contactId, input }: { contactId: string | null; input: ContactFormInput }) =>
      unwrapActionResult(contactId ? await updateContact(contactId, input) : await createContact(companyId, input)),
    onSuccess: () => invalidate(companyId),
  })
}

export function useSetMainContact(companyId: string) {
  const invalidate = useInvalidateCompanyContacts()

  return useMutation({
    mutationFn: async (contactId: string) => unwrapActionResult(await setMainContact(contactId)),
    onSuccess: () => invalidate(companyId),
  })
}

export function useRemoveContact(companyId: string) {
  const invalidate = useInvalidateCompanyContacts()

  return useMutation({
    mutationFn: async (contactId: string) => unwrapActionResult(await removeContact(contactId)),
    onSuccess: () => invalidate(companyId),
  })
}
