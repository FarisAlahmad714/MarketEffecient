// src/routes.tsx
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Home } from './pages/Home';
import { ItemList } from './pages/ItemList';
import { ItemDetail } from './pages/ItemDetail';
import { NotFound } from '../pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'items',
        element: <ItemList />,
      },
      {
        path: 'items/:id',
        element: <ItemDetail />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);