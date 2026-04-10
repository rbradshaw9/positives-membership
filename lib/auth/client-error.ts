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

  return message;
}
