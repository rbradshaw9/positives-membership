import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * lib/supabase/server.ts
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads cookies from the Next.js cookies() API.
 *
 * Must only be called from server context.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — read-only context.
            // The middleware handles session refresh in this case.
          }
        },
      },
    }
  );
}
