import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
];

const PROTECTED_PATHS = [
  "/profile",
  "/wallet",
  "/deposit",
  "/withdraw",
  "/packages",
  "/tasks",
  "/referral",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                {
                  ...options,

                  // Session cookie
                  // Browser বন্ধ হলে cookie expire হবে
                  maxAge: undefined,
                  expires: undefined,
                }
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /*
   * =====================================================
   * ROOT /
   * =====================================================
   *
   * Login না থাকলে:
   * /
   * ↓
   * /register
   *
   * Login থাকলে:
   * /
   * ↓
   * Dashboard
   */
  if (pathname === "/") {
    if (!user) {
      const registerUrl = request.nextUrl.clone();
      registerUrl.pathname = "/register";
      registerUrl.search = "";

      return NextResponse.redirect(registerUrl);
    }

    return response;
  }

  /*
   * =====================================================
   * PROTECTED PAGES
   * =====================================================
   *
   * Login ছাড়া ঢুকতে পারবে না।
   */
  if (isProtectedPath(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.search = "";

    loginUrl.searchParams.set(
      "next",
      pathname
    );

    return NextResponse.redirect(loginUrl);
  }

  /*
   * =====================================================
   * LOGIN / REGISTRATION
   * =====================================================
   *
   * Already logged in থাকলে আবার Login বা Registration
   * page-এ যেতে পারবে না।
   */
  if (isPublicPath(pathname) && user) {
    const homeUrl = request.nextUrl.clone();

    homeUrl.pathname = "/";
    homeUrl.search = "";

    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Next.js internal files বাদ দিয়ে
     * application routes-এ middleware চলবে।
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};