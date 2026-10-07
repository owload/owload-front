/** The photo of the account; the identity provider's own picture is not loaded (it is a link to another site). */
export const AVATAR_SRC = "/ava.jpg";

/** Up to two capital letters of a name, for the circle shown while there is no photo. */
export function accountInitials(name: string): string {
    const letters = name.split(/[\s._@-]+/).filter(Boolean).map((part) => part[0].toUpperCase());
    return (letters.length > 1 ? letters[0] + letters[1] : letters[0] ?? "?").slice(0, 2);
}
