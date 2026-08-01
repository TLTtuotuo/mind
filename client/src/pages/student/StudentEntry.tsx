import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { CalendarHeart, MessageCircleHeart, Eye, LogOut, Heart } from 'lucide-react';
import PageTransition from '../../components/common/PageTransition';

export default function StudentEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token, qrLogin } = useAuthStore();
  const [viewCode, setViewCode] = useState('');
  const [showCheck, setShowCheck] = useState(false);

  // 如果 URL 携带 qrToken，自动登录
  useEffect(() => {
    const qrToken = searchParams.get('qrToken');
    if (qrToken && !token) {
      qrLogin(qrToken).catch(() => {});
    }
  }, [searchParams]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-100 via-warm-50 to-warm-100 flex flex-col items-center justify-center px-6">
        <div className="text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-warm-500 shadow-2xl shadow-warm-200 mb-6">
            <Heart className="w-12 h-12 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-2">心桥</h1>
          <p className="text-gray-500 mb-8">请扫描老师提供的二维码登录</p>

          <input
            type="text"
            placeholder="粘贴二维码中的Token..."
            className="w-full max-w-xs px-4 py-3 rounded-xl border-2 border-warm-300 focus:border-warm-500 focus:outline-none text-center text-sm transition-colors"
            onChange={e => {
              if (e.target.value.length >= 40) {
                qrLogin(e.target.value).catch(() => {});
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-warm-100 via-warm-50 to-calm-50">
        {/* 顶部欢迎 */}
        <div className="text-center pt-10 pb-6 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md mb-3 animate-scale-in">
            <Heart className="w-8 h-8 text-warm-500" fill="#F97316" />
          </div>
          <h2 className="text-xl font-black text-gray-800 animate-slide-up">你好，{user?.name}！</h2>
          {user?.student && (
            <p className="text-sm text-gray-500 mt-1 animate-fade-in">{user.student.className}</p>
          )}
          <button
            onClick={() => { useAuthStore.getState().logout(); window.location.reload(); }}
            className="mt-2 text-xs text-gray-400 flex items-center gap-1 mx-auto hover:text-gray-600 transition-colors"
          >
            <LogOut className="w-3 h-3" /> 退出
          </button>
        </div>

        {/* 核心按钮区 */}
        <div className="px-6 max-w-sm mx-auto">
          <div className="stagger-list space-y-4">
            <button
              onClick={() => navigate('/student/book')}
              className="btn-giant-primary"
            >
              <CalendarHeart className="w-12 h-12" />
              <span>预约咨询</span>
              <span className="text-sm font-normal opacity-80">找老师聊聊天</span>
            </button>

            <button
              onClick={() => navigate('/student/treehole')}
              className="btn-giant-secondary"
            >
              <MessageCircleHeart className="w-12 h-12" />
              <span>写悄悄话</span>
              <span className="text-sm font-normal opacity-80">给树洞说个秘密</span>
            </button>
          </div>

          {/* 查看回复区 */}
          <div className="pt-2">
            {!showCheck ? (
              <button
                onClick={() => setShowCheck(true)}
                className="btn-giant-third animate-slide-up"
              >
                <Eye className="w-10 h-10" />
                <span>查看树洞回复</span>
                <span className="text-sm font-normal opacity-60">输入查看码</span>
              </button>
            ) : (
              <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-mind-200 space-y-3 animate-scale-in">
                <div className="flex items-center gap-2 text-mind-700">
                  <Eye className="w-5 h-5" />
                  <span className="font-bold text-sm">查看树洞回复</span>
                </div>
                <input
                  type="text"
                  value={viewCode}
                  onChange={e => setViewCode(e.target.value)}
                  placeholder="请输入8位查看码"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-mind-200 focus:border-mind-400 focus:outline-none text-center text-lg font-mono tracking-widest transition-colors"
                  maxLength={8}
                />
                <button
                  onClick={() => viewCode.length === 8 && navigate(`/student/treehole/check?code=${viewCode}`)}
                  disabled={viewCode.length !== 8}
                  className="w-full py-2.5 bg-mind-500 text-white font-bold rounded-xl
                             hover:bg-mind-600 active:scale-[0.98] transition-all disabled:opacity-40">
                  查看回复
                </button>
                <button onClick={() => setShowCheck(false)}
                  className="w-full text-xs text-gray-400 py-1 hover:text-gray-500 transition-colors">取消</button>
              </div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="text-center mt-8 pb-10">
          <p className="text-xs text-gray-300">心桥 · 随时倾听你</p>
        </div>
      </div>
    </PageTransition>
  );
}
