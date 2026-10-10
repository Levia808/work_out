import { getDashboardSnapshot } from '../../lib/localData';

export async function getDashboardSummary() {
  return getDashboardSnapshot();
}
