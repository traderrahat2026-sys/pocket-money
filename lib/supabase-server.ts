import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(name, value, {
                  ...options,

                  // Browser বন্ধ করলে session cookie শেষ হবে
                  maxAge: undefined,
                  expires: undefined,
                });
              }
            );
          } catch {
            // Middleware / Server Component context
            // যেখানে cookie set করা যায় না, সেখানে ignore করা হবে।
          }
        },
      },
    }
  );
}