import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getHabits, toggleHabit } from './api';
export function useHabits() { return useQuery({ queryKey: ['habits'], queryFn: getHabits }); }
export function useToggleHabit() { const client = useQueryClient(); return useMutation({ mutationFn: toggleHabit, onSuccess: () => client.invalidateQueries({ queryKey: ['habits'] }) }); }
