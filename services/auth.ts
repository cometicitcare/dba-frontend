import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
console.log(baseURL,"baseURL")
export const _login = (body: any) => BackendClient.post(`${baseURL}/auth/login`, body);
