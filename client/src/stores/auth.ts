import { create } from 'zustand';
import api from '../utils/api';
import type { User, Role } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; name: string; phone?: string }) => Promise<void>;
  qrLogin: (qrToken: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      set({ token, user, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.error || '登录失败';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/register', data);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      set({ token, user, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.error || '注册失败';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  qrLogin: async (qrToken) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/qr-login', { qrToken });
      const { token, student } = res.data;
      localStorage.setItem('token', token);
      sessionStorage.setItem('qrToken', qrToken);
      set({
        token,
        user: {
          id: student.id,
          username: '',
          name: student.name,
          role: 'STUDENT' as Role,
          student: {
            id: student.id,
            studentNo: student.studentNo,
            className: student.className,
            grade: student.grade,
          },
        },
        loading: false,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || '二维码登录失败';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  fetchMe: async () => {
    if (!get().token) return;
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data });
    } catch {
      localStorage.removeItem('token');
      set({ token: null, user: null });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('qrToken');
    set({ token: null, user: null });
  },

  clearError: () => set({ error: null }),
}));
