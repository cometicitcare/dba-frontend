import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageDistrict = (body: any) => BackendClient.post(`${baseURL}/district/manage`, body);
