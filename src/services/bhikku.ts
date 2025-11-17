import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageBhikku = (body: any) => BackendClient.post(`${baseURL}/bhikkus/manage`, body);
export const _manageHighBhikku = (body: any) => BackendClient.post(`${baseURL}/bhikkus-high/manage`, body);
export const _manageSilmatha = (body: any) => BackendClient.post(`${baseURL}/silmatha-regist/manage`, body);
