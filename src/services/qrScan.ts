import BackendClient from "./backendClient";
import { baseURL } from "../utils/config";

export const _getDetailsByQr = <T = unknown>(body: any) =>
  BackendClient.post<T>(`${baseURL}/qr_search`, body);
