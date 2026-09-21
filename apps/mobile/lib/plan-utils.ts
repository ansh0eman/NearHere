import type { MyPlanSummary } from '@/types/activity';

export function isInactivePlan(plan: MyPlanSummary, now = Date.now()): boolean {
  return plan.status !== 'published' || new Date(plan.endsAt).getTime() <= now;
}

/** Keep active plans actionable and move ended/cancelled records into history. */
export function partitionPlans(plans: MyPlanSummary[], now = Date.now()) {
  const upcoming = plans.filter((plan) => !isInactivePlan(plan, now))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const history = plans.filter((plan) => isInactivePlan(plan, now))
    .sort((left, right) => Date.parse(right.endsAt) - Date.parse(left.endsAt));
  return { history, upcoming };
}
