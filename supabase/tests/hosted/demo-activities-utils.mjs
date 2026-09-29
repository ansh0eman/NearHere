/**
 * Index only the caller's own hosted demo slots. Discovery is not an ownership
 * query: blocks, radius and its limit can hide an existing fixture.
 */
export function indexHostedDemoSlots(actorPlans, slotCount, limit = 100, marker = 'NEARHERE_DEMO_V1') {
  if (!Array.isArray(actorPlans) || !Number.isInteger(slotCount) || slotCount < 1) {
    throw new Error('Invalid hosted-demo inventory response.');
  }
  if (!/^[A-Z0-9_]+$/.test(marker)) throw new Error('Invalid hosted-demo marker.');
  if (actorPlans.length >= limit) {
    throw new Error('Hosted plan inventory reached its limit; refusing to create possibly duplicate fixtures.');
  }

  const slots = new Map();
  for (const plan of actorPlans) {
    const role = plan.membership_role ?? plan.membershipRole;
    if (role !== 'host' || typeof plan.id !== 'string' || typeof plan.description !== 'string') continue;
    const pattern = new RegExp(`\\[${marker}:(\\d+)\\]`, 'g');
    for (const match of plan.description.matchAll(pattern)) {
      const slot = Number(match[1]);
      if (!Number.isSafeInteger(slot) || slot < 0 || slot >= slotCount) continue;
      const existing = slots.get(slot);
      if (existing && existing !== plan.id) {
        throw new Error(`More than one hosted activity claims demo slot ${slot}; refusing to modify either record.`);
      }
      slots.set(slot, plan.id);
    }
  }
  return slots;
}
