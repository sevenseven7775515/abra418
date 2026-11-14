export const ALLOWED_EMAIL = "sevenseven7775515@gmail.com";
export const isAllowedEmail = (email?: string | null) =>
  (email ?? "").trim().toLowerCase() === ALLOWED_EMAIL;
