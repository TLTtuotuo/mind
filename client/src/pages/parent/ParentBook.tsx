import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Users, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';
import type { ChildBinding, TimeSlot } from '../../types';

export default function ParentBook() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [children, setChildren] = useState<ChildBinding[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>(searchParams.get('childId') || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.get('/parent/children').then(r => {
      setChildren(r.data);
      if (!selectedChild && r.data.length > 0) setSelectedChild(r.data[0].id);
    });
    api.get('/parent/slots').then(r => setSlots(r.data));
  }, []);

  const handleBook = async (slotId: string) => {
    if (!selectedChild || booking) return;
    setBooking(slotId);
    try {
      const res = await api.post('/parent/book', { studentId: selectedChild, slotId, note: note || undefined });
      setSuccess(res.data.appointment.time);
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err: any) {
      alert(err.response?.data?.error || '预约失败');
    } finally {
      setBooking(null);
    }
  };

  const formatSlot = (iso: string) => {
    const d = new Date(iso);
    const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return {
      date: `${d.getMonth() + 1}月${d.getDate()}日 ${weekNames[d.getDay()]}`,
      time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
    };
  };

  if (success) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-black text-green-700 mb-2">预约成功！</h2>
        <p className="text-gray-600 mb-8">预约时间：{success}</p>
        <button onClick={() => navigate('/parent/home')}
          className="px-8 py-3 bg-warm-500 text-white font-bold rounded-2xl shadow-lg">
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('/parent/home')} className="p-2 rounded-xl hover:bg-gray-50">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-gray-800">为孩子预约咨询</h1>
      </div>

      <div className="page-container space-y-4">
        {/* 选择孩子 */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> 选择孩子
          </label>
          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-400">
              还没有绑定的孩子，请先
              <button onClick={() => navigate('/parent/children')} className="text-warm-500 font-bold mx-1">绑定孩子</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {children.map(c => (
                <button key={c.id}
                  onClick={() => setSelectedChild(c.id)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all
                    ${selectedChild === c.id
                      ? 'bg-warm-500 text-white shadow-lg shadow-warm-200'
                      : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                >
                  {c.name} ({c.className})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 可选备注 */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-2 block">备注（选填，老师会提前了解）</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-warm-400 focus:outline-none resize-none text-sm"
            rows={2}
            maxLength={200}
            placeholder="如：孩子最近情绪不太好，希望能和老师聊聊..."
          />
        </div>

        {/* 时段列表 */}
        <div>
          <h3 className="font-bold text-sm text-gray-600 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> 可选时段
          </h3>
          {slots.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-400">
              暂无可预约时段
            </div>
          ) : (
            <div className="space-y-2">
              {slots.map(slot => {
                const { date, time } = formatSlot(slot.startTime);
                return (
                  <button key={slot.id}
                    onClick={() => handleBook(slot.id)}
                    disabled={!selectedChild || !!booking}
                    className="slot-card w-full text-left flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-gray-800">{date}</div>
                      <div className="text-sm text-gray-500">{time}</div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold
                      ${!selectedChild ? 'bg-gray-100 text-gray-300'
                        : booking === slot.id ? 'bg-gray-200 text-gray-400'
                        : 'bg-warm-500 text-white'
                      }`}>
                      {booking === slot.id ? '预约中...' : '预约'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
