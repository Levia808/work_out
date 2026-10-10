import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMealLog, getTodayNutrition } from './api';
export function useTodayNutrition(loggedOn?: string) { return useQuery({ queryKey: ['nutrition', 'today', loggedOn], queryFn: () => getTodayNutrition(loggedOn) }); }
export function useAddMealLog() { const client = useQueryClient(); return useMutation({ mutationFn: addMealLog, onSuccess: () => client.invalidateQueries({ queryKey: ['nutrition'] }) }); }
