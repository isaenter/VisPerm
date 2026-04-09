import axios from 'axios';
import { ElMessage } from 'element-plus';

// 创建 API 客户端实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证 token
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 自动注入租户 ID 请求头
    const tenantId = localStorage.getItem('tenant_id');
    if (!tenantId) {
      // 租户 ID 缺失时发出警告并使用 fallback 值
      console.warn('[VisPerm] 租户 ID 未设置，使用 fallback 值 "default-tenant"。请在设置页面配置租户 ID。');
      ElMessage.warning('租户 ID 未设置，已使用默认值。请在设置中配置正确的租户 ID。');
    }
    config.headers['x-tenant-id'] = tenantId || 'default-tenant';

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 根据 HTTP 状态码提供差异化提示
    const status = error.response?.status;
    let message: string;

    switch (status) {
      case 401:
        message = '认证已过期，请重新登录';
        // 可选：清除本地 token 并跳转登录页
        localStorage.removeItem('access_token');
        break;
      case 403:
        message = '权限不足，无法执行此操作';
        break;
      case 404:
        message = '请求的资源不存在';
        break;
      case 500:
        message = '服务器内部错误，请稍后重试';
        break;
      default:
        message = error.response?.data?.message
          || error.response?.data?.error
          || error.message
          || '请求失败，请稍后重试';
    }

    // 全局错误提示
    ElMessage.error(message);

    console.error(`API 请求错误 [${status || 'unknown'}]:`, error);
    return Promise.reject(error);
  }
);

export default apiClient;
