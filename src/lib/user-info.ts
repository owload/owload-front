import type { UserInfo } from "@/types/types";

/**
 * What the page of the profile shows about the user, taken from the claims of the sign-in token. The photo is not
 * taken from the token: it is a link to another site, which the client does not load.
 */
export function userInfoFromClaims(claims: { sub: string; preferred_username: string } & Record<string, unknown>): UserInfo {
  const text = (value: unknown) => (typeof value === "string" && value !== "" ? value : undefined);
  return {
    id: claims.sub,
    name: claims.preferred_username,
    fullName: text(claims.name),
    email: text(claims.email),
    emailVerified: typeof claims.email_verified === "boolean" ? claims.email_verified : undefined,
  };
}
