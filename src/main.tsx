import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { Providers } from './app/Providers';
import { router } from './app/router';
import './styles/index.css';

registerSW({ immediate: true });
ReactDOM.createRoot(document.getElementById('root')!).render(<Providers><RouterProvider router={router} /></Providers>);
