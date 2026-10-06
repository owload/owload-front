export type StrengthLevel = 1 | 2 | 3;

export interface PasswordStrength {
    level: StrengthLevel;
    label: "Weak" | "Medium" | "Strong";
    /** What to tell the user about the password; empty for a password that is fine. */
    hint: string;
}

/**
 * A rough idea of how good a password is, from its length and the kinds of characters in it. It runs on the device
 * and the password goes nowhere; it is a hint for the person typing, not a promise.
 */
export function estimatePasswordStrength(password: string): PasswordStrength {
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (classes >= 2) score++;
    if (classes >= 3) score++;

    if (password.length < 8) return { level: 1, label: "Weak", hint: "Too short. Try a phrase of several words." };
    if (score <= 1) return { level: 1, label: "Weak", hint: "Easy to guess. Try a phrase of several words." };
    if (score <= 3) return { level: 2, label: "Medium", hint: "" };
    return { level: 3, label: "Strong", hint: "" };
}
