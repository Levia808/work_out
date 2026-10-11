import { Activity, ArrowDown, ArrowLeftRight, ArrowUp, CircleDot, Dumbbell, Footprints, MoveDown, MoveUp, PersonStanding, Rows3, StretchHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Props = { name: string; muscleGroup?: string; size?: number };

function iconFor(name: string, muscleGroup = ''): LucideIcon {
  const value = `${name} ${muscleGroup}`.toLocaleLowerCase();
  if (value.includes('卧推') || value.includes('bench')) return ArrowUp;
  if (value.includes('飞鸟') || value.includes('夹胸') || value.includes('fly')) return StretchHorizontal;
  if (value.includes('下拉') || value.includes('pull')) return ArrowDown;
  if (value.includes('划船') || value.includes('row')) return Rows3;
  if (value.includes('深蹲') || value.includes('squat')) return MoveDown;
  if (value.includes('硬拉') || value.includes('deadlift')) return PersonStanding;
  if (value.includes('腿举') || value.includes('腿屈伸') || value.includes('弓步') || value.includes('lunge') || value.includes('leg press')) return Footprints;
  if (value.includes('弯举') || value.includes('curl') || value.includes('提踵') || value.includes('calf')) return MoveUp;
  if (value.includes('侧平举') || value.includes('侧举') || value.includes('lateral raise')) return ArrowLeftRight;
  if (value.includes('肩推') || value.includes('肩部') || value.includes('press')) return Activity;
  if (value.includes('胸')) return CircleDot;
  return Dumbbell;
}

export function ExerciseGlyph({ name, muscleGroup, size = 22 }: Props) {
  const Icon = iconFor(name, muscleGroup);
  return <span className="exercise-glyph" aria-hidden="true"><Icon size={size} strokeWidth={1.8} /></span>;
}
