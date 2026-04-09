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

    // 自动注入租户 ID 请求头（默认值 'default-tenant'，后续可通过 Store 覆盖）
    const tenantId = localStorage.getItem('tenant_id') || 'default-tenant';
    config.headers['x-tenant-id'] = tenantId;

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
    // 提取错误信息并全局提示
    const message = error.response?.data?.message
      || error.response?.data?.error
      || error.message
      || '请求失败，请稍后重试';

    // 全局错误提示
    ElMessage.error(message);

    console.error('API 请求错误:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
