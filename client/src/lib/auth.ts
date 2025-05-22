import { apiRequest } from "./queryClient";

interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  try {
    console.log(`Attempting login API request for ${username}`);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Login failed: ${response.status} - ${errorText}`);
      throw new Error(`Login failed: ${response.status}`);
    }
    
    const responseText = await response.text();
    console.log("Login response:", responseText);
    
    const data = JSON.parse(responseText);
    
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    return data.user;
  } catch (error) {
    console.error("Error in login function:", error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = localStorage.getItem("token");
  
  if (!token) {
    return null;
  }
  
  try {
    const response = await apiRequest("GET", "/api/auth/me");
    const user: AuthUser = await response.json();
    return user;
  } catch (error) {
    // If there's an error (e.g., token expired), clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  const userJson = localStorage.getItem("user");
  
  if (!userJson) {
    return null;
  }
  
  try {
    return JSON.parse(userJson) as AuthUser;
  } catch (error) {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}
