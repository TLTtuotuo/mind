import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../utils/api';

interface Config {
  id: string;
  key: string;
  value: string;
  description?: string;
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/settings').then(r => setConfigs(r.data || [])).catch(() => {});
  }, []);

  const updateValue = (key: string, value: string) => {
    setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
  };

  const saveConfig = async (key: string) => {
    const cfg = configs.find(c => c.key === key);
    if (!cfg) return;
    setSaving(key);
    try {
      await api.put('/admin/settings', { key, value: cfg.value });
    } catch (err: any) {
      alert('保存失败');
    } finally {
      setSaving(null);
    }
  };

  const configLabels: Record<string, { label: string; desc: string; type: 'number' | 'text' }> = {
    max_bookings_per_week: { label: '每周最大预约次数', desc: '每个学生每周最多可预约的咨询次数', type: 'number' },
    cancel_deadline_hours: { label: '取消截止时间（小时）', desc: '咨询开始前多少小时内不允许取消预约', type: 'number' },
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-xl hover:bg-gray-50">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-gray-800">系统设置</h1>
      </div>

      <div className="page-container space-y-4">
        {configs.map(cfg => {
          const info = configLabels[cfg.key] || { label: cfg.key, desc: cfg.description || '', type: 'text' };
          return (
            <div key={cfg.id} className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-1">{info.label}</h3>
              <p className="text-xs text-gray-400 mb-3">{info.desc}</p>
              <div className="flex gap-2">
                <input
                  type={info.type === 'number' ? 'number' : 'text'}
                  value={cfg.value}
                  onChange={e => updateValue(cfg.key, e.target.value)}
                  min={info.type === 'number' ? 1 : undefined}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none text-lg font-bold text-center"
                />
                <button onClick={() => saveConfig(cfg.key)}
                  disabled={saving === cfg.key}
                  className="px-4 py-3 bg-warm-500 text-white font-bold rounded-xl hover:bg-warm-600
                             disabled:opacity-40 flex items-center gap-1 active:scale-95 transition-all">
                  <Save className="w-4 h-4" />
                  {saving === cfg.key ? '...' : '保存'}
                </button>
              </div>
            </div>
          );
        })}

        {configs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>暂无配置项</p>
          </div>
        )}
      </div>
    </div>
  );
}
