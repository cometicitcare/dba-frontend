import BackendClient from './backendClient';
import { baseURL } from "../utils/config";

const logPersistent = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}${data ? ' | ' + JSON.stringify(data) : ''}`;
  console.log(logEntry);
  if (typeof window !== 'undefined') {
    const logs = JSON.parse(sessionStorage.getItem('dashboard_service_logs') || '[]');
    logs.push(logEntry);
    if (logs.length > 50) logs.shift();
    sessionStorage.setItem('dashboard_service_logs', JSON.stringify(logs));
  }
};

export const _getDashBoard = () => {
  logPersistent("[DASHBOARD_SERVICE] _getDashBoard called", { 
    url: `${baseURL}/dashboard/session` 
  });
  return BackendClient.get(`${baseURL}/dashboard/session`).then(
    (response) => {
      logPersistent("[DASHBOARD_SERVICE] Dashboard response received", { 
        status: response?.status 
      });
      return response;
    },
    (error) => {
      logPersistent("[DASHBOARD_SERVICE] Dashboard error", { 
        status: error?.response?.status,
        url: error?.config?.url 
      });
      throw error;
    }
  );
};
