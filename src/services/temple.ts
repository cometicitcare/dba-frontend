import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageTemple = (body: any) => BackendClient.post(`${baseURL}/vihara-data/manage`, body);
export const _listTemple = (body: any) => BackendClient.post(`${baseURL}/bhikkus/vihara-list`, body);
