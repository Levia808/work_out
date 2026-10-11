import { enrichImportedExercise, matchExercisePreset } from './exerciseCatalog';

describe('exercise catalog matching', () => {
  it('matches common Chinese and English exercise aliases', () => {
    expect(matchExercisePreset('Barbell Bench Press')?.name).toBe('杠铃卧推');
    expect(matchExercisePreset('哑铃飞鸟')?.muscleGroup).toBe('胸部');
    expect(matchExercisePreset('seated row')?.name).toBe('坐姿划船');
  });

  it('keeps unknown imported movements instead of inventing a preset', () => {
    const imported = enrichImportedExercise({ name: '单腿平衡', targetSets: 3, targetReps: 8 });
    expect(imported.name).toBe('单腿平衡');
    expect(imported.matched).toBe(false);
    expect(imported.instructions).toBe('');
  });

  it('fills only missing details for a known imported movement', () => {
    const imported = enrichImportedExercise({ name: '卧推', muscleGroup: '胸部', targetSets: 4, targetReps: 6, todos: ['记录 RPE'] });
    expect(imported.name).toBe('杠铃卧推');
    expect(imported.muscleGroup).toBe('胸部');
    expect(JSON.stringify(imported.todos)).toBe(JSON.stringify(['记录 RPE']));
    expect(imported.matched).toBe(true);
  });
});
