const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return null;
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data?.error?.message || "API Error");
  }
  return data;
};
