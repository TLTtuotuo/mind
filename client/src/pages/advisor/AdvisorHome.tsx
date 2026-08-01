import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { Bell, LogOut, Users, Calendar, Eye } from 'lucide-react';
import api from '../../utils/api';
import type { Appointment } from '../../types';

export default function AdvisorHome() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [todayApps, setTodayApps] = useState<Appointment[]>([]);
  const [allApps, setAllApps] = useState<Appointment[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/advisor/today'),
      api.get('/advisor/appointments'),
      api.get('/notifications/unread-count'),
    ]).then(([today, all, unread]) => {
      setTodayApps(today.data.appointments || []);
      setAllApps(all.data || []);
      setUnreadCount(unread.data.count);
    }).catch(console.error);
  }, []);

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      CONFIRMED: { label: '已预约', color: 'bg-green-100 text-green-700' },
      COMPLETED: { label: '已完成', color: 'bg-blue-100 text-blue-700' },
      CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
      NO_SHOW: { label: '爽约', color: 'bg-red-100 text-red-600' },
    };
    return map[s] || { label: s, color: 'bg-gray-100 text-gray-500' };
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-lg">{user?.name} 老师</h1>
            <p className="text-xs text-gray-400">班主任工作台 · 本班知会</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/advisor/messages')} className="relative p-2 rounded-xl hover:bg-gray-50">
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="p-2 rounded-xl hover:bg-gray-50">
              <LogOut className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="page-container space-y-6">
        {/* 知会说明 */}
        <div className="bg-calm-50 border border-calm-200 rounded-2xl p-4 flex items-start gap-3">
          <Eye className="w-5 h-5 text-calm-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-calm-700">知会模式</div>
            <p className="text-xs text-calm-500 mt-0.5">
              您可以看到本班学生的咨询预约动态，以便了解学生情况。您无需审批，预约由心理老师统一管理。
            </p>
          </div>
        </div>

        {/* 今日预约 */}
        <div>
          <h3 className="font-bold text-sm text-gray-600 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> 今日本班预约
          </h3>
          {todayApps.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-400">
              今天没有本班学生预约咨询
            </div>
          ) : (
            <div className="space-y-2">
              {todayApps.map(app => (
                <div key={app.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-800">{app.studentName}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusLabel(app.status).color}`}>
                      {statusLabel(app.status).label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(app.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(app.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 近期预约动态 */}
        <div>
          <h3 className="font-bold text-sm text-gray-600 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> 本班近期预约动态
          </h3>
          {allApps.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-400">
              暂无预约记录
            </div>
          ) : (
            <div className="space-y-2">
              {allApps.slice(0, 20).map(app => (
                <div key={app.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-gray-800">{app.studentName}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(app.startTime).toLocaleDateString('zh-CN')}
                      {' '}
                      {new Date(app.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusLabel(app.status).color}`}>
                    {statusLabel(app.status).label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
