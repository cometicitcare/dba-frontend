import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _getDashBoard = () => BackendClient.get(`${baseURL}/dashboard/session`);
