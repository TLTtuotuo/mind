import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import type { Role } from '../../types';

interface Props {
  children: React.ReactNode;
  roles: Role[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { token, user } = useAuthStore();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (user && !roles.includes(user.role)) {
    // 跳转到对应工作台
    const homeMap: Record<string, string> = {
      STUDENT: '/student/entry',
      PARENT: '/parent/home',
      TEACHER: '/teacher/home',
      ADVISOR: '/advisor/home',
      ADMIN: '/admin/dashboard',
    };
    return <Navigate to={homeMap[user.role] || '/'} replace />;
  }

  return <>{children}</>;
}
