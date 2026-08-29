import type { PublicUser } from "@atlas/domain";
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Credentials } from "./repositories/auth-repository.ts";
import { HttpAuthRepository } from "./repositories/http-auth-repository.ts";
import { HttpProfileRepository } from "./repositories/http-profile-repository.ts";
import type { PreferencesInput } from "./repositories/profile-repository.ts";
import {
  deleteProfileImage as deleteProfileImageUseCase,
  uploadProfileImage as uploadProfileImageUseCase,
} from "./use-cases/profile-image.ts";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  profileImageUrl: string | null;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (input: PreferencesInput) => Promise<void>;
  uploadProfileImage: (image: File) => Promise<void>;
  deleteProfileImage: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  retry: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function profileImageUrl(user: PublicUser, revision?: string): string {
  const query = new URLSearchParams({ revision: revision ?? user.id });
  return `/api/profile/image?${query.toString()}`;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [authRepository] = useState(() => new HttpAuthRepository());
  const [profileRepository] = useState(() => new HttpProfileRepository());
  const [user, setUser] = useState<PublicUser | null>(null);
  const [currentProfileImageUrl, setCurrentProfileImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const loadSession = useCallback(async () => {
    setStatus("loading");
    try {
      const current = await authRepository.me();
      setUser(current);
      setCurrentProfileImageUrl(current ? profileImageUrl(current) : null);
      setStatus(current ? "authenticated" : "anonymous");
    } catch (caught) {
      console.error("Failed to load session", caught);
      setStatus("error");
    }
  }, [authRepository]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (credentials: Credentials) => {
      const current = await authRepository.login(credentials);
      setUser(current);
      setCurrentProfileImageUrl(profileImageUrl(current));
      setStatus("authenticated");
    },
    [authRepository],
  );

  const register = useCallback(
    async (credentials: Credentials) => {
      const current = await authRepository.register(credentials);
      setUser(current);
      setCurrentProfileImageUrl(profileImageUrl(current));
      setStatus("authenticated");
    },
    [authRepository],
  );

  const logout = useCallback(async () => {
    await authRepository.logout();
    setUser(null);
    setCurrentProfileImageUrl(null);
    setStatus("anonymous");
  }, [authRepository]);

  const updatePreferences = useCallback(
    async (input: PreferencesInput) => {
      const profile = await profileRepository.updatePreferences(input);
      setUser((previous) => (previous ? { ...previous, profile } : previous));
    },
    [profileRepository],
  );

  const uploadProfileImage = useCallback(
    async (image: File) => {
      if (!user) throw new Error("Authentication required");
      await uploadProfileImageUseCase(profileRepository, image);
      setCurrentProfileImageUrl(profileImageUrl(user, crypto.randomUUID()));
    },
    [profileRepository, user],
  );

  const deleteProfileImage = useCallback(async () => {
    if (!user) throw new Error("Authentication required");
    await deleteProfileImageUseCase(profileRepository);
    setCurrentProfileImageUrl(null);
  }, [profileRepository, user]);

  const verifyEmail = useCallback(
    async (token: string) => {
      await authRepository.verifyEmail(token);
    },
    [authRepository],
  );

  const resendVerification = useCallback(async () => {
    if (!user) return;
    await authRepository.resendVerification(user.email);
  }, [authRepository, user]);

  const value = useMemo(
    () => ({
      status,
      user,
      profileImageUrl: currentProfileImageUrl,
      login,
      register,
      logout,
      updatePreferences,
      uploadProfileImage,
      deleteProfileImage,
      verifyEmail,
      resendVerification,
      retry: loadSession,
    }),
    [
      status,
      user,
      currentProfileImageUrl,
      login,
      register,
      logout,
      updatePreferences,
      uploadProfileImage,
      deleteProfileImage,
      verifyEmail,
      resendVerification,
      loadSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthContext is not available");
  return value;
}
