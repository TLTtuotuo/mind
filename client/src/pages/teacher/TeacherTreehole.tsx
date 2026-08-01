import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, EyeOff, Eye } from 'lucide-react';
import api from '../../utils/api';
import type { TreeholeMessage } from '../../types';

export default function TeacherTreehole() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<TreeholeMessage[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'REPLIED' | 'ALL'>('PENDING');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadMessages(); }, [filter]);

  const loadMessages = async () => {
    const params = filter !== 'ALL' ? `?status=${filter}` : '';
    const res = await api.get(`/teacher/treehole${params}`);
    setMessages(res.data);
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/teacher/treehole/${id}/reply`, { reply: replyText });
      setReplyTo(null);
      setReplyText('');
      loadMessages();
    } catch (err: any) {
      alert(err.response?.data?.error || '回复失败');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 border-b border-gray-100 space-y-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/teacher/home')} className="p-2 rounded-xl hover:bg-gray-50">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-black text-gray-800">树洞消息管理</h1>
        </div>
        <div className="flex gap-2">
          {(['PENDING', 'REPLIED', 'ALL'] as const).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all
                ${filter === f ? 'bg-calm-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {f === 'PENDING' ? '待回复' : f === 'REPLIED' ? '已回复' : '全部'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-container space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">
              {filter === 'PENDING' ? '暂无待回复消息' : '暂无消息'}
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="bg-white rounded-2xl p-5 shadow-sm">
              {/* 学生信息 */}
              <div className="flex items-center gap-2 mb-3">
                {msg.isAnonymous ? (
                  <>
                    <EyeOff className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-500 font-bold">匿名同学</span>
                    {msg.studentInfo?.grade && (
                      <span className="text-xs text-purple-300">{msg.studentInfo.grade}年级</span>
                    )}
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-calm-400" />
                    <span className="text-sm text-gray-700 font-bold">
                      {msg.studentInfo?.name || '未知'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {msg.studentInfo?.className}
                    </span>
                  </>
                )}
                <span className="text-xs text-gray-300 ml-auto">
                  {new Date(msg.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>

              {/* 学生消息 */}
              <div className="bg-gray-50 rounded-xl p-4 mb-3 text-sm text-gray-700 leading-relaxed">
                {msg.content}
              </div>

              {/* 回复 */}
              {msg.reply ? (
                <div className="bg-calm-50 rounded-xl p-4 border border-calm-100">
                  <div className="text-xs text-calm-400 mb-1 font-bold">我的回复</div>
                  <div className="text-sm text-gray-700">{msg.reply}</div>
                </div>
              ) : replyTo === msg.id ? (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-calm-200 focus:border-calm-400
                               focus:outline-none resize-none text-sm"
                    rows={3}
                    placeholder="写下你的回复..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleReply(msg.id)}
                      disabled={!replyText.trim() || sending}
                      className="px-4 py-2 bg-calm-500 text-white text-sm font-bold rounded-xl
                                 hover:bg-calm-600 disabled:opacity-40 flex items-center gap-1">
                      <Send className="w-3 h-3" /> 回复
                    </button>
                    <button onClick={() => { setReplyTo(null); setReplyText(''); }}
                      className="px-4 py-2 bg-gray-100 text-gray-500 text-sm rounded-xl hover:bg-gray-200">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setReplyTo(msg.id)}
                  className="w-full py-2.5 border-2 border-dashed border-calm-200 text-calm-500
                             text-sm font-bold rounded-xl hover:bg-calm-50 transition-colors">
                  {msg.status === 'PENDING' ? '点击回复' : '修改回复'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
