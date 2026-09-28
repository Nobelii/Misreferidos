import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/app";

  const supabase = await createClient();

  // PKCE / OAuth flow: exchange the auth code for a session.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
    redirect(`/auth/error?error=${error?.message}`);
  }

  // Email confirmation / magic link flow: verify the token hash.
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
    redirect(`/auth/error?error=${error?.message}`);
  }

  // Nothing to process (e.g. implicit-flow tokens arrived in the URL hash,
  // which the server can't read). Send the user to log in.
  redirect("/auth/login");
}
