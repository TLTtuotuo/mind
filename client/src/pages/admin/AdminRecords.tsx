import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Download } from 'lucide-react';
import api from '../../utils/api';
import type { Appointment, ClassInfo } from '../../types';

export default function AdminRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<Appointment[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    api.get('/admin/classes').then(r => setClasses(r.data)).catch(() => {});
    loadRecords();
  }, [filterClass, filterStatus]);

  const loadRecords = async () => {
    const params = new URLSearchParams();
    if (filterClass) params.set('classId', filterClass);
    if (filterStatus) params.set('status', filterStatus);
    const res = await api.get(`/admin/records?${params.toString()}`);
    setRecords(res.data);
  };

  const statusStyle = (s: string) => {
    const map: Record<string, string> = {
      CONFIRMED: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-gray-100 text-gray-500',
      NO_SHOW: 'bg-red-100 text-red-600',
    };
    const label: Record<string, string> = {
      CONFIRMED: '已预约', COMPLETED: '已完成', CANCELLED: '已取消', NO_SHOW: '爽约',
    };
    return { style: map[s] || 'bg-gray-100', label: label[s] || s };
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 border-b border-gray-100 space-y-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-xl hover:bg-gray-50">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-black text-gray-800 flex-1">预约记录</h1>
        </div>
        <div className="flex gap-2">
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
            <option value="">全部班级</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
            <option value="">全部状态</option>
            <option value="CONFIRMED">已预约</option>
            <option value="COMPLETED">已完成</option>
            <option value="CANCELLED">已取消</option>
            <option value="NO_SHOW">爽约</option>
          </select>
        </div>
      </div>

      <div className="page-container">
        <div className="text-xs text-gray-400 mb-3">共 {records.length} 条记录</div>
        <div className="space-y-2">
          {records.map(r => {
            const { style, label } = statusStyle(r.status);
            return (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-800">{r.studentName}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${style}`}>{label}</span>
                </div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  <div>{r.studentNo} · {r.className}</div>
                  <div>
                    {new Date(r.startTime).toLocaleDateString('zh-CN')}
                    {' '}
                    {new Date(r.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(r.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {r.note && <div>备注：{r.note}</div>}
                  <div>预约方式：{r.bookerRole === 'PARENT' ? '家长代约' : '学生自约'} · 操作人：{r.bookerName}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
