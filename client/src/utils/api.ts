import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器——自动加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // 学生二维码 token
  const qrToken = sessionStorage.getItem('qrToken');
  if (qrToken) {
    config.headers['x-qr-token'] = qrToken;
  }
  return config;
});

// 响应拦截器——统一处理 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('qrToken');
      // 非学生页面跳转登录
      if (!window.location.pathname.startsWith('/student')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
