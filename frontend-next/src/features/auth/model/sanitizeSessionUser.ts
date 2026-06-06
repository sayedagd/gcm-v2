import type { User } from "@/types";

type SessionUser = User & {
  tokenExpiresAt?: number;
  tokenExpiresInSeconds?: number;
};

export const sanitizeSessionUser = <T extends SessionUser>(user: T): T => {
  const safeUser = { ...user } as SessionUser;

  delete safeUser.password;
  delete safeUser.token;
  delete safeUser.tokenExpiresAt;
  delete safeUser.tokenExpiresInSeconds;

  return safeUser as T;
};
