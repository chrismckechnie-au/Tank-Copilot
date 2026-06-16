import { z } from "zod";

export const maintenanceCategories = [
  "water_change",
  "water_test",
  "filter",
  "dosing",
  "equipment",
  "livestock",
  "other",
] as const;

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const maintenanceTaskFormSchema = z.object({
  tankId: z.string().uuid(),
  title: z.string().trim().min(2, "Name the task").max(120),
  category: z.enum(maintenanceCategories),
  cadenceDays: z.coerce
    .number()
    .int("Cadence must be a whole number of days")
    .min(1, "Cadence must be at least 1 day")
    .max(365, "Cadence must be 365 days or less"),
  nextDueOn: z.preprocess(emptyToUndefined, z.string().date().optional()),
  reminderEnabled: z.preprocess((value) => value === "on" || value === true, z.boolean()),
});

export const maintenanceTaskIdSchema = z.object({
  tankId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export const maintenanceRescheduleFormSchema = maintenanceTaskIdSchema.extend({
  nextDueOn: z.string().date(),
});

export type MaintenanceTaskFormInput = z.infer<typeof maintenanceTaskFormSchema>;

export function formDataToMaintenanceTaskObject(formData: FormData) {
  return {
    tankId: formData.get("tankId"),
    title: formData.get("title"),
    category: formData.get("category"),
    cadenceDays: formData.get("cadenceDays"),
    nextDueOn: formData.get("nextDueOn"),
    reminderEnabled: formData.get("reminderEnabled"),
  };
}

export function formDataToTaskIdObject(formData: FormData) {
  return {
    tankId: formData.get("tankId"),
    taskId: formData.get("taskId"),
  };
}

export function formDataToRescheduleTaskObject(formData: FormData) {
  return {
    ...formDataToTaskIdObject(formData),
    nextDueOn: formData.get("nextDueOn"),
  };
}
