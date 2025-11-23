import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageProvince = (body: any) => BackendClient.post(`${baseURL}/province/manage`, body);
