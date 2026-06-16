import { describe, expect, it } from "vitest";

import {
  formDataToMaintenanceTaskObject,
  maintenanceTaskFormSchema,
  maintenanceTaskIdSchema,
  maintenanceRescheduleFormSchema,
} from "./validation";

const tankId = "123e4567-e89b-12d3-a456-426614174000";
const taskId = "123e4567-e89b-12d3-a456-426614174111";

describe("maintenance task validation", () => {
  it("parses task form input with bounded cadence and reminder opt-in", () => {
    const formData = new FormData();
    formData.set("tankId", tankId);
    formData.set("title", "Water change");
    formData.set("category", "water_change");
    formData.set("cadenceDays", "14");
    formData.set("nextDueOn", "2026-06-30");
    formData.set("reminderEnabled", "on");

    const parsed = maintenanceTaskFormSchema.parse(formDataToMaintenanceTaskObject(formData));

    expect(parsed).toEqual({
      tankId,
      title: "Water change",
      category: "water_change",
      cadenceDays: 14,
      nextDueOn: "2026-06-30",
      reminderEnabled: true,
    });
  });

  it("rejects unsupported categories and unsafe cadence values", () => {
    expect(
      maintenanceTaskFormSchema.safeParse({
        tankId,
        title: "Dose random additive",
        category: "medication",
        cadenceDays: "0",
        nextDueOn: "",
        reminderEnabled: false,
      }).success,
    ).toBe(false);
  });

  it("validates complete and reschedule task identifiers", () => {
    expect(maintenanceTaskIdSchema.parse({ tankId, taskId })).toEqual({ tankId, taskId });
    expect(
      maintenanceRescheduleFormSchema.parse({
        tankId,
        taskId,
        nextDueOn: "2026-07-01",
      }),
    ).toEqual({ tankId, taskId, nextDueOn: "2026-07-01" });
  });
});
