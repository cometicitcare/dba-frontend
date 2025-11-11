import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageBhikku = (body: any) => BackendClient.post(`${baseURL}/bhikkus/manage`, body);
