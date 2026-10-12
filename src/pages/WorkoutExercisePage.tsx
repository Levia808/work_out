import { useEffect, useState } from 'react';
import { Check, ChevronLeft, Plus, Save } from 'lucide-react';
import { Button } from '@heroui/react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ExerciseGlyph } from '../components/ExerciseGlyph';
import { addTodoToExercise, getPlan, isPreviewMode, toggleTodo } from '../lib/localData';
import type { WorkoutExercise, WorkoutPlan } from '../lib/types';

export function WorkoutExercisePage() {
  const { planId = '', exerciseId = '' } = useParams(); const previewQuery = isPreviewMode() ? '?demo=1' : '';
  const [plan, setPlan] = useState<WorkoutPlan | undefined>(() => getPlan(planId));
  const [todo, setTodo] = useState('');
  useEffect(() => { const sync = () => setPlan(getPlan(planId)); window.addEventListener('fittrack:data', sync); return () => window.removeEventListener('fittrack:data', sync); }, [planId]);
  const exercise: WorkoutExercise | undefined = plan?.exercises.find(item => item.id === exerciseId);
  const item = plan?.items.find(candidate => candidate.exerciseId === exerciseId);
  if (!plan || !exercise || !item) return <AppShell title="动作详情" actions={false}><section className="card empty-state"><p className="card-copy">找不到这个动作。</p><Link className="primary-btn" to={`/workouts/${planId}${previewQuery}`}>返回计划</Link></section></AppShell>;
  const completed = exercise.todos.filter(todo => todo.completed).length;
  const add = () => { if (!todo.trim()) return; addTodoToExercise(plan.id, exercise.id, todo); setTodo(''); setPlan(getPlan(plan.id)); };
  return <AppShell title={exercise.name} subtitle={`${plan.title} · ${exercise.muscleGroup || '未设置肌群'}`} actions={false}>
    <div className="stack">
      <Link to={`/workouts/${plan.id}${previewQuery}`} className="muted row back-link"><ChevronLeft size={17} aria-hidden="true" />返回计划</Link>
      <section className="card exercise-hero-card">
        <div className="exercise-hero-heading"><ExerciseGlyph name={exercise.name} muscleGroup={exercise.muscleGroup} size={28} /><div><h2 className="card-title">{exercise.name}</h2><p className="card-copy">{exercise.instructions || '暂未填写动作说明。'}</p></div></div>
        <div className="exercise-target-row"><div><span className="eyebrow">训练目标</span><div className="big-number">{item.targetSets}<span className="unit">组</span><span className="unit">×</span>{item.targetReps}<span className="unit">次</span></div></div><span className="exercise-target-mark"><Check size={21} aria-hidden="true" /></span></div>
      </section>
      <section className="card stack exercise-todo-section">
        <div className="row"><div><h2 className="card-title">动作 Todo</h2><span className="section-count">{completed}/{exercise.todos.length}</span></div></div>
        {exercise.todos.length ? exercise.todos.map(todoItem => <label className={`todo-row ${todoItem.completed ? 'is-done' : ''}`} key={todoItem.id}><input type="checkbox" checked={todoItem.completed} onChange={() => { toggleTodo(plan.id, exercise.id, todoItem.id); setPlan(getPlan(plan.id)); }} /><span>{todoItem.label}</span><Check size={16} aria-hidden="true" /></label>) : <p className="card-copy">还没有检查项。添加热身、动作要点或收操任务。</p>}
        <form className="todo-add" onSubmit={event => { event.preventDefault(); add(); }}><input className="input-field" value={todo} onChange={event => setTodo(event.target.value)} placeholder="添加 Todo" aria-label="添加动作 Todo" /><Button isIconOnly radius="full" type="submit" className="icon-btn" aria-label="添加 Todo" title="添加 Todo"><Plus size={19} /></Button></form>
      </section>
      <Link className="primary-btn row" to={`/workouts/${plan.id}/session${previewQuery}`}><span>进入训练记录</span><Save size={18} aria-hidden="true" /></Link>
    </div>
  </AppShell>;
}
