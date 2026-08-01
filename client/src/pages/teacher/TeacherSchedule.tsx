import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Clock } from 'lucide-react';
import api from '../../utils/api';

interface SlotWithApps {
  id: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  isActive: boolean;
  appointments: Array<{ id: string; studentName: string; className: string; status: string; note?: string }>;
}

export default function TeacherSchedule() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<SlotWithApps[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [timeRanges, setTimeRanges] = useState<{ start: string; end: string }[]>([{ start: '09:00', end: '09:30' }]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    const res = await api.get('/teacher/slots');
    setSlots(res.data);
  };

  const addDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setDates([...dates, d.toISOString().slice(0, 10)]);
  };

  const addTimeRange = () => setTimeRanges([...timeRanges, { start: '14:00', end: '14:30' }]);

  const handleBatchCreate = async () => {
    if (dates.length === 0 || timeRanges.length === 0) return;
    setCreating(true);
    try {
      await api.post('/teacher/slots/batch', { dates, timeRanges, maxBookings: 1 });
      setShowCreate(false);
      setDates([]);
      setTimeRanges([{ start: '09:00', end: '09:30' }]);
      loadSlots();
    } catch (err: any) {
      alert(err.response?.data?.error || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该时段吗？')) return;
    try {
      await api.delete(`/teacher/slots/${id}`);
      loadSlots();
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: `${d.getMonth() + 1}月${d.getDate()}日`,
      time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
    };
  };

  // 生成未来7天日期
  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('/teacher/home')} className="p-2 rounded-xl hover:bg-gray-50">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-gray-800 flex-1">时段管理</h1>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-warm-500 text-white text-sm font-bold rounded-xl
                     hover:bg-warm-600 active:scale-95 transition-all flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新建
        </button>
      </div>

      <div className="page-container space-y-4">
        {/* 创建面板 */}
        {showCreate && (
          <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-warm-200 space-y-4">
            <h3 className="font-black text-gray-800">创建新时段</h3>

            {/* 快速选择日期 */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block">选择日期</label>
              <div className="flex flex-wrap gap-2">
                {quickDates.map(d => (
                  <button key={d}
                    onClick={() => dates.includes(d) ? setDates(dates.filter(x => x !== d)) : setDates([...dates, d])}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all
                      ${dates.includes(d)
                        ? 'bg-warm-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {d.slice(5)}
                  </button>
                ))}
              </div>
            </div>

            {/* 时间段 */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block">时间段</label>
              {timeRanges.map((tr, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input type="time" value={tr.start} onChange={e => {
                    const updated = [...timeRanges];
                    updated[i].start = e.target.value;
                    setTimeRanges(updated);
                  }} className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm flex-1" />
                  <span className="text-gray-400">至</span>
                  <input type="time" value={tr.end} onChange={e => {
                    const updated = [...timeRanges];
                    updated[i].end = e.target.value;
                    setTimeRanges(updated);
                  }} className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm flex-1" />
                </div>
              ))}
              <button onClick={addTimeRange} className="text-xs text-warm-500 font-bold">+ 添加时间段</button>
            </div>

            <button onClick={handleBatchCreate} disabled={dates.length === 0 || creating}
              className="w-full py-3 bg-warm-500 text-white font-bold rounded-xl
                         hover:bg-warm-600 disabled:opacity-40 transition-all">
              {creating ? '创建中...' : `批量创建 ${dates.length * timeRanges.length} 个时段`}
            </button>
          </div>
        )}

        {/* 时段列表 */}
        {slots.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">暂无时段</p>
            <p className="text-gray-300 text-sm">点击右上角创建</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.map(slot => {
              const { date, time } = formatTime(slot.startTime);
              const endTime = formatTime(slot.endTime).time;
              return (
                <div key={slot.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">{date} {time}-{endTime}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {slot.appointments.length === 0 ? '暂未预约' :
                          slot.appointments.map(a => (
                            <span key={a.id} className="mr-3">
                              {a.studentName} ({a.status === 'CONFIRMED' ? '已约' : a.status})
                            </span>
                          ))
                        }
                      </div>
                    </div>
                    <button onClick={() => handleDelete(slot.id)}
                      disabled={slot.appointments.length > 0}
                      className="p-2 rounded-xl hover:bg-red-50 disabled:opacity-30"
                      title={slot.appointments.length > 0 ? '已有预约，无法删除' : '删除'}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
