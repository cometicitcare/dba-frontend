import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageSecurityCouncil= (body: any) => BackendClient.post(`${baseURL}/sasanarakshana-regist-manage/manage`, body);
