import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './routes/AppLayout';
import { ProtectedLayout } from './routes/ProtectedLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { WorkoutsPage } from '../pages/WorkoutsPage';
import { WorkoutPlanPage } from '../pages/WorkoutPlanPage';
import { WorkoutExercisePage } from '../pages/WorkoutExercisePage';
import { WorkoutSessionPage } from '../pages/WorkoutSessionPage';
import { RecordsPage } from '../pages/RecordsPage';
import { StatsPage } from '../pages/StatsPage';
import { StatsReportPage } from '../pages/StatsReportPage';
import { StatsHistoryPage } from '../pages/StatsHistoryPage';
import { SettingsPage } from '../pages/SettingsPage';
import { InstallPage } from '../pages/InstallPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { NutritionPage } from '../pages/NutritionPage';
import { SleepPage } from '../pages/SleepPage';
import { BodyPage } from '../pages/BodyPage';
import { HabitsPage } from '../pages/HabitsPage';

export const router = createBrowserRouter([
  { path: '/install', element: <InstallPage /> },
  { path: '/login', element: <LoginPage /> },
  { element: <ProtectedLayout />, children: [{ element: <AppLayout />, children: [
    { index: true, element: <DashboardPage /> },
    { path: 'workouts', element: <WorkoutsPage /> },
    { path: 'workouts/:planId', element: <WorkoutPlanPage /> },
    { path: 'workouts/:planId/exercises/:exerciseId', element: <WorkoutExercisePage /> },
    { path: 'workouts/:planId/session', element: <WorkoutSessionPage /> },
    { path: 'records', element: <RecordsPage /> },
    { path: 'stats', element: <StatsPage /> },
    { path: 'stats/report/:jobId', element: <StatsReportPage /> },
    { path: 'stats/history', element: <StatsHistoryPage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: 'records/nutrition', element: <NutritionPage /> },
    { path: 'records/sleep', element: <SleepPage /> },
    { path: 'records/body', element: <BodyPage /> },
    { path: 'records/habits', element: <HabitsPage /> }
  ] }] },
  { path: '*', element: <NotFoundPage /> }
], { basename: import.meta.env.BASE_URL });
