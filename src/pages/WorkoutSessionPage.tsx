import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, CircleCheck, Save } from 'lucide-react';
import { Button } from '@heroui/react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { BackLink } from '../components/BackLink';
import { ExerciseGlyph } from '../components/ExerciseGlyph';
import { matchExercisePreset } from '../lib/exerciseCatalog';
import { createSession, finishSession, getActiveSession, getPlan, isPreviewMode, saveWorkoutSet } from '../lib/localData';
import type { PlanItem, WorkoutPlan, WorkoutSession } from '../lib/types';

type Draft = { weightKg: string; reps: string; completed: boolean; individualWeight: boolean };
type SetEntry = { key: string; exerciseId: string; exerciseName: string; muscleGroup: string; item: PlanItem; setNumber: number };
type SetTransition = { completedKey: string; nextKey: string; phase: 'collapse' | 'expand' };

const SET_COLLAPSE_DURATION = 280;
const SET_EXPAND_DURATION = 260;
const COLLAPSED_CARD_HEIGHT = 68;

const encouragements = ['稳住，动作漂亮', '节奏很好，再接再厉', '这一组完成得很扎实', '漂亮收尾，继续保持'];
function encouragementFor(setNumber: number) { return encouragements[(setNumber - 1) % encouragements.length]; }

export function WorkoutSessionPage() {
  const { planId = '' } = useParams();
  const previewQuery = isPreviewMode() ? '?demo=1' : '';
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [plan] = useState<WorkoutPlan | undefined>(() => getPlan(planId));
  const [session, setSession] = useState<WorkoutSession | undefined>(() => getActiveSession(planId));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [focusedKey, setFocusedKey] = useState('');
  const [setTransition, setSetTransition] = useState<SetTransition | null>(null);
  const [editingWeightKey, setEditingWeightKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [validation, setValidation] = useState<{ key: string; message: string } | null>(null);

  const entries = useMemo<SetEntry[]>(() => {
    if (!plan) return [];
    return [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder).flatMap(item => {
      const exercise = plan.exercises.find(candidate => candidate.id === item.exerciseId);
      if (!exercise) return [];
      return Array.from({ length: item.targetSets }, (_, index) => ({
        key: `${exercise.id}-${index + 1}`,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        item,
        setNumber: index + 1,
      }));
    });
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    if (!session) {
      setSession(getActiveSession(plan.id) ?? createSession(plan.id));
      return;
    }
    const next: Record<string, Draft> = {};
    plan.items.forEach(item => {
      const firstSaved = session.sets.find(candidate => candidate.exerciseId === item.exerciseId && candidate.setNumber === 1);
      const baseWeight = firstSaved?.weightKg ?? item.targetWeightKg;
      for (let number = 1; number <= item.targetSets; number += 1) {
        const set = session.sets.find(candidate => candidate.exerciseId === item.exerciseId && candidate.setNumber === number);
        const isIndependent = number > 1 && (set?.individualWeight ?? (set !== undefined && baseWeight !== undefined && set.weightKg !== baseWeight));
        const defaultWeight = number === 1 || isIndependent ? set?.weightKg ?? baseWeight : baseWeight;
        next[`${item.exerciseId}-${number}`] = {
          weightKg: defaultWeight === undefined ? '' : String(defaultWeight),
          reps: set ? String(set.reps) : String(item.targetReps),
          completed: set?.completed ?? false,
          individualWeight: isIndependent,
        };
      }
    });
    setDrafts(next);
    setFocusedKey(entries.find(entry => !next[entry.key]?.completed)?.key ?? '');
  // Session identity is stable through local updates; initialize drafts once per session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, session?.id]);

  useEffect(() => {
    if (!setTransition) return;
    const delay = reducedMotion ? 0 : setTransition.phase === 'collapse'
      ? SET_COLLAPSE_DURATION
      : SET_EXPAND_DURATION;
    const timer = window.setTimeout(() => {
      if (setTransition.phase === 'collapse') {
        setFocusedKey(setTransition.nextKey);
        setSetTransition(current => current?.completedKey === setTransition.completedKey
          ? setTransition.nextKey ? { ...current, phase: 'expand' } : null
          : current);
      } else {
        setSetTransition(current => current?.completedKey === setTransition.completedKey ? null : current);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [setTransition, reducedMotion]);

  const allSetCount = entries.length;
  const doneSetCount = entries.filter(entry => drafts[entry.key]?.completed).length;
  const isTransitioning = Boolean(setTransition);
  const isSettling = setTransition?.phase === 'collapse';
  const activeEntry = isSettling ? undefined : entries.find(entry => entry.key === focusedKey && !drafts[entry.key]?.completed)
    ?? entries.find(entry => !drafts[entry.key]?.completed);
  const pendingEntries = entries.filter(entry => !drafts[entry.key]?.completed && entry.key !== activeEntry?.key);
  const displayEntries = entries;

  if (!plan) {
    return <AppShell title="训练记录" actions={false}><section className="card empty-state"><p className="card-copy">找不到训练计划。</p><BackLink className="primary-btn row" fallback={`/workouts${previewQuery}`}>返回训练</BackLink></section></AppShell>;
  }
  if (!session) return <AppShell title="进行训练" actions={false}><section className="card skeleton-card" aria-live="polite">正在准备训练记录…</section></AppShell>;

  const updateDraft = (entry: SetEntry, next: Partial<Draft>) => {
    setValidation(current => current?.key === entry.key ? null : current);
    setDrafts(current => {
      const updated = { ...current, [entry.key]: { ...current[entry.key], ...next } };
      if (entry.setNumber === 1 && next.weightKg !== undefined) {
        entries.filter(candidate => candidate.exerciseId === entry.exerciseId && candidate.setNumber > 1).forEach(candidate => {
          const draft = updated[candidate.key];
          if (draft && !draft.individualWeight) updated[candidate.key] = { ...draft, weightKg: next.weightKg ?? '' };
        });
      }
      return updated;
    });
  };

  const parseDraft = (draft?: Draft) => {
    const rawWeight = draft?.weightKg.trim() ?? '';
    if (!rawWeight) return undefined;
    const weightKg = Number(rawWeight);
    const reps = Number(draft?.reps);
    if (!Number.isFinite(weightKg) || weightKg < 0 || !Number.isFinite(reps) || reps <= 0) return undefined;
    return { weightKg, reps };
  };

  const persistSet = (entry: SetEntry, completed = drafts[entry.key]?.completed ?? false) => {
    const draft = drafts[entry.key];
    const values = parseDraft(draft);
    if (!values) {
      setValidation({ key: entry.key, message: '请填写重量；自重训练请输入 0' });
      return false;
    }
    const next = saveWorkoutSet(session.id, { exerciseId: entry.exerciseId, setNumber: entry.setNumber, ...values, completed, individualWeight: entry.setNumber > 1 && draft.individualWeight });
    setSession({ ...next });
    setValidation(current => current?.key === entry.key ? null : current);
    setSavedKey(entry.key);
    window.setTimeout(() => setSavedKey(current => current === entry.key ? '' : current), 900);
    return true;
  };

  const toggleCompleted = (entry: SetEntry) => {
    if (setTransition) return;
    const draft = drafts[entry.key] ?? { weightKg: '', reps: String(entry.item.targetReps), completed: false, individualWeight: false };
    const nextCompleted = !draft.completed;
    const values = parseDraft(draft);
    if (!values) {
      setValidation({ key: entry.key, message: '请先填写重量；自重训练请输入 0' });
      return;
    }
    const nextDraft = { ...draft, completed: nextCompleted };
    setDrafts(current => ({ ...current, [entry.key]: nextDraft }));
    const next = saveWorkoutSet(session.id, { exerciseId: entry.exerciseId, setNumber: entry.setNumber, ...values, completed: nextCompleted, individualWeight: entry.setNumber > 1 && draft.individualWeight });
    setSession({ ...next });
    setValidation(current => current?.key === entry.key ? null : current);
    setSavedKey('');
    if (nextCompleted) {
      const currentIndex = entries.findIndex(candidate => candidate.key === entry.key);
      const remainingAfter = [...entries.slice(currentIndex + 1), ...entries.slice(0, currentIndex)]
        .find(candidate => candidate.key !== entry.key && !drafts[candidate.key]?.completed);
      const nextKey = remainingAfter?.key ?? '';
      if (reducedMotion) {
        setFocusedKey(nextKey);
        setSetTransition(null);
      } else {
        setSetTransition({ completedKey: entry.key, nextKey, phase: 'collapse' });
      }
    } else {
      setSetTransition(null);
      setFocusedKey(entry.key);
    }
  };

  const focusSet = (entry: SetEntry) => {
    if (!setTransition && !drafts[entry.key]?.completed) setFocusedKey(entry.key);
  };
  const finish = () => { finishSession(session.id); navigate(`/workouts/${plan.id}${previewQuery}`); };

  return <AppShell title="进行训练" subtitle={`${plan.title} · ${doneSetCount}/${allSetCount} 组`} actions={false}>
    <div className="stack workout-session-page">
      <BackLink fallback={`/records${previewQuery}`}>返回记录</BackLink>
      <div className="session-set-list session-set-focus-list" aria-label="训练组列表" aria-busy={isTransitioning} data-transition-phase={setTransition?.phase ?? 'idle'}>
        <AnimatePresence initial={false} mode="popLayout">
          {displayEntries.map(entry => {
            const draft = drafts[entry.key] ?? { weightKg: '', reps: String(entry.item.targetReps), completed: false, individualWeight: false };
            // Keep the just-completed card mounted as the current card during the
            // first phase. This lets its content and height ease down instead of
            // switching to the compact branch in the same render.
            const isCollapsing = setTransition?.phase === 'collapse' && entry.key === setTransition.completedKey;
            const isCurrent = entry.key === activeEntry?.key || isCollapsing;
            const preset = matchExercisePreset(entry.exerciseName);
            const cue = plan.exercises.find(exercise => exercise.id === entry.exerciseId)?.instructions || preset?.instructions;
            // Keep the DOM order fixed. Completing a set first compresses the
            // existing card in place, then promotes the next card; no array
            // reorder is used, so the movement reads as one continuous gesture.
            const isCollapsePhase = setTransition?.phase === 'collapse';
            // Animate the card's measured height explicitly while Framer Motion
            // only interpolates sibling positions. This avoids scale correction on
            // the whole card and keeps the DOM order fixed during the reflow.
            const phaseDuration = isCollapsePhase ? SET_COLLAPSE_DURATION : SET_EXPAND_DURATION;
            const phaseEase = isCollapsePhase ? [.77, 0, .175, 1] : [.23, 1, .32, 1];
            const cardHeight = isCurrent && !isCollapsing ? 'auto' : COLLAPSED_CARD_HEIGHT;
            const transition = {
              height: { duration: reducedMotion ? 0 : phaseDuration / 1000, ease: phaseEase },
              layout: { duration: reducedMotion ? 0 : phaseDuration / 1000, ease: phaseEase },
            };
            return <motion.article
              layout={reducedMotion ? false : 'position'}
              animate={{ height: cardHeight }}
              className={`set-card set-focus-card ${isCurrent ? 'is-current' : 'is-collapsed'} ${isCollapsing ? 'is-collapsing' : ''} ${draft.completed ? 'is-complete' : 'is-pending'}`}
              key={entry.key}
              transition={transition}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <AnimatePresence initial={false} mode="wait">
                {isCurrent ? <motion.div
                  key="expanded"
                  className="set-card-expanded"
                  initial={reducedMotion ? false : { opacity: 0, transform: 'translate3d(0, 5px, 0)' }}
                  animate={isCollapsing
                    ? { opacity: 0, transform: 'translate3d(0, -8px, 0)' }
                    : { opacity: 1, transform: 'translate3d(0, 0, 0)' }}
                  exit={reducedMotion ? undefined : { opacity: 0, transform: 'translate3d(0, -4px, 0)' }}
                  transition={isCollapsing
                    ? {
                      opacity: { duration: reducedMotion ? 0 : .16, ease: [.4, 0, 1, 1] },
                      transform: { duration: reducedMotion ? 0 : .24, ease: [.77, 0, .175, 1] },
                    }
                    : {
                      opacity: { duration: reducedMotion ? 0 : .2, delay: reducedMotion ? 0 : .03, ease: [.23, 1, .32, 1] },
                      transform: { duration: reducedMotion ? 0 : .3, ease: [.23, 1, .32, 1] },
                    }}
                >
                  <div className="current-exercise-heading">
                    <ExerciseGlyph name={entry.exerciseName} muscleGroup={entry.muscleGroup} size={22} />
                    <div className="current-exercise-copy"><span className="set-current-label">当前组 · {entry.setNumber}/{entry.item.targetSets}</span><strong>{entry.exerciseName}</strong><span>{entry.muscleGroup || '未设置肌群'} · 目标 {entry.item.targetReps} 次</span></div>
                    <Button isIconOnly radius="full" className="set-complete-btn" type="button" onPress={() => toggleCompleted(entry)} aria-label={`完成${entry.exerciseName}第${entry.setNumber}组`} title="完成这一组"><span className="set-action-icon" aria-hidden="true"><Check size={20} /></span></Button>
                  </div>
                  {cue ? <p className="exercise-session-cue">{cue}</p> : null}
                  <div className="set-card-divider" aria-hidden="true" />
                  <div className="set-card-fields">
                    <label className="label set-field"><span>重量 kg</span><input className="input-field compact-field" inputMode="decimal" type="number" min="0" step="0.5" value={draft.weightKg} onChange={event => updateDraft(entry, { weightKg: event.target.value, ...(entry.setNumber > 1 ? { individualWeight: true } : {}) })} placeholder="自重填 0" aria-label={`${entry.exerciseName}第${entry.setNumber}组重量`} /></label>
                    <label className="label set-field"><span>次数</span><input className="input-field compact-field" inputMode="numeric" type="number" min="1" step="1" value={draft.reps} onChange={event => updateDraft(entry, { reps: event.target.value })} placeholder="次数" aria-label={`${entry.exerciseName}第${entry.setNumber}组次数`} /></label>
                    <Button isIconOnly radius="full" variant="light" className={`set-save-btn ${savedKey === entry.key ? 'is-saved' : ''}`} type="button" onPress={() => persistSet(entry)} aria-label={`保存${entry.exerciseName}第${entry.setNumber}组`} title={savedKey === entry.key ? '已保存' : '保存这一组'}><span className="set-action-icon" aria-hidden="true"><Save size={18} /></span></Button>
                  </div>
                  <div className="set-card-message" aria-live="polite">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={`ready-${entry.key}`} initial={reducedMotion ? false : { opacity: 0, transform: 'translate3d(0, 5px, 0)' }} animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }} exit={reducedMotion ? undefined : { opacity: 0, transform: 'translate3d(0, -5px, 0)' }} transition={{ duration: reducedMotion ? 0 : .15 }}>
                        {savedKey === entry.key ? '已保存' : `还剩 ${pendingEntries.length + 1} 组待完成`}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  {validation?.key === entry.key ? <p className="set-card-error" role="alert">{validation.message}</p> : null}
                </motion.div> : draft.completed ? <motion.div
                  key="completed"
                  className="set-card-collapsed-row"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : .14 }}
                >
                  <div className="set-collapsed-copy"><span className="set-collapsed-title">{entry.exerciseName}<i>第 {entry.setNumber} 组</i></span><span className="set-collapsed-value">{draft.weightKg || '—'} kg <b>×</b> {draft.reps || entry.item.targetReps}</span></div>
                  <span className="set-completed-note">{encouragementFor(entry.setNumber)}</span>
                  <Button isIconOnly radius="full" className="set-undo-btn" type="button" onPress={() => toggleCompleted(entry)} aria-label={`撤销${entry.exerciseName}第${entry.setNumber}组完成`} title="撤销完成"><span className="set-action-icon" aria-hidden="true"><CircleCheck size={19} /></span></Button>
                </motion.div> : <motion.button
                  key="pending"
                  className="set-card-collapsed-row set-pending-button"
                  type="button"
                  onClick={() => focusSet(entry)}
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : .14 }}
                  aria-label={`将${entry.exerciseName}第${entry.setNumber}组设为当前组`}
                >
                  <div className="set-collapsed-copy"><span className="set-collapsed-title">{entry.exerciseName}<i>第 {entry.setNumber} 组</i></span><span className="set-collapsed-value">{draft.weightKg || '未设重量'}{draft.weightKg ? ' kg' : ''} <b>×</b> {draft.reps || entry.item.targetReps}</span></div>
                  <span className="set-pending-note">待完成</span><ChevronRight className="set-pending-chevron" size={17} aria-hidden="true" />
                </motion.button>}
              </AnimatePresence>
            </motion.article>;
          })}
        </AnimatePresence>
      </div>
      <Button className="primary-btn row" type="button" onPress={finish}><span>完成本次训练</span><Save size={18} aria-hidden="true" /></Button>
    </div>
  </AppShell>;
}
