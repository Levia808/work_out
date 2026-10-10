import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLatestSleepLog, upsertSleepLog } from './api';
export function useSleepLog(loggedOn: string) { return useQuery({ queryKey: ['sleep', loggedOn], queryFn: () => getLatestSleepLog(loggedOn) }); }
export function useUpsertSleepLog() { const client = useQueryClient(); return useMutation({ mutationFn: upsertSleepLog, onSuccess: (_data: unknown, input: Parameters<typeof upsertSleepLog>[0]) => client.invalidateQueries({ queryKey: ['sleep', input.loggedOn] }) }); }
