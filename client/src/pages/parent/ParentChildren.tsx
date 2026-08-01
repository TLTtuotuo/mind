import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, UserPlus } from 'lucide-react';
import api from '../../utils/api';
import type { ChildBinding } from '../../types';

export default function ParentChildren() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildBinding[]>([]);
  const [studentNo, setStudentNo] = useState('');
  const [binding, setBinding] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadChildren(); }, []);

  const loadChildren = async () => {
    try {
      const res = await api.get('/parent/children');
      setChildren(res.data);
    } catch (err) { console.error(err); }
  };

  const handleBind = async () => {
    if (!studentNo.trim() || binding) return;
    setBinding(true);
    setMsg(null);
    try {
      await api.post('/parent/bind-child', { studentNo });
      setMsg({ type: 'success', text: '绑定成功！' });
      setStudentNo('');
      loadChildren();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.error || '绑定失败' });
    } finally {
      setBinding(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('/parent/home')} className="p-2 rounded-xl hover:bg-gray-50">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-gray-800">管理绑定</h1>
      </div>

      <div className="page-container space-y-6">
        {/* 绑定新孩子 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> 绑定新孩子
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={studentNo}
              onChange={e => setStudentNo(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none text-sm"
              placeholder="输入孩子的学号"
            />
            <button onClick={handleBind} disabled={!studentNo.trim() || binding}
              className="px-5 py-3 bg-warm-500 text-white font-bold rounded-xl hover:bg-warm-600
                         active:scale-95 transition-all disabled:opacity-40 whitespace-nowrap flex items-center gap-1">
              <Plus className="w-4 h-4" /> 绑定
            </button>
          </div>
          {msg && (
            <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${msg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* 已绑定列表 */}
        <div>
          <h3 className="font-bold text-sm text-gray-600 mb-3">已绑定的孩子</h3>
          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-400">
              还没有绑定孩子，请先绑定
            </div>
          ) : (
            <div className="space-y-2">
              {children.map(child => (
                <div key={child.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-800">{child.name}</div>
                    <div className="text-xs text-gray-400">
                      {child.studentNo} · {child.className} · {child.relation === 'PARENT' ? '家长' : '监护人'}
                    </div>
                  </div>
                  <button onClick={() => navigate(`/parent/book?childId=${child.id}`)}
                    className="px-4 py-2 bg-warm-500 text-white text-sm font-bold rounded-xl
                               hover:bg-warm-600 active:scale-95 transition-all">
                    预约
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
