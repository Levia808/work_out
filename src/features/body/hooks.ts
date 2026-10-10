import { useQuery } from '@tanstack/react-query';
import { getBodyTrend } from './api';
export function useBodyTrend() { return useQuery({ queryKey: ['body', 'trend'], queryFn: getBodyTrend }); }
