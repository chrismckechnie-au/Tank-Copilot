import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

type Reminder = {
  delivery_id: string;
  task_title: string;
  tank_name: string;
  owner_email: string;
  due_on: string;
  attempt: number;
};

const jsonHeaders = {
  "content-type": "application/json",
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const cronSecret = Deno.env.get("REMINDER_CRON_SECRET");
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "supabase_config_missing" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: enqueued, error: enqueueError } = await supabase.rpc(
    "enqueue_due_maintenance_reminders",
    {},
  );
  if (enqueueError) {
    return jsonResponse({ error: "enqueue_failed", detail: enqueueError.message }, 500);
  }

  const { data: reminders, error: claimError } = await supabase.rpc(
    "claim_maintenance_reminders",
    { p_limit: 25 },
  );
  if (claimError) {
    return jsonResponse({ error: "claim_failed", detail: claimError.message }, 500);
  }

  const results = [];
  for (const reminder of (reminders ?? []) as Reminder[]) {
    const result = await safeSendReminder(reminder);
    const { error: recordError } = await supabase.rpc(
      "record_maintenance_reminder_delivery",
      {
        p_delivery_id: reminder.delivery_id,
        p_success: result.success,
        p_last_error: result.error,
      },
    );

    results.push({
      deliveryId: reminder.delivery_id,
      recordError: recordError?.message ?? null,
      ...result,
    });
  }

  return jsonResponse({ enqueued, processed: results.length, results });
});

async function safeSendReminder(reminder: Reminder) {
  try {
    return await sendReminder(reminder);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "unknown_send_exception",
    };
  }
}

async function sendReminder(reminder: Reminder) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("REMINDER_FROM_EMAIL");

  if (!resendApiKey || !fromEmail) {
    return { success: false, error: "email_provider_config_missing" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: fromEmail,
      to: reminder.owner_email,
      subject: `Tank Copilot reminder: ${reminder.task_title}`,
      text: [
        `Task: ${reminder.task_title}`,
        `Tank: ${reminder.tank_name}`,
        `Due: ${reminder.due_on}`,
        "",
        "Open Tank Copilot to complete or reschedule this maintenance task.",
      ].join("\n"),
    }),
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
      "idempotency-key": reminder.delivery_id,
      "user-agent": "tank-copilot-reminders/0.1",
    },
    method: "POST",
  });

  if (!response.ok) {
    return {
      success: false,
      error: `resend_${response.status}_${await response.text()}`,
    };
  }

  return { success: true, error: null };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: jsonHeaders,
    status,
  });
}
