import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { Heart, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      const { user } = useAuthStore.getState();
      const homeMap: Record<string, string> = {
        PARENT: '/parent/home',
        TEACHER: '/teacher/home',
        ADVISOR: '/advisor/home',
        ADMIN: '/admin/dashboard',
      };
      navigate(homeMap[user!.role] || '/');
    } catch {
      // error already set in store
    }
  };

  // 快速演示登录
  const quickLogin = async (uname: string, pwd: string) => {
    setUsername(uname);
    setPassword(pwd);
    try {
      await login(uname, pwd);
      const { user } = useAuthStore.getState();
      const homeMap: Record<string, string> = {
        PARENT: '/parent/home',
        TEACHER: '/teacher/home',
        ADVISOR: '/advisor/home',
        ADMIN: '/admin/dashboard',
      };
      navigate(homeMap[user!.role] || '/');
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-100 via-warm-50 to-white flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-warm-500 shadow-lg shadow-warm-200 mb-4">
          <Heart className="w-10 h-10 text-white" fill="white" />
        </div>
        <h1 className="text-3xl font-black text-gray-800">心桥</h1>
        <p className="text-gray-500 mt-1">小学生心理咨询预约平台</p>
      </div>

      {/* 登录表单 */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="font-bold ml-2">×</button>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">账号</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none text-lg"
            placeholder="请输入账号"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none text-lg"
            placeholder="请输入密码"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-warm-500 text-white text-lg font-bold rounded-2xl shadow-lg
                     hover:bg-warm-600 active:scale-[0.98] transition-all disabled:opacity-50
                     flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" />
          {loading ? '登录中...' : '登录'}
        </button>

        <p className="text-center text-sm text-gray-500">
          还没有账号？{' '}
          <Link to="/register" className="text-warm-600 font-bold">家长注册</Link>
        </p>
      </form>

      {/* 快速演示入口 */}
      <div className="mt-8 w-full max-w-sm">
        <p className="text-xs text-gray-400 text-center mb-3">—— 演示账号快速登录 ——</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => quickLogin('teacher', 'teacher123')}
            className="px-3 py-2 bg-calm-50 text-calm-700 text-xs rounded-xl hover:bg-calm-100 transition-colors">
            心理老师
          </button>
          <button onClick={() => quickLogin('admin', 'admin123')}
            className="px-3 py-2 bg-purple-50 text-purple-700 text-xs rounded-xl hover:bg-purple-100 transition-colors">
            管理员
          </button>
          <button onClick={() => quickLogin('advisor1', 'advisor123')}
            className="px-3 py-2 bg-green-50 text-green-700 text-xs rounded-xl hover:bg-green-100 transition-colors">
            班主任
          </button>
          <button onClick={() => quickLogin('parent1', 'parent123')}
            className="px-3 py-2 bg-orange-50 text-orange-700 text-xs rounded-xl hover:bg-orange-100 transition-colors">
            家长
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          学生请使用管理员生成的二维码扫码登录
        </p>
      </div>
    </div>
  );
}
