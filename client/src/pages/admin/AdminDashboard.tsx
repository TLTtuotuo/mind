import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { LayoutDashboard, Users, BookOpen, MessageSquare, Settings, QrCode, FileText, LogOut } from 'lucide-react';
import PageTransition, { StaggerList } from '../../components/common/PageTransition';
import Spinner from '../../components/common/Spinner';
import api from '../../utils/api';

interface DashboardData {
  totalStudents: number;
  totalAppointments: number;
  completedAppointments: number;
  completionRate: number;
  pendingTreehole: number;
  totalTreehole: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [data, setData] = useState<DashboardData>({
    totalStudents: 0, totalAppointments: 0, completedAppointments: 0,
    completionRate: 0, pendingTreehole: 0, totalTreehole: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const menuItems = [
    { label: '班级管理', icon: Users, path: '/admin/classes', color: 'text-calm-500', bg: 'bg-calm-50' },
    { label: '用户管理', icon: Users, path: '/admin/users', color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: '二维码', icon: QrCode, path: '/admin/qrcode', color: 'text-warm-500', bg: 'bg-warm-50' },
    { label: '预约记录', icon: FileText, path: '/admin/records', color: 'text-green-500', bg: 'bg-green-50' },
    { label: '系统设置', icon: Settings, path: '/admin/settings', color: 'text-gray-500', bg: 'bg-gray-50' },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-warm-50">
        <div className="bg-white border-b border-gray-100 px-4 py-4 animate-slide-down">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-black text-lg">管理员工作台</h1>
              <p className="text-xs text-gray-400">{user?.name}</p>
            </div>
            <button onClick={() => { logout(); navigate('/'); }} className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
              <LogOut className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="page-container space-y-6">
          {loading ? (
            <Spinner text="加载数据..." />
          ) : (
            <>
              {/* 统计卡片 */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Users, color: 'text-calm-500', value: data.totalStudents, label: '学生总数' },
                  { icon: BookOpen, color: 'text-warm-500', value: data.totalAppointments, label: '预约总量' },
                  { icon: BookOpen, color: 'text-green-500', value: data.completionRate + '%', label: '完成率' },
                  { icon: MessageSquare, color: 'text-purple-500', value: data.pendingTreehole, label: '待回复树洞' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all animate-slide-up"
                    style={{ animationDelay: `${i * 0.05}s` }}>
                    <item.icon className={`w-6 h-6 ${item.color} mb-2`} />
                    <div className="text-2xl font-black text-gray-800">{item.value}</div>
                    <div className="text-xs text-gray-400">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* 管理菜单 */}
              <StaggerList className="space-y-2">
                {menuItems.map(item => (
                  <button key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4
                               hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="font-bold text-gray-700">{item.label}</span>
                  </button>
                ))}
              </StaggerList>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
