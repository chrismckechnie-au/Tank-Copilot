import "server-only";

import { getOptionalEnv } from "@/lib/env";
import type { PublicReportV1 } from "@/lib/reports/builder";
import { knownSymptomStrings } from "@/lib/triage/symptoms";

type ReportAiRequest = {
  task: "polish_public_report_context";
  immutable: {
    severity: PublicReportV1["severity"];
    ruleVersion: string;
    reviewStatus: PublicReportV1["reviewStatus"];
    displayMode: PublicReportV1["displayMode"];
    rulesUnderReview: boolean;
  };
  context: {
    tankType: PublicReportV1["tank"]["type"];
    roundedVolumeLiters: number;
    confidence: PublicReportV1["confidence"];
    structuredSymptoms: string[];
    observationCount: number;
    deterministicSummary: string;
    signedExplanations: Array<{
      message: string;
      why: string;
      sourceId: string;
    }>;
    genericNextSteps: string[];
  };
  outputContract: {
    summary: "string";
    openQuestions: "string[]";
  };
};

export type ReportAiClient = {
  complete(request: ReportAiRequest, signal: AbortSignal): Promise<unknown>;
};

type ReportAiOptions = {
  enabled?: boolean;
  apiKey?: string;
  model?: string;
  client?: ReportAiClient;
  timeoutMs?: number;
};

type AiEnhancement = {
  summary: string;
  openQuestions: string[];
};

const anthropicMessagesUrl = "https://api.anthropic.com/v1/messages";
const anthropicVersion = "2023-06-01";
const defaultModel = "claude-sonnet-4-6";
const defaultTimeoutMs = 5_000;

const forbiddenAdvicePatterns = [
  /\b(dose|dosage|medicate|medication|treat with|prescribe|diagnos(?:e|is)|large rapid correction)\b/i,
  /\b(add|dose|apply|use|administer)\s+(?:\d+|\w+)\s*(?:ml|millilit(?:er|re)s?|drops?|grams?|g|ppm|mg\/l)\b/i,
  /\b(add|dose|apply|use|administer|treat with)\b.{0,50}\b(copper|antibiotic|medication|medicine|chemical|dechlorinator|formalin|malachite|amquel|prime|salt|buffer|conditioner|additive)\b/i,
  /\b(try|use|may help|might help|could help|consider)\b.{0,50}\b(aquarium salt|salt|water conditioner|conditioner|additives?|buffer|dechlorinator)\b/i,
  /\b(aquarium salt|water conditioner|additives?)\b/i,
  /\b(?:do|perform|make|complete|start)\s+(?:an?\s+)?(?:\d{1,3}%\s+)?water change\b/i,
  /\b\d{1,3}%\s+water change\b/i,
  /\b(replace|change|swap)\b.{0,30}\b(half|some|part|portion|water)\b/i,
  /\b(raise|lower|increase|decrease|correct|adjust)\b.{0,40}\b(ph|salinity|alkalinity|kh|ammonia|nitrite|nitrate|temperature|temp|phosphate|calcium|magnesium)\b/i,
  /\b(you should|you must|recommend(?:ed)?|guidance|instruction|needs? to|start|stop|remove|isolate|quarantine)\b/i,
  /\b(now|immediately|right away|asap)\b/i,
];

const publicSafetyContradictionPatterns = [
  /\b(green|yellow|red)\b/i,
  /\b(all clear|all-clear|no concerns?|nothing concerning|nothing to worry about|safe to proceed|safe for livestock)\b/i,
  /\b(signed|unsigned|reviewed|unreviewed|approved|verified|vetted|specialist-reviewed|actionable|actionability|info[- ]only|display mode|rule version)\b/i,
  /\b(specialist|expert|vet|veterinary)\b.{0,30}\b(assessment|report|review|status|approved|verified)\b/i,
  /\brules?[-_\s]?v?\d+[a-z0-9._-]*\b/i,
];

const redSofteningPatterns = [
  /\b(not urgent|probably fine|wait and see|can ignore|unlikely to be serious|no need to act)\b/i,
  /\b(manageable|monitor|watch|observe|keep an eye)\b.{0,60}\b(days?|later|for now|next few days|over time)\b/i,
  /\b(stable|fine|minor|low risk|not severe|not serious)\b/i,
];

export function buildReportAiRequest(report: PublicReportV1): ReportAiRequest {
  return {
    task: "polish_public_report_context",
    immutable: {
      severity: report.severity,
      ruleVersion: report.ruleVersion,
      reviewStatus: report.reviewStatus,
      displayMode: report.displayMode,
      rulesUnderReview: report.rulesUnderReview,
    },
    context: {
      tankType: report.tank.type,
      roundedVolumeLiters: report.tank.volumeLiters,
      confidence: report.confidence,
      structuredSymptoms: knownSymptomStrings(report.observationSummary.symptoms),
      observationCount: report.observationSummary.count,
      deterministicSummary: report.summary,
      signedExplanations: report.explanations.map((explanation) => ({
        message: explanation.message,
        why: explanation.why,
        sourceId: explanation.sourceId,
      })),
      genericNextSteps: report.genericNextSteps,
    },
    outputContract: {
      summary: "string",
      openQuestions: "string[]",
    },
  };
}

export async function maybeEnhancePublicReport(
  report: PublicReportV1,
  options: ReportAiOptions = {},
): Promise<PublicReportV1> {
  const enabled = options.enabled ?? process.env.AI_ENABLED === "true";
  const apiKey = options.apiKey ?? getOptionalEnv("ANTHROPIC_API_KEY");

  if (!enabled || !apiKey || report.severity === "red") {
    return deterministicReport(report);
  }

  const client = options.client ?? anthropicReportClient({
    apiKey,
    model: options.model ?? getOptionalEnv("ANTHROPIC_MODEL") ?? defaultModel,
  });
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const raw = await client.complete(buildReportAiRequest(report), controller.signal);
    const enhancement = parseAiEnhancement(raw);

    if (!enhancement || violatesSafetyGuardrails(report, enhancement)) {
      return deterministicReport(report);
    }

    return {
      ...report,
      generatedWithAi: true,
      summary: enhancement.summary,
      openQuestions: enhancement.openQuestions,
    };
  } catch {
    return deterministicReport(report);
  } finally {
    clearTimeout(timeout);
  }
}

export function anthropicReportClient({
  apiKey,
  model,
}: {
  apiKey: string;
  model: string;
}): ReportAiClient {
  return {
    async complete(request, signal) {
      const response = await fetch(anthropicMessagesUrl, {
        body: JSON.stringify({
          max_tokens: 700,
          messages: [
            {
              role: "user",
              content: JSON.stringify(request),
            },
          ],
          model,
          system: [
            "You polish a public aquarium context report.",
            "Return strict JSON only with keys summary and openQuestions.",
            "Never change or restate a different severity, rule version, review status, or display mode.",
            "Never diagnose, prescribe medication, dose chemicals, or recommend rapid corrective actions.",
            "For red severity, never soften urgency or imply it is probably fine.",
            "Use only the allowlisted structured input; do not infer private details.",
          ].join(" "),
          temperature: 0.2,
        }),
        headers: {
          "anthropic-version": anthropicVersion,
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        method: "POST",
        signal,
      });

      if (!response.ok) {
        throw new Error("anthropic_report_request_failed");
      }

      const payload = await response.json();
      return textFromAnthropicMessage(payload);
    },
  };
}

function deterministicReport(report: PublicReportV1): PublicReportV1 {
  return {
    ...report,
    generatedWithAi: false,
  };
}

function parseAiEnhancement(raw: unknown): AiEnhancement | null {
  const parsed = typeof raw === "string" ? safeJsonParse(raw) : raw;

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.summary !== "string" || !Array.isArray(candidate.openQuestions)) {
    return null;
  }

  const summary = candidate.summary.trim();
  const openQuestions = candidate.openQuestions
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (summary.length < 20 || summary.length > 1_000) {
    return null;
  }

  return { summary, openQuestions };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function violatesSafetyGuardrails(report: PublicReportV1, enhancement: AiEnhancement) {
  const prose = [enhancement.summary, ...enhancement.openQuestions].join("\n");

  if (forbiddenAdvicePatterns.some((pattern) => pattern.test(prose))) {
    return true;
  }

  if (publicSafetyContradictionPatterns.some((pattern) => pattern.test(prose))) {
    return true;
  }

  return report.severity === "red" && redSofteningPatterns.some((pattern) => pattern.test(prose));
}

function textFromAnthropicMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const content = (payload as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter(
      (block): block is { type: "text"; text: string } =>
        Boolean(block) &&
        typeof block === "object" &&
        (block as { type?: unknown }).type === "text" &&
        typeof (block as { text?: unknown }).text === "string",
    )
    .map((block) => block.text)
    .join("\n");
}
