import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, CircleCheck, Save } from 'lucide-react';
import { Button } from '@heroui/react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ExerciseGlyph } from '../components/ExerciseGlyph';
import { matchExercisePreset } from '../lib/exerciseCatalog';
import { createSession, finishSession, getActiveSession, getPlan, isPreviewMode, saveWorkoutSet } from '../lib/localData';
import type { WorkoutPlan, WorkoutSession } from '../lib/types';

type Draft = { weightKg: string; reps: string; completed: boolean };

const encouragements = ['稳住，动作漂亮', '节奏很好，再接再厉', '这一组完成得很扎实', '漂亮收尾，继续保持'];

function encouragementFor(setNumber: number) {
  return encouragements[(setNumber - 1) % encouragements.length];
}

export function WorkoutSessionPage() {
  const { planId = '' } = useParams(); const previewQuery = isPreviewMode() ? '?demo=1' : '';
  const navigate = useNavigate();
  const [plan] = useState<WorkoutPlan | undefined>(() => getPlan(planId));
  const [session, setSession] = useState<WorkoutSession | undefined>(() => getActiveSession(planId) ?? (plan ? createSession(plan.id) : undefined));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saved, setSaved] = useState('');
  const [validation, setValidation] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    if (!session) return;
    const next: Record<string, Draft> = {};
    plan?.items.forEach(item => {
      for (let number = 1; number <= item.targetSets; number += 1) {
        const set = session.sets.find(candidate => candidate.exerciseId === item.exerciseId && candidate.setNumber === number);
        next[`${item.exerciseId}-${number}`] = {
          weightKg: set ? String(set.weightKg) : '',
          reps: set ? String(set.reps) : String(item.targetReps),
          completed: set?.completed ?? false,
        };
      }
    });
    setDrafts(next);
  }, [plan, session]);

  const allSetCount = useMemo(() => plan?.items.reduce((sum, item) => sum + item.targetSets, 0) ?? 0, [plan]);
  const doneSetCount = session?.sets.filter(set => set.completed).length ?? 0;

  if (!plan || !session) {
    return <AppShell title="训练记录" actions={false}><section className="card empty-state"><p className="card-copy">找不到训练计划。</p><Link className="primary-btn" to={`/workouts${previewQuery}`}>返回训练</Link></section></AppShell>;
  }

  const updateDraft = (key: string, next: Partial<Draft>) => {
    setValidation(current => current?.key === key ? null : current);
    setDrafts(current => ({ ...current, [key]: { ...current[key], ...next } }));
  };
  const parseDraft = (draft?: Draft) => {
    const rawWeight = draft?.weightKg.trim() ?? '';
    if (!rawWeight) return undefined;
    const weightKg = Number(rawWeight);
    const reps = Number(draft?.reps);
    if (!Number.isFinite(weightKg) || weightKg < 0 || !Number.isFinite(reps) || reps <= 0) return undefined;
    return { weightKg, reps };
  };
  const persistSet = (exerciseId: string, setNumber: number, completed: boolean) => {
    const key = `${exerciseId}-${setNumber}`;
    const values = parseDraft(drafts[key]);
    if (!values) {
      setValidation({ key, message: '请填写重量；自重训练请输入 0' });
      return false;
    }
    const next = saveWorkoutSet(session.id, { exerciseId, setNumber, ...values, completed });
    setSession({ ...next });
    setValidation(current => current?.key === key ? null : current);
    setSaved(key);
    window.setTimeout(() => setSaved(current => current === key ? '' : current), 900);
    return true;
  };
  const toggleCompleted = (exerciseId: string, setNumber: number) => {
    const key = `${exerciseId}-${setNumber}`;
    const nextCompleted = !drafts[key]?.completed;
    const values = parseDraft({ ...drafts[key], completed: nextCompleted });
    if (!values) {
      setValidation({ key, message: '请先填写重量；自重训练请输入 0' });
      return;
    }
    updateDraft(key, { completed: nextCompleted });
    const next = saveWorkoutSet(session.id, { exerciseId, setNumber, ...values, completed: nextCompleted });
    setSession({ ...next });
    setValidation(current => current?.key === key ? null : current);
    setSaved(key);
    window.setTimeout(() => setSaved(current => current === key ? '' : current), 900);
  };
  const finish = () => { finishSession(session.id); navigate(`/workouts/${plan.id}${previewQuery}`); };

  return <AppShell title="进行训练" subtitle={`${plan.title} · ${doneSetCount}/${allSetCount} 组`} actions={false}>
    <div className="stack workout-session-page">
      <Link to={`/workouts/${plan.id}${previewQuery}`} className="muted row back-link"><ChevronLeft size={17} aria-hidden="true" />返回计划</Link>
      {plan.items.map(item => {
        const exercise = plan.exercises.find(candidate => candidate.id === item.exerciseId);
        if (!exercise) return null;
        const preset = matchExercisePreset(exercise.name);
        const cue = exercise.instructions || preset?.instructions;
        return <section className="card exercise-session-card" data-exercise-name={preset?.name ?? exercise.name} key={item.id}>
          <div className="exercise-session-heading">
            <ExerciseGlyph name={exercise.name} muscleGroup={exercise.muscleGroup} size={24} />
            <div className="list-content"><h2 className="card-title">{exercise.name}</h2><p className="card-copy">{exercise.muscleGroup || '未设置肌群'} · {item.targetSets} 组 × {item.targetReps} 次</p>{cue ? <p className="exercise-session-cue">{cue}</p> : null}</div>
          </div>
          <div className="session-set-list">
            {Array.from({ length: item.targetSets }, (_, index) => {
              const setNumber = index + 1;
              const key = `${exercise.id}-${setNumber}`;
              const draft = drafts[key] ?? { weightKg: '', reps: String(item.targetReps), completed: false };
              return <motion.article layout className={`set-card ${draft.completed ? 'is-complete' : ''}`} key={key} transition={{ layout: { duration: .25, ease: [.22, 1, .36, 1] } }}>
                <div className="set-card-header">
                  <div><strong>第 {setNumber} 组</strong><span className="set-card-target">目标 {item.targetReps} 次</span></div>
                  <Button isIconOnly radius="full" className={`set-complete-btn ${draft.completed ? 'is-complete' : ''}`} type="button" onPress={() => toggleCompleted(exercise.id, setNumber)} aria-label={`${draft.completed ? '取消完成' : '完成'}${exercise.name}第${setNumber}组`} title={draft.completed ? '取消完成' : '完成这一组'}>
                    {draft.completed ? <CircleCheck size={20} /> : <Check size={20} />}
                  </Button>
                </div>
                <div className="set-card-divider" aria-hidden="true" />
                <div className="set-card-fields">
                  <label className="label set-field"><span>重量 kg</span><input className="input-field compact-field" inputMode="decimal" value={draft.weightKg} onChange={event => updateDraft(key, { weightKg: event.target.value })} placeholder="自重填 0" aria-label={`${exercise.name}第${setNumber}组重量`} /></label>
                  <label className="label set-field"><span>次数</span><input className="input-field compact-field" inputMode="numeric" value={draft.reps} onChange={event => updateDraft(key, { reps: event.target.value })} placeholder="次数" aria-label={`${exercise.name}第${setNumber}组次数`} /></label>
                  <Button isIconOnly radius="full" variant="light" className="set-save-btn" type="button" onPress={() => persistSet(exercise.id, setNumber, draft.completed)} aria-label={`保存${exercise.name}第${setNumber}组`} title={saved === key ? '已保存' : '保存这一组'}>
                    {saved === key ? <CircleCheck size={18} /> : <Save size={18} />}
                  </Button>
                </div>
                <div className="set-card-message" aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={draft.completed ? `done-${setNumber}` : `ready-${setNumber}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}>
                      {draft.completed ? encouragementFor(setNumber) : '填写这一组，完成后点击勾选'}
                    </motion.span>
                  </AnimatePresence>
                </div>
                {validation?.key === key ? <p className="set-card-error" role="alert">{validation.message}</p> : null}
              </motion.article>;
            })}
          </div>
        </section>;
      })}
      <Button className="primary-btn row" type="button" onPress={finish}><span>完成本次训练</span><Save size={18} aria-hidden="true" /></Button>
    </div>
  </AppShell>;
}
