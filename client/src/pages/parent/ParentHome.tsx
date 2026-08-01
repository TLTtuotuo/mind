import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { CalendarPlus, Users, Bell, LogOut, Heart, ChevronRight } from 'lucide-react';
import PageTransition, { StaggerList } from '../../components/common/PageTransition';
import Spinner from '../../components/common/Spinner';
import api from '../../utils/api';
import type { ChildBinding } from '../../types';

export default function ParentHome() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [children, setChildren] = useState<ChildBinding[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [childRes, notifRes, msgsRes] = await Promise.all([
        api.get('/parent/children'),
        api.get('/notifications/unread-count'),
        api.get('/notifications'),
      ]);
      setChildren(childRes.data);
      setUnreadCount(notifRes.data.count);
      setRecentNotifs((msgsRes.data || []).slice(0, 5));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <PageTransition>
      <div className="min-h-screen bg-warm-50">
        {/* 顶栏 */}
        <div className="bg-white border-b border-gray-100 px-4 py-4 animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-warm-500" />
              </div>
              <div>
                <h1 className="font-black text-lg">你好，{user?.name}</h1>
                <p className="text-xs text-gray-400">家长工作台</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/parent/messages')}
                className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-scale-in">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <LogOut className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="page-container space-y-6">
          {loading ? (
            <Spinner text="加载中..." />
          ) : (
            <>
              {/* 快捷操作 */}
              <div className="grid grid-cols-2 gap-3 animate-slide-up">
                <button onClick={() => navigate('/parent/book')}
                  className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left">
                  <CalendarPlus className="w-8 h-8 text-warm-500 mb-2" />
                  <div className="font-bold text-gray-800">为孩子预约</div>
                  <div className="text-xs text-gray-400 mt-1">选择时段咨询</div>
                </button>
                <button onClick={() => navigate('/parent/children')}
                  className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left">
                  <Users className="w-8 h-8 text-calm-500 mb-2" />
                  <div className="font-bold text-gray-800">我的孩子</div>
                  <div className="text-xs text-gray-400 mt-1">管理绑定关系</div>
                </button>
              </div>

              {/* 绑定的孩子 */}
              {children.length > 0 && (
                <div className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
                  <h3 className="font-bold text-sm text-gray-600 mb-3">已绑定的孩子</h3>
                  <StaggerList className="space-y-2">
                    {children.map(child => (
                      <div key={child.id}
                        className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between
                                   hover:shadow-md transition-all">
                        <div>
                          <div className="font-bold text-gray-800">{child.name}</div>
                          <div className="text-xs text-gray-400">{child.className}</div>
                        </div>
                        <button onClick={() => navigate(`/parent/book?childId=${child.id}`)}
                          className="px-4 py-2 bg-warm-500 text-white text-sm font-bold rounded-xl
                                     hover:bg-warm-600 active:scale-95 transition-all">
                          预约
                        </button>
                      </div>
                    ))}
                  </StaggerList>
                </div>
              )}

              {/* 最近动态 */}
              {recentNotifs.length > 0 && (
                <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-gray-600">最近动态</h3>
                    <button onClick={() => navigate('/parent/messages')}
                      className="text-xs text-warm-500 font-bold flex items-center gap-1 hover:underline">
                      查看全部 <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <StaggerList className="space-y-2">
                    {recentNotifs.map((n: any, i: number) => (
                      <div key={i} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3
                                            hover:shadow-md transition-all cursor-pointer">
                        <div className={`w-2 h-2 rounded-full transition-colors ${n.isRead ? 'bg-gray-300' : 'bg-warm-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-700 truncate">{n.title}</div>
                          <div className="text-xs text-gray-400 truncate">{n.content}</div>
                        </div>
                      </div>
                    ))}
                  </StaggerList>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
