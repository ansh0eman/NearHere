export type { OperatorSafetyReport, SafetyReportStatus, SafetyReviewReceipt } from '../../../packages/contracts/safety';

export type OperatorReportsResult =
  | { ok: true; reports: import('../../../packages/contracts/safety').OperatorSafetyReport[] }
  | { ok: false; message: string };

export type SafetyReviewResult =
  | { ok: true; receipt: import('../../../packages/contracts/safety').SafetyReviewReceipt }
  | { ok: false; message: string };
