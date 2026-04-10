import type { Metadata } from "next";
import { ForgotPasswordClient } from "./forgot-password-client";

export const metadata: Metadata = {
  title: "Forgot Password — Positives",
  description: "Send yourself a secure reset link to update your Positives password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
