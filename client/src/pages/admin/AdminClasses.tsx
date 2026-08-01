import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit3 } from 'lucide-react';
import api from '../../utils/api';
import type { ClassInfo } from '../../types';

export default function AdminClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(1);

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    const res = await api.get('/admin/classes');
    setClasses(res.data);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (editId) {
      await api.put(`/admin/classes/${editId}`, { name, grade });
    } else {
      await api.post('/admin/classes', { name, grade });
    }
    setShowForm(false);
    setEditId(null);
    setName('');
    setGrade(1);
    loadClasses();
  };

  const handleEdit = (c: ClassInfo) => {
    setEditId(c.id);
    setName(c.name);
    setGrade(c.grade);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该班级吗？')) return;
    try {
      await api.delete(`/admin/classes/${id}`);
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const gradeNames = ['', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-xl hover:bg-gray-50">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-gray-800 flex-1">班级管理</h1>
        <button onClick={() => { setEditId(null); setName(''); setGrade(1); setShowForm(!showForm); }}
          className="px-4 py-2 bg-warm-500 text-white text-sm font-bold rounded-xl flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新增
        </button>
      </div>

      <div className="page-container space-y-4">
        {showForm && (
          <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-warm-200 space-y-3">
            <h3 className="font-black text-gray-800">{editId ? '编辑班级' : '新增班级'}</h3>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">班级名称</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none"
                placeholder="如：三年级1班" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">年级</label>
              <div className="flex gap-2">
                {[1,2,3,4,5,6].map(g => (
                  <button key={g}
                    onClick={() => setGrade(g)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold
                      ${grade === g ? 'bg-warm-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {gradeNames[g]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit}
                className="flex-1 py-2.5 bg-warm-500 text-white font-bold rounded-xl hover:bg-warm-600">
                {editId ? '保存' : '创建'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200">
                取消
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {classes.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800">{c.name}</div>
                <div className="text-xs text-gray-400">
                  {gradeNames[c.grade]} · {c.studentCount ?? 0} 名学生
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(c)}
                  className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-calm-500">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(c.id)}
                  className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
