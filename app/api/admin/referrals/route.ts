import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SESSION_COOKIE_NAME =
  "pocket_money_admin_session";

const SESSION_MAX_AGE_SECONDS =
  60 * 60 * 24;

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || "";

const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

function unauthorized(
  message = "Unauthorized.",
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 401 },
  );
}

/**
 * Verify admin session.
 *
 * Current login/session token format:
 *
 * username:timestamp:signature
 *
 * The complete token is base64url encoded
 * before being stored inside the cookie.
 */
function verifyAdminSession(
  request: Request,
) {
  try {
    if (
      !ADMIN_USERNAME ||
      !ADMIN_SESSION_SECRET
    ) {
      console.error(
        "REFERRALS AUTH: ADMIN_USERNAME or ADMIN_SESSION_SECRET is missing.",
      );

      return false;
    }

    const cookieHeader =
      request.headers.get("cookie") || "";

    const cookie = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) =>
        item.startsWith(
          `${SESSION_COOKIE_NAME}=`,
        ),
      );

    if (!cookie) {
      console.error(
        "REFERRALS AUTH: Admin session cookie not found.",
      );

      return false;
    }

    const encodedToken =
      decodeURIComponent(
        cookie.substring(
          `${SESSION_COOKIE_NAME}=`.length,
        ),
      );

    if (!encodedToken) {
      console.error(
        "REFERRALS AUTH: Empty session token.",
      );

      return false;
    }

    /**
     * Decode complete base64url token.
     */
    let token: string;

    try {
      token = Buffer.from(
        encodedToken,
        "base64url",
      ).toString("utf8");
    } catch {
      console.error(
        "REFERRALS AUTH: Failed to decode session token.",
      );

      return false;
    }

    /**
     * Expected:
     *
     * username:timestamp:signature
     */
    const parts =
      token.split(":");

    if (parts.length !== 3) {
      console.error(
        "REFERRALS AUTH: Invalid token structure.",
      );

      return false;
    }

    const [
      username,
      issuedAtString,
      signature,
    ] = parts;

    if (
      !username ||
      !issuedAtString ||
      !signature
    ) {
      console.error(
        "REFERRALS AUTH: Missing token fields.",
      );

      return false;
    }

    /**
     * Username check.
     */
    if (
      username !== ADMIN_USERNAME
    ) {
      console.error(
        "REFERRALS AUTH: Username mismatch.",
      );

      return false;
    }

    /**
     * Timestamp check.
     */
    const issuedAt =
      Number(issuedAtString);

    if (
      !Number.isFinite(issuedAt)
    ) {
      console.error(
        "REFERRALS AUTH: Invalid timestamp.",
      );

      return false;
    }

    const now = Date.now();

    /**
     * Small future tolerance.
     */
    if (
      issuedAt >
      now + 60_000
    ) {
      console.error(
        "REFERRALS AUTH: Token timestamp is in the future.",
      );

      return false;
    }

    /**
     * 24 hour expiry.
     */
    const ageSeconds =
      (now - issuedAt) / 1000;

    if (
      ageSeconds >
      SESSION_MAX_AGE_SECONDS
    ) {
      console.error(
        "REFERRALS AUTH: Session expired.",
      );

      return false;
    }

    if (ageSeconds < 0) {
      console.error(
        "REFERRALS AUTH: Invalid session age.",
      );

      return false;
    }

    /**
     * Same payload used by login.
     */
    const payload =
      `${username}:${issuedAtString}`;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          ADMIN_SESSION_SECRET,
        )
        .update(payload)
        .digest("base64url");

    const providedBuffer =
      Buffer.from(
        signature,
        "utf8",
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8",
      );

    if (
      providedBuffer.length !==
      expectedBuffer.length
    ) {
      console.error(
        "REFERRALS AUTH: Signature length mismatch.",
      );

      return false;
    }

    if (
      !crypto.timingSafeEqual(
        providedBuffer,
        expectedBuffer,
      )
    ) {
      console.error(
        "REFERRALS AUTH: Signature mismatch.",
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "REFERRALS AUTH VERIFY ERROR:",
      error,
    );

    return false;
  }
}

export async function GET(
  request: Request,
) {
  try {
    /**
     * ADMIN AUTH
     */
    if (
      !verifyAdminSession(request)
    ) {
      return unauthorized();
    }

    const { searchParams } =
      new URL(request.url);

    const search = (
      searchParams.get(
        "search",
      ) || ""
    )
      .trim()
      .toLowerCase();

    const status =
      searchParams.get(
        "status",
      ) || "all";

    const limitParam =
      Number(
        searchParams.get(
          "limit",
        ) || "100",
      );

    const limit =
      Number.isFinite(
        limitParam,
      ) &&
      limitParam > 0 &&
      limitParam <= 500
        ? Math.floor(
            limitParam,
          )
        : 100;

    /**
     * Load referral records.
     */
    let query = supabaseAdmin
      .from("referrals")
      .select(
        `
          id,
          referrer_id,
          referred_user_id,
          referral_code,
          status,
          qualified_at,
          created_at
        `,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(limit);

    if (
      status !== "all"
    ) {
      query = query.eq(
        "status",
        status,
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "ADMIN REFERRALS GET ERROR:",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        { status: 500 },
      );
    }

    const referrals =
      data || [];

    /**
     * Collect all user IDs.
     */
    const userIds = [
      ...new Set(
        referrals.flatMap(
          (item) =>
            [
              item.referrer_id,
              item.referred_user_id,
            ].filter(Boolean),
        ),
      ),
    ];

    /**
     * Load profiles.
     */
    const {
      data: profiles,
      error:
        profilesError,
    } =
      userIds.length
        ? await supabaseAdmin
            .from("profiles")
            .select(
              `
                id,
                username,
                full_name,
                phone,
                referral_code,
                created_at
              `,
            )
            .in(
              "id",
              userIds,
            )
        : {
            data: [],
            error: null,
          };

    if (
      profilesError
    ) {
      console.error(
        "ADMIN REFERRALS PROFILE ERROR:",
        profilesError,
      );
    }

    /**
     * Profile map.
     */
    const profileMap =
      new Map(
        (profiles || []).map(
          (profile) => [
            profile.id,
            profile,
          ],
        ),
      );

    /**
     * Attach referrer and referred
     * user information.
     */
    let result =
      referrals.map(
        (referral) => ({
          ...referral,

          referrer:
            profileMap.get(
              referral.referrer_id,
            ) || null,

          referred:
            profileMap.get(
              referral.referred_user_id,
            ) || null,
        }),
      );

    /**
     * Search.
     */
    if (search) {
      result =
        result.filter(
          (referral) => {
            const referrer =
              referral.referrer;

            const referred =
              referral.referred;

            return (
              String(
                referral.id ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referral.referral_code ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referral.status ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referral.referrer_id ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referral.referred_user_id ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referrer?.full_name ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referrer?.username ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referrer?.phone ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referred?.full_name ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referred?.username ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                referred?.phone ??
                  "",
              )
                .toLowerCase()
                .includes(search)
            );
          },
        );
    }

    /**
     * Summary.
     */
    const total =
      result.length;

    const qualified =
      result.filter(
        (item) =>
          item.status ===
          "qualified",
      ).length;

    const pending =
      result.filter(
        (item) =>
          item.status ===
          "pending",
      ).length;

    const other =
      result.filter(
        (item) =>
          item.status !==
            "qualified" &&
          item.status !==
            "pending",
      ).length;

    const uniqueReferrers =
      new Set(
        result
          .map(
            (item) =>
              item.referrer_id,
          )
          .filter(Boolean),
      ).size;

    const uniqueReferredUsers =
      new Set(
        result
          .map(
            (item) =>
              item.referred_user_id,
          )
          .filter(Boolean),
      ).size;

    /**
     * All available statuses.
     */
    const statuses = [
      ...new Set(
        referrals
          .map(
            (item) =>
              item.status,
          )
          .filter(Boolean),
      ),
    ].sort();

    return NextResponse.json({
      success: true,

      referrals:
        result,

      summary: {
        total,
        qualified,
        pending,
        other,
        uniqueReferrers,
        uniqueReferredUsers,
      },

      statuses,
    });
  } catch (error) {
    console.error(
      "ADMIN REFERRALS API ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      { status: 500 },
    );
  }
}