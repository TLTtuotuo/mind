import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { Calendar, MessageSquare, Bell, LogOut, Heart, CheckCircle2, XCircle } from 'lucide-react';
import PageTransition, { StaggerList } from '../../components/common/PageTransition';
import Spinner from '../../components/common/Spinner';
import api from '../../utils/api';
import type { Appointment } from '../../types';

export default function TeacherHome() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [todayApps, setTodayApps] = useState<Appointment[]>([]);
  const [pendingTreehole, setPendingTreehole] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [todayRes, unreadRes] = await Promise.all([
        api.get('/teacher/today'),
        api.get('/notifications/unread-count'),
      ]);
      setPendingTreehole(todayRes.data.pendingTreehole);
      setUnreadCount(unreadRes.data.count);

      // 加载今日预约详情
      const today = new Date().toISOString().slice(0, 10);
      const slotsRes = await api.get(`/teacher/slots?date=${today}`);
      const apps: Appointment[] = [];
      (slotsRes.data || []).forEach((slot: any) => {
        (slot.appointments || []).forEach((a: any) => {
          apps.push({
            id: a.id, studentName: a.studentName, className: a.className,
            startTime: slot.startTime, endTime: slot.endTime,
            status: a.status, note: a.note, bookerRole: a.bookerRole,
          });
        });
      });
      setTodayApps(apps);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatus = async (id: string, status: 'COMPLETED' | 'NO_SHOW') => {
    await api.patch(`/teacher/appointments/${id}`, { status });
    setTodayApps(prev => prev.filter(a => a.id !== id));
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-warm-50">
        <div className="bg-white border-b border-gray-100 px-4 py-4 animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-calm-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-calm-500" />
              </div>
              <div>
                <h1 className="font-black text-lg">{user?.name} 老师</h1>
                <p className="text-xs text-gray-400">心理老师工作台</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/teacher/treehole')} className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-scale-in">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button onClick={() => { logout(); navigate('/'); }} className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <LogOut className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="page-container space-y-6">
          {loading ? (
            <Spinner text="加载工作台..." />
          ) : (
            <>
              {/* 统计卡片 */}
              <div className="grid grid-cols-3 gap-3 animate-slide-up">
                <div className="bg-white rounded-2xl p-4 shadow-sm text-center hover:shadow-md transition-all">
                  <div className="text-2xl font-black text-calm-600">{todayApps.length}</div>
                  <div className="text-xs text-gray-400 mt-1">今日预约</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm text-center hover:shadow-md transition-all">
                  <div className="text-2xl font-black text-mind-500">{pendingTreehole}</div>
                  <div className="text-xs text-gray-400 mt-1">待回树洞</div>
                </div>
                <button onClick={() => navigate('/teacher/schedule')}
                  className="bg-white rounded-2xl p-4 shadow-sm text-center hover:shadow-md transition-all active:scale-95">
                  <Calendar className="w-6 h-6 text-warm-500 mx-auto mb-1" />
                  <div className="text-xs text-gray-400">管理时段</div>
                </button>
              </div>

              {/* 快捷入口 */}
              <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                <button onClick={() => navigate('/teacher/schedule')}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left">
                  <Calendar className="w-7 h-7 text-warm-500 mb-1" />
                  <div className="font-bold text-sm text-gray-800">时段管理</div>
                  <div className="text-xs text-gray-400">创建/查看时段</div>
                </button>
                <button onClick={() => navigate('/teacher/treehole')}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left">
                  <MessageSquare className="w-7 h-7 text-calm-500 mb-1" />
                  <div className="font-bold text-sm text-gray-800">树洞管理</div>
                  <div className="text-xs text-gray-400">
                    {pendingTreehole > 0 ? `${pendingTreehole} 条待回复` : '查看消息'}
                  </div>
                </button>
              </div>

              {/* 今日预约 */}
              <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <h3 className="font-bold text-sm text-gray-600 mb-3">今日咨询安排</h3>
                {todayApps.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-400">
                    今天没有预约
                  </div>
                ) : (
                  <StaggerList className="space-y-2">
                    {todayApps.map(app => (
                      <div key={app.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-gray-800">{app.studentName}</span>
                            <span className="text-xs text-gray-400 ml-2">{app.className}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold
                            ${app.status === 'CONFIRMED' ? 'bg-green-100 text-green-700'
                              : app.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'}`}>
                            {app.status === 'CONFIRMED' ? '待咨询' :
                             app.status === 'COMPLETED' ? '已完成' : app.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mb-1">
                          {new Date(app.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(app.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {app.note && <div className="text-xs text-gray-400 mt-1">备注：{app.note}</div>}
                        {app.status === 'CONFIRMED' && (
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleStatus(app.id, 'COMPLETED')}
                              className="flex-1 py-2 bg-green-500 text-white text-sm font-bold rounded-xl
                                         hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> 完成
                            </button>
                            <button onClick={() => handleStatus(app.id, 'NO_SHOW')}
                              className="flex-1 py-2 bg-gray-200 text-gray-600 text-sm font-bold rounded-xl
                                         hover:bg-gray-300 active:scale-95 transition-all flex items-center justify-center gap-1">
                              <XCircle className="w-4 h-4" /> 爽约
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </StaggerList>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
