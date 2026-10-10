import { useMutation } from '@tanstack/react-query';
import { saveWorkoutSet } from './api';
export function useSaveWorkoutSet() { return useMutation({ mutationFn: saveWorkoutSet }); }
