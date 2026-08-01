import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, QrCode, Download, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import type { ClassInfo, StudentInfo } from '../../types';

export default function AdminQRCode() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClass = searchParams.get('classId') || '';

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [qrResults, setQrResults] = useState<Array<{ studentId: string; studentName: string; qrDataUrl: string }>>([]);
  const [generating, setGenerating] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // 选择班级——写入 URL 参数，刷新不丢
  const selectClass = (classId: string) => {
    setSearchParams({ classId });
  };

  useEffect(() => {
    api.get('/admin/classes').then(r => setClasses(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass);
    } else {
      setStudents([]);
      setQrResults([]);
    }
  }, [selectedClass]);

  const loadStudents = async (classId: string) => {
    const res = await api.get(`/admin/students?classId=${classId}`);
    setStudents(res.data);
    // 自动恢复已有 QR 码
    recoverExistingQR(res.data);
  };

  // 刷新后恢复已有二维码图片
  const recoverExistingQR = async (students: StudentInfo[]) => {
    const withQR = students.filter(s => s.hasQR);
    if (withQR.length === 0) return;

    setRecovering(true);
    const recovered: Array<{ studentId: string; studentName: string; qrDataUrl: string }> = [];

    for (const s of withQR) {
      try {
        const res = await api.get(`/admin/qrcode/${s.id}`);
        recovered.push({
          studentId: res.data.studentId,
          studentName: res.data.studentName,
          qrDataUrl: res.data.qrDataUrl,
        });
      } catch {
        // token 过期或无效，跳过
      }
    }

    setQrResults(recovered);
    setRecovering(false);
  };

  const generateSingle = async (studentId: string) => {
    try {
      const res = await api.post(`/admin/qrcode/${studentId}`);
      setQrResults(prev => [...prev.filter(q => q.studentId !== studentId), {
        studentId: res.data.studentId,
        studentName: res.data.studentName,
        qrDataUrl: res.data.qrDataUrl,
      }]);
    } catch (err: any) {
      alert('生成失败');
    }
  };

  const generateBatch = async () => {
    if (!selectedClass) return;
    setGenerating(true);
    try {
      const res = await api.post(`/admin/qrcode/batch/${selectedClass}`);
      setQrResults(res.data.results);
      await loadStudents(selectedClass);
    } catch (err: any) {
      alert('批量生成失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-xl hover:bg-gray-50">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-gray-800 flex-1">二维码管理</h1>
      </div>

      <div className="page-container space-y-4">
        {/* 班级选择 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-gray-500 mb-2 block">选择班级</label>
          <div className="flex gap-2 flex-wrap">
            {classes.map(c => (
              <button key={c.id}
                onClick={() => selectClass(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${selectedClass === c.id ? 'bg-warm-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {c.name}
              </button>
            ))}
          </div>
          {selectedClass && (
            <button onClick={generateBatch} disabled={generating}
              className="mt-3 w-full py-3 bg-calm-500 text-white font-bold rounded-xl
                         hover:bg-calm-600 disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? '生成中...' : `批量生成 ${students.length} 个二维码`}
            </button>
          )}
        </div>

        {/* 学生列表 & 二维码 */}
        {selectedClass && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-600">学生列表</h3>
              {recovering && (
                <span className="text-xs text-gray-400 animate-pulse">恢复已有二维码...</span>
              )}
            </div>
            {students.map(s => {
              const qr = qrResults.find(q => q.studentId === s.id);
              return (
                <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.studentNo}</div>
                    </div>
                    <button onClick={() => generateSingle(s.id)}
                      className="px-3 py-1.5 bg-warm-500 text-white text-sm font-bold rounded-xl
                                 hover:bg-warm-600 flex items-center gap-1 transition-all">
                      <QrCode className="w-3 h-3" /> {qr ? '重新生成' : '生成'}
                    </button>
                  </div>
                  {qr && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                      <img src={qr.qrDataUrl} alt="QR" className="w-24 h-24 rounded-xl border" />
                      <div className="text-xs text-gray-400">
                        <p>有效期：24小时</p>
                        <p>扫码即可登录学生端</p>
                        <a href={qr.qrDataUrl} download={`QR_${s.name}.png`}
                          className="inline-flex items-center gap-1 text-calm-500 font-bold mt-1">
                          <Download className="w-3 h-3" /> 下载
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
