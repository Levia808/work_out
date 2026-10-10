import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addPlanExercise, completeWorkout, createWorkoutPlan, getWorkoutPlans, saveSet, startWorkout, toggleWorkoutTodo } from './api';
export function useWorkoutPlans() { return useQuery({ queryKey: ['workouts', 'plans'], queryFn: getWorkoutPlans }); }
export function useCreateWorkoutPlan() { const client = useQueryClient(); return useMutation({ mutationFn: createWorkoutPlan, onSuccess: () => client.invalidateQueries({ queryKey: ['workouts'] }) }); }
export function useAddPlanExercise() { const client = useQueryClient(); return useMutation({ mutationFn: ({ planId, ...input }: { planId: string; name: string; muscleGroup?: string; instructions?: string; targetSets: number; targetReps: number }) => addPlanExercise(planId, input), onSuccess: () => client.invalidateQueries({ queryKey: ['workouts'] }) }); }
export function useToggleWorkoutTodo() { const client = useQueryClient(); return useMutation({ mutationFn: toggleWorkoutTodo, onSuccess: () => client.invalidateQueries({ queryKey: ['workouts'] }) }); }
export function useStartWorkout() { return useMutation({ mutationFn: startWorkout }); }
export function useSaveWorkoutSet() { return useMutation({ mutationFn: saveSet }); }
export function useCompleteWorkout() { return useMutation({ mutationFn: completeWorkout }); }
