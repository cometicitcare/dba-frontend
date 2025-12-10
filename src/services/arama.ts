import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _aramaManage = (body: any) => BackendClient.post(`${baseURL}/silmatha-regist/arama-list`, body);
