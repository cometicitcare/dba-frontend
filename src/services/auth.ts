import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
console.log(baseURL,"baseURL")
export const _login = (body: any) => BackendClient.post(`${baseURL}/auth/login`, body);
export const _forgotPassword = (body: any) => BackendClient.post(`${baseURL}/auth/forgot-password`, body);
export const _resetPassword = (body: any) => BackendClient.post(`${baseURL}/auth/reset-password`, body);
