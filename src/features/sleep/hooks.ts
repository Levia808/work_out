import { useMutation } from '@tanstack/react-query';
import { upsertSleepLog } from './api';
export function useUpsertSleepLog() { return useMutation({ mutationFn: upsertSleepLog }); }
