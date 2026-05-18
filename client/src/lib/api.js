const normalizeBaseUrl = (url) => String(url || "").replace(/\/+$/, "");

export const getApiBaseUrl = () => {
  const baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);

  if (!baseUrl) {
    throw new Error("Missing required VITE_API_URL environment variable");
  }

  return baseUrl;
};

export const apiUrl = (path) => {
  const apiPath = String(path || "");
  if (/^https?:\/\//i.test(apiPath)) return apiPath;
  return `${getApiBaseUrl()}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
};

export const apiFetch = (path, options) => fetch(apiUrl(path), options);
