import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageCategory = (body: any) => BackendClient.post(`${baseURL}/bhikku-category/manage`, body);
