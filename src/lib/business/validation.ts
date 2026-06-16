import { z } from "zod";

import {
  equipmentCategories,
  tankFormSchema,
} from "@/lib/tanks/validation";

export const businessRoles = ["admin", "editor", "viewer"] as const;

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

export const businessFormSchema = z.object({
  name: z.string().trim().min(2, "Name your business").max(120),
  logoPath: z.preprocess(emptyToUndefined, z.string().trim().url().max(500).optional()),
});

export const clientFormSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().trim().min(2, "Add the client name").max(120),
  contact: z.string().trim().max(240).default(""),
  location: z.string().trim().max(240).default(""),
  notes: z.string().trim().max(1_000).default(""),
});

export const teamMemberFormSchema = z.object({
  businessId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(businessRoles),
});

export const teamMemberIdFormSchema = z.object({
  businessId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const clientTankFormSchema = tankFormSchema.safeExtend({
  businessId: z.string().uuid(),
  clientId: z.string().uuid(),
  equipmentCategory: z.preprocess(emptyToUndefined, z.enum(equipmentCategories).optional()),
});

export type BusinessRole = (typeof businessRoles)[number];
export type BusinessFormInput = z.infer<typeof businessFormSchema>;
export type ClientFormInput = z.infer<typeof clientFormSchema>;
export type ClientTankFormInput = z.infer<typeof clientTankFormSchema>;

export function formDataToBusinessObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export function formDataToClientObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export function formDataToTeamMemberObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export function formDataToClientTankObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
