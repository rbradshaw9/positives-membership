export function formatSupabaseAuthError(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password. Try the email link option if you've forgotten your password.";
  }

  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("rate limit exceeded") ||
    normalized.includes("after 60 seconds")
  ) {
    return "We just sent you a link. Please wait a minute before requesting another.";
  }

  if (normalized.includes("unexpected status code returned from hook")) {
    return "Email link sign-in is temporarily unavailable. Please use password sign-in for now, or contact support if you have not set a password yet.";
  }

  return message;
}
