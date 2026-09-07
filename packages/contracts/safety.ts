export type SafetyReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface OperatorSafetyReport {
  reportId: string;
  reporterUserId: string;
  reportedUserId: string | null;
  activityId: string | null;
  reason: string;
  details: string;
  status: SafetyReportStatus;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  resolution: string | null;
}

export interface SafetyReviewReceipt {
  reportId: string;
  status: Extract<SafetyReportStatus, 'reviewing' | 'resolved' | 'dismissed'>;
  reviewedAt: string;
}
