import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { Providers } from './app/Providers';
import { router } from './app/router';
import { recoverAiJobs } from './lib/aiJobs';
import { seedPreviewData } from './lib/localData';
import './styles/index.css';

if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === '1') seedPreviewData();
recoverAiJobs();
registerSW({ immediate: true });
ReactDOM.createRoot(document.getElementById('root')!).render(<Providers><RouterProvider router={router} /></Providers>);
