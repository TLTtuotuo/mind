import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import PageTransition from '../../components/common/PageTransition';
import Spinner from '../../components/common/Spinner';
import api from '../../utils/api';
import type { TimeSlot } from '../../types';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
      <div className="space-y-2">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-4 w-28" />
      </div>
      <div className="skeleton h-9 w-16 rounded-xl" />
    </div>
  );
}

export default function StudentBook() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekCount, setWeekCount] = useState(0);
  const [maxBookings, setMaxBookings] = useState(2);
  const [booking, setBooking] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/slots');
      setSlots(res.data.slots);
      setWeekCount(res.data.weekCount);
      setMaxBookings(res.data.maxBookings);
    } catch (err: any) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (slotId: string) => {
    if (booking) return;
    setBooking(slotId);
    try {
      const res = await api.post('/student/book', { slotId, note: note || undefined });
      setResult({
        success: true,
        message: `预约成功！请于 ${res.data.appointment.time} 准时到达心理咨询室。`,
      });
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.error || '预约失败，请稍后重试',
      });
    } finally {
      setBooking(null);
    }
  };

  const formatSlot = (iso: string) => {
    const d = new Date(iso);
    const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const date = `${d.getMonth() + 1}月${d.getDate()}日`;
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const week = weekNames[d.getDay()];
    return { date, time, week };
  };

  if (result) {
    return (
      <PageTransition type="scale">
        <div className="min-h-screen bg-gradient-to-b from-warm-100 via-warm-50 to-white flex flex-col items-center justify-center px-6 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 animate-scale-in ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
            {result.success
              ? <CheckCircle2 className="w-10 h-10 text-green-500" />
              : <AlertCircle className="w-10 h-10 text-red-500" />
            }
          </div>
          <h2 className={`text-xl font-black mb-2 animate-slide-up ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.success ? '预约成功！' : '预约失败'}
          </h2>
          <p className="text-gray-600 max-w-xs animate-slide-up" style={{ animationDelay: '0.1s' }}>{result.message}</p>
          <div className="flex gap-3 mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {result.success && (
              <button onClick={() => navigate('/student/entry')}
                className="px-6 py-3 bg-warm-500 text-white font-bold rounded-2xl shadow-lg
                           hover:bg-warm-600 active:scale-95 transition-all">
                返回首页
              </button>
            )}
            <button onClick={() => { setResult(null); if (result.success) navigate('/student/entry'); }}
              className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl
                         hover:bg-gray-200 active:scale-95 transition-all">
              {result.success ? '继续浏览' : '重试'}
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-warm-100 via-warm-50 to-white">
        {/* 顶栏 */}
        <div className="sticky top-0 bg-warm-100/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 animate-slide-down">
          <button onClick={() => navigate('/student/entry')} className="p-2 rounded-xl hover:bg-white/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-gray-800">预约咨询</h1>
            <p className="text-xs text-gray-500">
              本周已约 {weekCount}/{maxBookings} 次
            </p>
          </div>
        </div>

        <div className="px-6 py-4 max-w-sm mx-auto">
          {/* 提示 */}
          {!loading && weekCount >= maxBookings && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-sm text-amber-700 flex items-start gap-2 animate-slide-up">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>本周预约已达上限，请下周再约哦～如有紧急情况请联系班主任。</span>
            </div>
          )}

          {/* 备注 */}
          {!loading && (
            <div className="mb-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
              <label className="text-xs font-bold text-gray-500 mb-1 block">想聊什么？（选填，老师会提前了解）</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-warm-200 focus:border-warm-400 focus:outline-none resize-none text-sm transition-colors"
                rows={2}
                maxLength={200}
                placeholder="比如：最近有点不开心..."
              />
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-5 w-20 mb-4" />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-bold">暂无可预约时段</p>
              <p className="text-gray-300 text-sm mt-1">请等待心理老师开放新的时段</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2 animate-slide-up">
                <Clock className="w-4 h-4" /> 可选时段
              </h3>
              <div className="stagger-list space-y-3">
                {slots.map(slot => {
                  const { date, time, week } = formatSlot(slot.startTime);
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleBook(slot.id)}
                      disabled={!!booking || weekCount >= maxBookings}
                      className="slot-card w-full text-left flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-gray-800 text-lg">{time}</div>
                        <div className="text-sm text-gray-500">{date} {week}</div>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                        ${booking === slot.id ? 'bg-gray-200 text-gray-400'
                          : weekCount >= maxBookings ? 'bg-gray-100 text-gray-300'
                          : 'bg-warm-500 text-white hover:bg-warm-600'
                        }`}>
                        {booking === slot.id ? '预约中...' : '预约'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
