import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageBhikkuStatus= (body: any) => BackendClient.post(`${baseURL}/status/manage`, body);
