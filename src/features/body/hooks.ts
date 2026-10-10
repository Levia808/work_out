import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBodyTrend, upsertBodyMetric } from './api';
export function useBodyTrend() { return useQuery({ queryKey: ['body', 'trend'], queryFn: getBodyTrend }); }
export function useUpsertBodyMetric() { const client = useQueryClient(); return useMutation({ mutationFn: upsertBodyMetric, onSuccess: () => client.invalidateQueries({ queryKey: ['body'] }) }); }
