import { fetchJson } from "@/shared/http.ts";
import type { PublicUser } from "@atlas/domain";
import type { AuthRepository, Credentials } from "./auth-repository.ts";

interface UserResponse {
  user: PublicUser | null;
}

export class HttpAuthRepository implements AuthRepository {
  async me(): Promise<PublicUser | null> {
    const { user } = await fetchJson<UserResponse>("/api/auth/me");
    return user;
  }

  login(credentials: Credentials): Promise<PublicUser> {
    return this.authenticate("/api/auth/login", credentials);
  }

  register(credentials: Credentials): Promise<PublicUser> {
    return this.authenticate("/api/auth/register", credentials);
  }

  async logout(): Promise<void> {
    await fetchJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  }

  private async authenticate(url: string, credentials: Credentials): Promise<PublicUser> {
    const { user } = await fetchJson<UserResponse>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!user) throw new Error("Authentication failed");
    return user;
  }
}
