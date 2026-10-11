import type { WorkoutPlanImportExercise } from './types';

export type ExercisePreset = {
  name: string;
  aliases: string[];
  muscleGroup: string;
  instructions: string;
  todos: string[];
};

/**
 * Small, conservative catalog used by image imports. Matching only applies when
 * the imported name contains a known alias; unknown movements keep their source
 * name instead of being silently replaced with a made-up exercise.
 */
export const exerciseCatalog: ExercisePreset[] = [
  {
    name: '杠铃卧推',
    aliases: ['杠铃卧推', '卧推', 'bench press', 'barbell bench'],
    muscleGroup: '胸部',
    instructions: '肩胛收紧，脚掌踩稳；杠铃下放至胸部中下段，推起时保持手腕中立。',
    todos: ['完成空杆热身', '肩胛收紧并保持脚掌稳定'],
  },
  {
    name: '哑铃飞鸟',
    aliases: ['哑铃飞鸟', '飞鸟', '夹胸', 'dumbbell fly', 'chest fly'],
    muscleGroup: '胸部',
    instructions: '肘部保持微屈，沿胸部外展与合拢，避免用惯性甩动。',
    todos: ['控制下放 2 秒', '顶峰收缩时不要耸肩'],
  },
  {
    name: '高位下拉',
    aliases: ['高位下拉', '下拉', 'lat pulldown', 'pull down'],
    muscleGroup: '背部',
    instructions: '胸口打开，肩胛先下沉，再将握把拉向上胸，避免身体后仰借力。',
    todos: ['先完成肩胛下沉', '保持躯干稳定'],
  },
  {
    name: '杠铃深蹲',
    aliases: ['杠铃深蹲', '深蹲', 'barbell squat', 'back squat'],
    muscleGroup: '腿部',
    instructions: '核心收紧，膝盖朝脚尖方向移动，下降到可控深度后稳定起身。',
    todos: ['完成髋踝活动热身', '全程保持核心张力'],
  },
  {
    name: '硬拉',
    aliases: ['硬拉', 'deadlift', '罗马椅硬拉', 'russian deadlift'],
    muscleGroup: '臀腿 / 背部',
    instructions: '髋部后移，背部保持中立，杠铃贴近身体；起身时先推地再伸髋。',
    todos: ['保持杠铃贴近小腿', '锁定时不要过度后仰'],
  },
  {
    name: '哑铃肩推',
    aliases: ['哑铃肩推', '肩推', '推举', 'shoulder press', 'overhead press'],
    muscleGroup: '肩部',
    instructions: '核心收紧，肘部略在身体前方，沿稳定轨迹推起并控制下放。',
    todos: ['核心保持收紧', '控制下放并避免耸肩'],
  },
  {
    name: '坐姿划船',
    aliases: ['坐姿划船', '器械划船', '划船', 'seated row', 'cable row'],
    muscleGroup: '背部',
    instructions: '先收紧肩胛，再将手柄拉向腹部；回放时保持躯干稳定，不要耸肩借力。',
    todos: ['肩胛先收紧', '回放时控制 2 秒'],
  },
  {
    name: '腿举',
    aliases: ['腿举', '腿推', 'leg press'],
    muscleGroup: '腿部',
    instructions: '腰背贴紧靠垫，膝盖朝脚尖方向移动；下降到可控深度，不要锁死膝关节。',
    todos: ['腰背保持贴合', '避免膝关节完全锁死'],
  },
  {
    name: '哑铃弯举',
    aliases: ['哑铃弯举', '二头弯举', '弯举', 'bicep curl', 'dumbbell curl'],
    muscleGroup: '手臂',
    instructions: '上臂贴近身体，收缩二头肌抬起前臂；下放时不要让重量自由坠落。',
    todos: ['上臂保持稳定', '下放全程控制'],
  },
  {
    name: '绳索下压',
    aliases: ['绳索下压', '三头下压', '下压', 'triceps pushdown', 'rope pushdown'],
    muscleGroup: '手臂',
    instructions: '肘部固定在身体两侧，向下伸展前臂；回程时保持张力，不要耸肩。',
    todos: ['肘部保持固定', '底部完成收缩'],
  },
  {
    name: '哑铃侧平举',
    aliases: ['哑铃侧平举', '侧平举', '侧举', 'lateral raise'],
    muscleGroup: '肩部',
    instructions: '手肘略高于手腕向两侧抬起，控制到肩高即可，避免身体摆动。',
    todos: ['避免借力摆动', '抬至肩高即可'],
  },
];

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s_\-()（）]/g, '');

export function matchExercisePreset(name: string): ExercisePreset | undefined {
  const normalized = normalize(name);
  return exerciseCatalog.find(preset => preset.aliases.some(alias => normalized.includes(normalize(alias))));
}

export function enrichImportedExercise(item: WorkoutPlanImportExercise) {
  const preset = matchExercisePreset(item.name);
  if (!preset) {
    return {
      ...item,
      name: item.name.trim(),
      muscleGroup: item.muscleGroup?.trim() ?? '',
      instructions: item.instructions?.trim() ?? '',
      todos: item.todos ?? [],
      matched: false,
    };
  }
  return {
    ...item,
    name: preset.name,
    muscleGroup: item.muscleGroup?.trim() || preset.muscleGroup,
    instructions: item.instructions?.trim() || preset.instructions,
    todos: item.todos?.length ? item.todos : preset.todos,
    matched: true,
  };
}
