import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', password: '', confirmPwd: '', name: '', phone: '' });
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPwd) {
      alert('两次密码输入不一致');
      return;
    }
    try {
      await register({ username: form.username, password: form.password, name: form.name, phone: form.phone || undefined });
      navigate('/parent/home');
    } catch { /* handled */ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-100 via-warm-50 to-white px-6 py-8">
      <div className="max-w-sm mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-gray-500 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回登录
        </Link>

        <h1 className="text-2xl font-black text-gray-800 mb-6">家长注册</h1>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex justify-between items-center mb-4">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="font-bold ml-2">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">姓名</label>
            <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none"
              placeholder="您的真实姓名" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">手机号（选填）</label>
            <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none"
              placeholder="手机号码" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">账号</label>
            <input type="text" value={form.username} onChange={e => updateField('username', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none"
              placeholder="设置登录账号" required minLength={3} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">密码</label>
            <input type="password" value={form.password} onChange={e => updateField('password', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none"
              placeholder="至少6位密码" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">确认密码</label>
            <input type="password" value={form.confirmPwd} onChange={e => updateField('confirmPwd', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none"
              placeholder="再次输入密码" required minLength={6} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-warm-500 text-white text-lg font-bold rounded-2xl shadow-lg
                       hover:bg-warm-600 active:scale-[0.98] transition-all disabled:opacity-50">
            {loading ? '注册中...' : '注册并进入'}
          </button>
        </form>
      </div>
    </div>
  );
}
