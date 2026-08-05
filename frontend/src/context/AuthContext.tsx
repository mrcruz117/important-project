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
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
};

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

    const login = async (
        username: string,
        password: string
    ) => {
        try {
            const response = await fetch(
                "http://localhost:8000/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username,
                        password,
                    }),
                }
            );

            if (!response.ok) {
                return false;
            }

            const data = await response.json();

            localStorage.setItem(
                "token",
                data.access_token
            );

            const payload = JSON.parse(
                atob(data.access_token.split(".")[1])
            );

            setToken(data.access_token);

            setUser({
                username: payload.sub,
                role: payload.role,
            });

            return true;
        } catch {
            return false;
        }
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