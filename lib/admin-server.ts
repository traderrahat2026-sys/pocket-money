import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "pocket_money_admin_session";
const MAX_AGE = 24 * 60 * 60;

export async function verifyAdminSession() {
  const username = process.env.ADMIN_USERNAME;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!username || !secret) {
    return null;
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);

  if (!cookie?.value) {
    return null;
  }

  try {
    const [encodedPayload, signature] =
      cookie.value.split(".");

    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = createHmac(
      "sha256",
      secret
    )
      .update(encodedPayload)
      .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);

    if (
      a.length !== b.length ||
      !timingSafeEqual(a, b)
    ) {
      return null;
    }

    const payload = Buffer.from(
      encodedPayload,
      "base64url"
    ).toString("utf8");

    const [storedUsername, issuedAtText] =
      payload.split(":");

    const issuedAt = Number(issuedAtText);

    if (storedUsername !== username) {
      return null;
    }

    if (!Number.isFinite(issuedAt)) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    if (issuedAt > now) {
      return null;
    }

    if (now - issuedAt > MAX_AGE) {
      return null;
    }

    return {
      username: storedUsername,
    };
  } catch (error) {
    console.error(
      "ADMIN SESSION VERIFY ERROR:",
      error
    );

    return null;
  }
}


export function getAdminSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing"
    );
  }

  if (!serviceRole) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing"
    );
  }

  return createClient(
    url,
    serviceRole,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}