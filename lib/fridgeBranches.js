// The central fridge is organised into three storage branches, each with the
// same inventory model. Client-safe (no DB import) so both API routes and
// client components can share the list and validation.
export const FRIDGE_BRANCHES = [
  { value: 'fridge', label: 'ثلاجة', icon: '🧊' },
  { value: 'freezer', label: 'فريزر', icon: '❄️' },
  { value: 'external', label: 'خارجي', icon: '📦' },
];
export const BRANCH_VALUES = FRIDGE_BRANCHES.map((b) => b.value);
export const BRANCH_LABEL = Object.fromEntries(FRIDGE_BRANCHES.map((b) => [b.value, b.label]));
