import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, UserPlus } from 'lucide-react';
import api from '../../utils/api';
import type { ClassInfo } from '../../types';

interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  advisorClass?: { id: string; name: string } | null;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [form, setForm] = useState({
    username: '', password: '', name: '', role: 'TEACHER', phone: '', advisorClassId: '',
  });

  useEffect(() => {
    loadUsers();
    api.get('/admin/classes').then(r => setClasses(r.data)).catch(() => {});
  }, [filter]);

  const loadUsers = async () => {
    const params = filter !== 'ALL' ? `?role=${filter}` : '';
    const res = await api.get(`/admin/users${params}`);
    setUsers(res.data);
  };

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.name) return;
    try {
      await api.post('/admin/users', {
        ...form,
        advisorClassId: form.advisorClassId || null,
      });
      setShowForm(false);
      setForm({ username: '', password: '', name: '', role: 'TEACHER', phone: '', advisorClassId: '' });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || '创建失败');
    }
  };

  const roleLabel = (r: string) => {
    const map: Record<string, string> = { ADMIN: '管理员', TEACHER: '心理老师', ADVISOR: '班主任', PARENT: '家长' };
    return map[r] || r;
  };
  const roleColor = (r: string) => {
    const map: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-700', TEACHER: 'bg-calm-100 text-calm-700',
      ADVISOR: 'bg-green-100 text-green-700', PARENT: 'bg-warm-100 text-warm-700',
    };
    return map[r] || 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 border-b border-gray-100 space-y-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-xl hover:bg-gray-50">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-black text-gray-800 flex-1">用户管理</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-warm-500 text-white text-sm font-bold rounded-xl flex items-center gap-1">
            <UserPlus className="w-4 h-4" /> 添加
          </button>
        </div>
        <div className="flex gap-2">
          {['ALL', 'TEACHER', 'ADVISOR', 'PARENT'].map(r => (
            <button key={r}
              onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold
                ${filter === r ? 'bg-warm-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {r === 'ALL' ? '全部' : roleLabel(r)}
            </button>
          ))}
        </div>
      </div>

      <div className="page-container space-y-4">
        {showForm && (
          <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-warm-200 space-y-3">
            <h3 className="font-black text-gray-800">添加用户</h3>
            <input type="text" placeholder="姓名" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none text-sm" />
            <input type="text" placeholder="登录账号" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none text-sm" />
            <input type="password" placeholder="初始密码（至少6位）" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none text-sm" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm">
              <option value="TEACHER">心理老师</option>
              <option value="ADVISOR">班主任</option>
            </select>
            {form.role === 'ADVISOR' && (
              <select value={form.advisorClassId}
                onChange={e => setForm({ ...form, advisorClassId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm">
                <option value="">选择班级</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <input type="tel" placeholder="手机号（选填）" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none text-sm" />
            <div className="flex gap-2">
              <button onClick={handleCreate}
                className="flex-1 py-2.5 bg-warm-500 text-white font-bold rounded-xl">创建</button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl">取消</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-800">{u.name}</div>
                  <div className="text-xs text-gray-400">
                    @{u.username}
                    {u.advisorClass && ` · ${u.advisorClass.name}`}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleColor(u.role)}`}>
                  {roleLabel(u.role)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
