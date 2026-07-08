import type { RiskLevel } from "@/lib/vqi";

export const DTI_PENALTY_PER_MIN = 0.5;

export const DTI_THRESHOLDS = {
  highBelow: 40,
  lowAbove: 70,
} as const;

export type DtiResult = {
  score: number;
  riskLevel: RiskLevel;
  plannedLeadMin: number;
  actualLeadMin: number;
  slackMin: number;
  status: "pending" | "computed";
};

function getDtiRiskLevel(score: number): RiskLevel {
  if (score < DTI_THRESHOLDS.highBelow) return "high";
  if (score <= DTI_THRESHOLDS.lowAbove) return "medium";
  return "low";
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function calculateDti(input: {
  receivedAt: Date | string | null | undefined;
  plannedEtaAt: Date | string | null | undefined;
  deliveredAt: Date | string | null | undefined;
}): DtiResult {
  const received = input.receivedAt ? new Date(input.receivedAt) : null;
  const planned = input.plannedEtaAt ? new Date(input.plannedEtaAt) : null;
  const delivered = input.deliveredAt ? new Date(input.deliveredAt) : null;

  if (
    !received ||
    !planned ||
    !delivered ||
    Number.isNaN(received.getTime()) ||
    Number.isNaN(planned.getTime()) ||
    Number.isNaN(delivered.getTime())
  ) {
    return {
      score: 0,
      riskLevel: "medium",
      plannedLeadMin: 0,
      actualLeadMin: 0,
      slackMin: 0,
      status: "pending",
    };
  }

  const plannedLeadMin = round1((planned.getTime() - received.getTime()) / 60_000);
  const actualLeadMin = round1((delivered.getTime() - received.getTime()) / 60_000);
  const slackMin = round1(actualLeadMin - plannedLeadMin);

  const penalty =
    slackMin > 0
      ? Math.min(100, Math.round(slackMin * DTI_PENALTY_PER_MIN * 10) / 10)
      : 0;
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    score,
    riskLevel: getDtiRiskLevel(score),
    plannedLeadMin,
    actualLeadMin,
    slackMin,
    status: "computed",
  };
}

export function aggregateDti(scores: number[]) {
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}
