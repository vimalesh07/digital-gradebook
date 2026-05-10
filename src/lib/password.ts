import { z } from "zod";

export const PASSWORD_REQUIREMENT =
  "Password cannot be an obvious sequence like 12345 or abcde";

const hasSequentialRun = (value: string) => {
  const normalized = value.toLowerCase();

  for (let index = 0; index <= normalized.length - 5; index += 1) {
    const chars = normalized.slice(index, index + 5);
    const codes = [...chars].map((char) => char.charCodeAt(0));
    const isDigits = chars.split("").every((char) => /[0-9]/.test(char));
    const isLetters = chars.split("").every((char) => /[a-z]/.test(char));

    if (!isDigits && !isLetters) continue;

    const ascending = codes.every((code, offset) => offset === 0 || code === codes[offset - 1] + 1);
    const descending = codes.every((code, offset) => offset === 0 || code === codes[offset - 1] - 1);

    if (ascending || descending) return true;
  }

  return false;
};

export const passwordSchema = z
  .string()
  .min(1, "Password required")
  .refine((value) => !hasSequentialRun(value), PASSWORD_REQUIREMENT);
