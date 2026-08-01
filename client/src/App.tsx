import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import StudentEntry from './pages/student/StudentEntry';
import StudentBook from './pages/student/StudentBook';
import StudentTreehole from './pages/student/StudentTreehole';
import StudentTreeholeCheck from './pages/student/StudentTreeholeCheck';
import ParentHome from './pages/parent/ParentHome';
import ParentBook from './pages/parent/ParentBook';
import ParentChildren from './pages/parent/ParentChildren';
import ParentMessages from './pages/parent/ParentMessages';
import TeacherHome from './pages/teacher/TeacherHome';
import TeacherSchedule from './pages/teacher/TeacherSchedule';
import TeacherTreehole from './pages/teacher/TeacherTreehole';
import AdvisorHome from './pages/advisor/AdvisorHome';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClasses from './pages/admin/AdminClasses';
import AdminUsers from './pages/admin/AdminUsers';
import AdminQRCode from './pages/admin/AdminQRCode';
import AdminRecords from './pages/admin/AdminRecords';
import AdminSettings from './pages/admin/AdminSettings';

// Components
import ProtectedRoute from './components/common/ProtectedRoute';

export default function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, []);

  return (
    <Routes>
      {/* 公共路由 */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 学生路由 — 通过二维码token或JWT */}
      <Route path="/student/entry" element={<StudentEntry />} />
      <Route path="/student/book" element={
        <ProtectedRoute roles={['STUDENT']}><StudentBook /></ProtectedRoute>
      } />
      <Route path="/student/treehole" element={
        <ProtectedRoute roles={['STUDENT']}><StudentTreehole /></ProtectedRoute>
      } />
      <Route path="/student/treehole/check" element={
        <ProtectedRoute roles={['STUDENT']}><StudentTreeholeCheck /></ProtectedRoute>
      } />

      {/* 家长路由 */}
      <Route path="/parent/home" element={
        <ProtectedRoute roles={['PARENT']}><ParentHome /></ProtectedRoute>
      } />
      <Route path="/parent/book" element={
        <ProtectedRoute roles={['PARENT']}><ParentBook /></ProtectedRoute>
      } />
      <Route path="/parent/children" element={
        <ProtectedRoute roles={['PARENT']}><ParentChildren /></ProtectedRoute>
      } />
      <Route path="/parent/messages" element={
        <ProtectedRoute roles={['PARENT']}><ParentMessages /></ProtectedRoute>
      } />

      {/* 心理老师路由 */}
      <Route path="/teacher/home" element={
        <ProtectedRoute roles={['TEACHER']}><TeacherHome /></ProtectedRoute>
      } />
      <Route path="/teacher/schedule" element={
        <ProtectedRoute roles={['TEACHER']}><TeacherSchedule /></ProtectedRoute>
      } />
      <Route path="/teacher/treehole" element={
        <ProtectedRoute roles={['TEACHER']}><TeacherTreehole /></ProtectedRoute>
      } />

      {/* 班主任路由 */}
      <Route path="/advisor/home" element={
        <ProtectedRoute roles={['ADVISOR']}><AdvisorHome /></ProtectedRoute>
      } />

      {/* 管理员路由 */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/classes" element={
        <ProtectedRoute roles={['ADMIN']}><AdminClasses /></ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute roles={['ADMIN']}><AdminUsers /></ProtectedRoute>
      } />
      <Route path="/admin/qrcode" element={
        <ProtectedRoute roles={['ADMIN']}><AdminQRCode /></ProtectedRoute>
      } />
      <Route path="/admin/records" element={
        <ProtectedRoute roles={['ADMIN']}><AdminRecords /></ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute roles={['ADMIN']}><AdminSettings /></ProtectedRoute>
      } />

      {/* 兜底 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
