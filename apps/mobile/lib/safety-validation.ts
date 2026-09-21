import type { OperatorSafetyReport, SafetyReviewReceipt, SafetyReportStatus } from '@/types/safety';

const STATUSES: SafetyReportStatus[] = ['open', 'reviewing', 'resolved', 'dismissed'];
const DECISIONS: SafetyReviewReceipt['status'][] = ['open', 'reviewing', 'resolved', 'dismissed'];
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function stringValue(row: Record<string, unknown>, key: string, nullable = false): string | null {
  const value = row[key];
  if (value === null && nullable) return null;
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Safety response has an invalid ${key}.`);
  return value;
}
function timestamp(row: Record<string, unknown>, key: string, nullable = false): string | null {
  const value = stringValue(row, key, nullable);
  if (value !== null && !Number.isFinite(Date.parse(value))) throw new Error(`Safety response has an invalid ${key}.`);
  return value;
}

export function parseOperatorSafetyReports(value: unknown): OperatorSafetyReport[] {
  if (!Array.isArray(value)) throw new Error('Safety response is not a list.');
  return value.map((item) => {
    if (!record(item) || !STATUSES.includes(item.status as SafetyReportStatus)) throw new Error('Safety response has an invalid status.');
    return {
      reportId: stringValue(item, 'report_id')!,
      reporterUserId: stringValue(item, 'reporter_user_id')!,
      reportedUserId: stringValue(item, 'reported_user_id', true),
      activityId: stringValue(item, 'activity_id', true),
      reason: stringValue(item, 'reason')!,
      details: stringValue(item, 'details', true) ?? '',
      status: item.status as SafetyReportStatus,
      createdAt: timestamp(item, 'created_at')!,
      reviewedBy: stringValue(item, 'reviewed_by', true),
      reviewedAt: timestamp(item, 'reviewed_at', true),
      resolution: stringValue(item, 'resolution', true),
    };
  });
}

export function parseSafetyReviewReceipt(value: unknown): SafetyReviewReceipt {
  if (!record(value) || !DECISIONS.includes(value.status as SafetyReviewReceipt['status'])) throw new Error('Safety review response has an invalid status.');
  return { reportId: stringValue(value, 'report_id')!, status: value.status as SafetyReviewReceipt['status'], reviewedAt: timestamp(value, 'reviewed_at')! };
}
