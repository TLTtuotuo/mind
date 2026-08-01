import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, Clock, EyeOff, Eye } from 'lucide-react';
import api from '../../utils/api';

interface ReplyMsg {
  id: string;
  content: string;
  isAnonymous: boolean;
  status: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export default function StudentTreeholeCheck() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewCode, setViewCode] = useState(searchParams.get('code') || '');
  const [msg, setMsg] = useState<ReplyMsg | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (viewCode.length !== 8) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/student/treehole/check', { viewCode });
      setMsg(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '查询失败');
      setMsg(null);
    } finally {
      setLoading(false);
    }
  };

  // 如果 URL 带 code，自动查询
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && code.length === 8) {
      setViewCode(code);
      handleCheck();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-calm-100 via-calm-50 to-white">
      <div className="sticky top-0 bg-calm-100/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/student/entry')} className="p-2 rounded-xl hover:bg-white/50">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-gray-800">查看树洞回复</h1>
      </div>

      <div className="px-6 py-4 max-w-sm mx-auto space-y-4">
        {/* 输入查看码 */}
        {!msg && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-gray-500 mb-2 block">输入8位查看码</label>
              <input
                type="text"
                value={viewCode}
                onChange={e => setViewCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border-2 border-calm-200 focus:border-calm-400
                           focus:outline-none text-center text-xl font-mono tracking-[0.2em]"
                maxLength={8}
                placeholder="ABCD1234"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <button
              onClick={handleCheck}
              disabled={viewCode.length !== 8 || loading}
              className="w-full py-3.5 bg-calm-500 text-white text-lg font-bold rounded-2xl shadow-lg
                         hover:bg-calm-600 active:scale-[0.98] transition-all
                         disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              {loading ? '查询中...' : '查看回复'}
            </button>
          </>
        )}

        {/* 显示消息和回复 */}
        {msg && (
          <div className="space-y-4">
            {/* 我的消息 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                {msg.isAnonymous
                  ? <EyeOff className="w-4 h-4 text-purple-400" />
                  : <Eye className="w-4 h-4 text-calm-400" />
                }
                <span className="text-xs text-gray-400 font-bold">
                  {msg.isAnonymous ? '匿名悄悄话' : '我的悄悄话'}
                </span>
                <span className="text-xs text-gray-300">
                  {new Date(msg.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-gray-700 leading-relaxed text-sm">
                {msg.content}
              </div>
            </div>

            {/* 老师回复 */}
            {msg.status === 'PENDING' ? (
              <div className="bg-amber-50 rounded-2xl p-6 text-center">
                <Clock className="w-10 h-10 text-amber-300 mx-auto mb-2" />
                <p className="text-amber-600 font-bold text-sm">老师还没有回复</p>
                <p className="text-amber-400 text-xs mt-1">请耐心等待，心理老师看到后会回复的～</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-calm-50 to-calm-100 rounded-2xl p-5 border-2 border-calm-200">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-calm-500" />
                  <span className="text-xs text-calm-500 font-bold">心理老师的回复</span>
                  {msg.repliedAt && (
                    <span className="text-xs text-calm-300">
                      {new Date(msg.repliedAt).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>
                <div className="bg-white rounded-xl p-4 text-gray-700 leading-relaxed text-sm">
                  {msg.reply}
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/student/entry')}
              className="w-full py-3 bg-warm-500 text-white font-bold rounded-2xl shadow-lg
                         hover:bg-warm-600 active:scale-95 transition-all"
            >
              返回首页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
