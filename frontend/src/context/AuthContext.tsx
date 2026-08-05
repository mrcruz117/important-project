import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

type UserRole = "admin" | "user" | "read-only";

type User = {
  username: string;
  role: UserRole;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const USERS = [
  {
    username: "mcruz",
    password: "admin123",
    role: "admin" as const,
  },
  {
    username: "acheebez",
    password: "user123",
    role: "user" as const,
  },
  {
    username: "gfrango",
    password: "user123",
    role: "user" as const,
  },
  {
    username: "bingus",
    password: "readonly123",
    role: "read-only" as const,
  },
];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");

    if (!savedToken) return;

    try {
      const payload = JSON.parse(atob(savedToken));

      setToken(savedToken);
      setUser({
        username: payload.sub,
        role: payload.role,
      });
    } catch {
      localStorage.removeItem("token");
    }
  }, []);

  const login = (
    username: string,
    password: string
  ) => {
    const foundUser = USERS.find(
      (user) =>
        user.username === username &&
        user.password === password
    );

    if (!foundUser) {
      return false;
    }

    /*
      REAL JWT FLOW LATER

      POST /auth/login

      body:
      {
        username,
        password
      }

      response:
      {
        access_token: "eyJ..."
      }
    */

    const fakeToken = btoa(
      JSON.stringify({
        sub: foundUser.username,
        role: foundUser.role,
      })
    );

    localStorage.setItem("token", fakeToken);

    setToken(fakeToken);

    setUser({
      username: foundUser.username,
      role: foundUser.role,
    });

    return true;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}