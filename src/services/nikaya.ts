import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _getNikayaAndParshawa = () => BackendClient.get(`${baseURL}/bhikkus/nikaya-hierarchy`);
