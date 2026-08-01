import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, EyeOff, Eye } from 'lucide-react';
import api from '../../utils/api';

export default function StudentTreehole() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ viewCode: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.post('/student/treehole', { content, isAnonymous });
      setResult({ viewCode: res.data.viewCode, message: res.data.message });
    } catch (err: any) {
      setError(err.response?.data?.error || '发送失败');
    } finally {
      setSending(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-calm-100 via-calm-50 to-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-calm-100 flex items-center justify-center mb-4">
          <Send className="w-10 h-10 text-calm-600" />
        </div>
        <h2 className="text-xl font-black text-calm-700 mb-2">悄悄话已投递！</h2>
        <p className="text-gray-500 mb-6">{result.message}</p>

        {/* 查看码 */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-calm-200 p-6 mb-6">
          <p className="text-xs text-gray-400 mb-2 font-bold">你的查看码</p>
          <p className="text-3xl font-mono font-black text-calm-700 tracking-[0.3em]">
            {result.viewCode}
          </p>
          <p className="text-xs text-red-400 mt-3">⚠ 请截图保存，这是查看回复的唯一凭证！</p>
        </div>

        <button
          onClick={() => navigate('/student/entry')}
          className="px-8 py-3 bg-warm-500 text-white font-bold rounded-2xl shadow-lg
                     hover:bg-warm-600 active:scale-95 transition-all"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-calm-100 via-calm-50 to-white">
      {/* 顶栏 */}
      <div className="sticky top-0 bg-calm-100/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/student/entry')} className="p-2 rounded-xl hover:bg-white/50">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-800">写悄悄话</h1>
          <p className="text-xs text-gray-500">把你的心事告诉树洞</p>
        </div>
      </div>

      <div className="px-6 py-4 max-w-sm mx-auto space-y-4">
        {/* 匿名切换 */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAnonymous ? 'bg-purple-100' : 'bg-calm-100'}`}>
              {isAnonymous ? <EyeOff className="w-5 h-5 text-purple-500" /> : <Eye className="w-5 h-5 text-calm-500" />}
            </div>
            <div>
              <div className="font-bold text-sm text-gray-700">
                {isAnonymous ? '匿名发送' : '实名发送'}
              </div>
              <div className="text-xs text-gray-400">
                {isAnonymous ? '老师不会知道你是谁' : '老师知道你是谁'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsAnonymous(!isAnonymous)}
            className={`w-14 h-8 rounded-full transition-colors ${isAnonymous ? 'bg-purple-500' : 'bg-gray-300'}`}
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${isAnonymous ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* 文本框 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full min-h-[200px] text-base resize-none focus:outline-none placeholder:text-gray-300"
            placeholder="亲爱的树洞，我想对你说..."
            maxLength={2000}
            autoFocus
          />
          <div className="text-right text-xs text-gray-300">{content.length}/2000</div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || sending}
          className="w-full py-4 bg-calm-500 text-white text-lg font-black rounded-3xl shadow-lg
                     hover:bg-calm-600 active:scale-[0.97] transition-all
                     disabled:opacity-40 disabled:active:scale-100
                     flex items-center justify-center gap-2"
        >
          <Send className="w-6 h-6" />
          {sending ? '投递中...' : '投递悄悄话'}
        </button>
      </div>
    </div>
  );
}
