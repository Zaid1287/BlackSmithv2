import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", {
      username,
      password,
    });
    const data = await response.json();
    
    // Store token in localStorage
    localStorage.setItem("auth_token", data.token);
    
    return data;
  },

  async logout(): Promise<void> {
    localStorage.removeItem("auth_token");
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem("auth_token");
    if (!token) return null;

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        localStorage.removeItem("auth_token");
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      localStorage.removeItem("auth_token");
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem("auth_token");
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

// Add token to API requests
export function getAuthHeaders(): Record<string, string> {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
