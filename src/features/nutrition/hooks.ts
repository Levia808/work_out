import { useQuery } from '@tanstack/react-query';
import { getTodayNutrition } from './api';
export function useTodayNutrition() { return useQuery({ queryKey: ['nutrition', 'today'], queryFn: getTodayNutrition }); }
