import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, Mail } from 'lucide-react';
import api from '../../utils/api';
import type { Notification } from '../../types';

export default function ParentMessages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => {
    try {
      const res = await api.get('/notifications');
      setMessages(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    loadMessages();
  };

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    loadMessages();
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('/parent/home')} className="p-2 rounded-xl hover:bg-gray-50">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-gray-800 flex-1">消息中心</h1>
        <button onClick={markAllRead} className="text-xs text-warm-500 font-bold flex items-center gap-1">
          <CheckCheck className="w-4 h-4" /> 全部已读
        </button>
      </div>

      <div className="page-container">
        {loading ? (
          <div className="text-center py-12 text-gray-400 animate-pulse">加载中...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">暂无消息</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map(msg => (
              <button key={msg.id}
                onClick={() => !msg.isRead && markRead(msg.id)}
                className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm
                  ${!msg.isRead ? 'ring-2 ring-warm-200' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${msg.isRead ? 'bg-gray-300' : 'bg-warm-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-800">{msg.title}</div>
                    <div className="text-sm text-gray-500 mt-0.5 line-clamp-2">{msg.content}</div>
                    <div className="text-xs text-gray-300 mt-2">
                      {new Date(msg.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
