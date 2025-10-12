type Environment = "LOCAL" | "DEVELOP" | "PRODUCTION";

const environment = "DEVELOP" as Environment;

export const baseURL: string | undefined =
  environment === "LOCAL"
    ? process.env.NEXT_PUBLIC_BASE_URL_LOCAL
    : environment === "DEVELOP"
    ? process.env.NEXT_PUBLIC_BASE_URL_DEV
    : process.env.NEXT_PUBLIC_BASE_URL;
