import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageVihara = (body: any) => BackendClient.post(`${baseURL}/vihara-data/manage`, body);
