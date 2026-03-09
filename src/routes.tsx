import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: '首页',
    path: '/',
    element: <HomePage />
  },
  {
    name: '作品',
    path: '/projects',
    element: <ProjectPage />
  },
  {
    name: '登录',
    path: '/login',
    element: <LoginPage />
  },
  {
    name: '管理员',
    path: '/admin',
    element: <AdminPage />
  }
];

export default routes;
