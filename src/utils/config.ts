type Environment = "LOCAL" | "DEVELOP" | "PRODUCTION";

const environment = "DEVELOP" as Environment;

export const baseURL: string | undefined =
  environment === "LOCAL"
    ? process.env.NEXT_PUBLIC_BASE_URL_LOCAL
    : environment === "DEVELOP"
    ? process.env.NEXT_PUBLIC_BASE_URL_DEV
    : process.env.NEXT_PUBLIC_BASE_URL;

export const BHIKKU_MANAGEMENT_DEPARTMENT = "Bhikku Management";
// export const BHIKKU_MANAGEMENT_DEPARTMENT = "Silmatha Management";
export const SILMATHA_MANAGEMENT_DEPARTMENT = "Silmatha Management";
export const VIHARA_MANAGEMENT_DEPARTMENT = "Vihara Department";

export const ADMIN_ROLE_LEVEL = 'ADMIN';
