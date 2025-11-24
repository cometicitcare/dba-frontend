import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _searchId = (body: any) => BackendClient.post(`${baseURL}/reprint`, body);
