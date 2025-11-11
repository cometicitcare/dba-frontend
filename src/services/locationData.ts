import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _getLocationData = () => BackendClient.get(`${baseURL}/locations/hierarchy`);
export const _getGnDivitions = (code: any) => BackendClient.get(`${baseURL}/locations/divisional-secretariats/${code}/gramasewaka`);
