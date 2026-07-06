import { ThreatClass } from './enums/threat-class.enum';

export interface TrafficFeatures {
  modelId: string;
  windowMinutes: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  requestRatePerMin: number;
  distinctIps: number;
  topIpCount: number;
  topPayloadRepeat: number;
  injectionCount: number;
  trialCount: number;
  creditBurn: number;
  averageRating?: number;
  reviewCount?: number;
}

export interface Baseline {
  ewmaRequestRatePerMin: number;
  ewmaErrorRate: number;
}

export interface FiredRule {
  rule: string;
  threatClass: ThreatClass;
  severity: number;
  detail: string;
}

export interface RiskAssessment {
  riskScore: number;
  threatClass: ThreatClass | null;
  firedRules: FiredRule[];
  recommendations: string[];
}

const RECOMMENDATIONS: Record<ThreatClass, string> = {
  [ThreatClass.SPAM]:
    'Repeated identical payloads detected — consider per-key rate limits or deduplication.',
  [ThreatClass.ABUSE]:
    'High single-source request volume — consider IP throttling or blocking the source.',
  [ThreatClass.RESOURCE_ABUSE]:
    'Sustained high request volume — review quotas and autoscaling limits.',
  [ThreatClass.ANOMALOUS_TRAFFIC]:
    'Traffic deviates sharply from baseline — investigate the source and recent changes.',
  [ThreatClass.QUOTA_ABUSE]:
    'Heavy trial-key usage — verify the caller and consider tightening trial limits.',
  [ThreatClass.PROMPT_INJECTION]:
    'Prompt-injection patterns detected in inputs — review and consider input filtering.',
  [ThreatClass.API_ABUSE]:
    'Elevated error/abuse signals or severe negative user feedback on the API — review caller behavior and model reviews.',
};

export function assessTraffic(f: TrafficFeatures, b: Baseline): RiskAssessment {
  const fired: FiredRule[] = [];

  if (f.errorRate > 0.5 && f.requestCount >= 10) {
    fired.push({
      rule: 'HIGH_ERROR_RATE',
      threatClass: ThreatClass.ANOMALOUS_TRAFFIC,
      severity: 0.6,
      detail: `error rate ${(f.errorRate * 100).toFixed(0)}% over ${f.requestCount} requests`,
    });
  }

  if (
    b.ewmaRequestRatePerMin > 0 &&
    f.requestRatePerMin > 3 * b.ewmaRequestRatePerMin &&
    f.requestCount >= 20
  ) {
    fired.push({
      rule: 'RATE_SPIKE',
      threatClass: ThreatClass.ANOMALOUS_TRAFFIC,
      severity: 0.55,
      detail: `${f.requestRatePerMin.toFixed(1)}/min vs baseline ${b.ewmaRequestRatePerMin.toFixed(1)}/min`,
    });
  }

  if (f.topIpCount > 100) {
    fired.push({
      rule: 'IP_BURST',
      threatClass: ThreatClass.ABUSE,
      severity: 0.65,
      detail: `single source issued ${f.topIpCount} requests in ${f.windowMinutes}m`,
    });
  }

  if (f.topPayloadRepeat > 20) {
    fired.push({
      rule: 'PAYLOAD_REPETITION',
      threatClass: ThreatClass.SPAM,
      severity: 0.5,
      detail: `identical payload repeated ${f.topPayloadRepeat} times`,
    });
  }

  if (f.injectionCount > 0) {
    fired.push({
      rule: 'PROMPT_INJECTION',
      threatClass: ThreatClass.PROMPT_INJECTION,
      severity: Math.min(0.9, 0.5 + 0.1 * Math.min(4, f.injectionCount - 1)),
      detail: `${f.injectionCount} request(s) matched injection patterns`,
    });
  }

  if (f.trialCount > 40) {
    fired.push({
      rule: 'TRIAL_QUOTA_ABUSE',
      threatClass: ThreatClass.QUOTA_ABUSE,
      severity: 0.4,
      detail: `${f.trialCount} trial-key calls in ${f.windowMinutes}m`,
    });
  }

  if (f.requestCount > 500) {
    fired.push({
      rule: 'SUSTAINED_VOLUME',
      threatClass: ThreatClass.RESOURCE_ABUSE,
      severity: 0.5,
      detail: `${f.requestCount} requests in ${f.windowMinutes}m`,
    });
  }

  if (
    f.averageRating !== undefined &&
    f.reviewCount !== undefined &&
    f.reviewCount >= 3 &&
    f.averageRating < 2.0
  ) {
    fired.push({
      rule: 'LOW_MODEL_RATING',
      threatClass: ThreatClass.API_ABUSE,
      severity: 0.45,
      detail: `average rating is ${f.averageRating.toFixed(1)}/5.0 over ${f.reviewCount} reviews`,
    });
  }

  if (fired.length === 0) {
    return {
      riskScore: 0,
      threatClass: null,
      firedRules: [],
      recommendations: [],
    };
  }

  const maxSeverity = Math.max(...fired.map((r) => r.severity));
  const score = Math.min(
    100,
    Math.round((maxSeverity + 0.08 * (fired.length - 1)) * 100),
  );
  const dominant = fired.reduce((a, b2) => (b2.severity > a.severity ? b2 : a));
  const classes = [...new Set(fired.map((r) => r.threatClass))];

  return {
    riskScore: score,
    threatClass: dominant.threatClass,
    firedRules: fired,
    recommendations: classes.map((c) => RECOMMENDATIONS[c]),
  };
}
