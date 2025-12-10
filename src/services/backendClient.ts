// backendClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// (Optional) add a per-request escape hatch
declare module 'axios' {
  interface AxiosRequestConfig {
    /** If true, do not redirect to /login on 401 for this request */
    skipAuthRedirect?: boolean;
  }
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Your API's login endpoints (adjust to your backend)
const AUTH_ENDPOINTS = ['/auth/login', '/login', '/api/auth/login'];

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const status = error?.response?.status;
    const reqUrl: string = error?.config?.url ?? '';
    const isLoginApi = AUTH_ENDPOINTS.some((p) => reqUrl.includes(p));
    const skip = Boolean(error?.config?.skipAuthRedirect);
    const isOnLoginPage =
      typeof window !== 'undefined' && window.location.pathname === '/login';

    // Redirect only when:
    // - it's a 401
    // - we're NOT calling the login API
    // - we're NOT already on the /login page
    // - the request didn't opt out via skipAuthRedirect
    if (status === 401 && typeof window !== 'undefined' && !isLoginApi && !isOnLoginPage && !skip) {
      window.location.href = '/login';
      // no return here; allow the original promise to reject for error handling if needed
    }

    return Promise.reject(error);
  }
);

type Cfg = AxiosRequestConfig;

const request = {
  get:  <T = unknown>(url: string, config?: Cfg) => axiosInstance.get<T>(url, config),
  post: <T = unknown>(url: string, data?: unknown, config?: Cfg) =>
    axiosInstance.post<T>(url, data, config),
  put:  <T = unknown>(url: string, data?: unknown, config?: Cfg) =>
    axiosInstance.put<T>(url, data, config),
  delete: <T = unknown>(url: string, config?: Cfg) =>
    axiosInstance.delete<T>(url, config),
};

export default request;