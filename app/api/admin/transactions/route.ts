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

function unauthorized(message = "Unauthorized.") {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 401 },
  );
}

/**
 * Verify the same admin session format used by
 * /api/admin/login and /api/admin/session.
 *
 * Token structure before encoding:
 *
 * username:timestamp:signature
 *
 * The complete token is then base64url encoded.
 */
function verifyAdminSession(request: Request) {
  try {
    if (
      !ADMIN_USERNAME ||
      !ADMIN_SESSION_SECRET
    ) {
      console.error(
        "TRANSACTIONS AUTH: ADMIN_USERNAME or ADMIN_SESSION_SECRET is missing.",
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
        "TRANSACTIONS AUTH: Admin session cookie not found.",
      );

      return false;
    }

    const encodedToken = decodeURIComponent(
      cookie.substring(
        `${SESSION_COOKIE_NAME}=`.length,
      ),
    );

    if (!encodedToken) {
      console.error(
        "TRANSACTIONS AUTH: Empty session token.",
      );

      return false;
    }

    /**
     * Decode the whole base64url token.
     */
    let token: string;

    try {
      token = Buffer.from(
        encodedToken,
        "base64url",
      ).toString("utf8");
    } catch {
      console.error(
        "TRANSACTIONS AUTH: Failed to decode session token.",
      );

      return false;
    }

    /**
     * Expected:
     * username:timestamp:signature
     */
    const parts = token.split(":");

    if (parts.length !== 3) {
      console.error(
        "TRANSACTIONS AUTH: Invalid token structure.",
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
        "TRANSACTIONS AUTH: Missing token fields.",
      );

      return false;
    }

    /**
     * Verify username.
     */
    if (username !== ADMIN_USERNAME) {
      console.error(
        "TRANSACTIONS AUTH: Username mismatch.",
      );

      return false;
    }

    /**
     * Verify timestamp.
     */
    const issuedAt = Number(
      issuedAtString,
    );

    if (!Number.isFinite(issuedAt)) {
      console.error(
        "TRANSACTIONS AUTH: Invalid timestamp.",
      );

      return false;
    }

    const now = Date.now();

    /**
     * Prevent future-dated tokens.
     */
    if (issuedAt > now + 60_000) {
      console.error(
        "TRANSACTIONS AUTH: Token timestamp is in the future.",
      );

      return false;
    }

    /**
     * 24 hour session expiry.
     */
    const ageSeconds =
      (now - issuedAt) / 1000;

    if (
      ageSeconds >
      SESSION_MAX_AGE_SECONDS
    ) {
      console.error(
        "TRANSACTIONS AUTH: Session expired.",
      );

      return false;
    }

    if (ageSeconds < 0) {
      console.error(
        "TRANSACTIONS AUTH: Invalid session age.",
      );

      return false;
    }

    /**
     * Same payload used by admin login:
     *
     * username:issuedAt
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

    /**
     * timingSafeEqual requires equal-length
     * buffers.
     */
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
        "TRANSACTIONS AUTH: Signature length mismatch.",
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
        "TRANSACTIONS AUTH: Signature mismatch.",
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "TRANSACTIONS AUTH VERIFY ERROR:",
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
    if (!verifyAdminSession(request)) {
      return unauthorized();
    }

    const { searchParams } =
      new URL(request.url);

    const type =
      searchParams.get("type") || "all";

    const search = (
      searchParams.get("search") || ""
    )
      .trim()
      .toLowerCase();

    const limitParam = Number(
      searchParams.get("limit") || "100",
    );

    const limit =
      Number.isFinite(limitParam) &&
      limitParam > 0 &&
      limitParam <= 500
        ? Math.floor(limitParam)
        : 100;

    /**
     * LOAD WALLET LEDGER
     */
    let query = supabaseAdmin
      .from("wallet_ledger")
      .select(
        `
          id,
          user_id,
          type,
          amount
        `,
      )
      .order("id", {
        ascending: false,
      })
      .limit(limit);

    if (type !== "all") {
      query = query.eq(
        "type",
        type,
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "ADMIN TRANSACTIONS GET ERROR:",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    const transactions =
      data || [];

    /**
     * LOAD UNIQUE USERS
     */
    const userIds = [
      ...new Set(
        transactions
          .map(
            (item) =>
              item.user_id,
          )
          .filter(Boolean),
      ),
    ];

    const {
      data: profiles,
      error: profilesError,
    } =
      userIds.length
        ? await supabaseAdmin
            .from("profiles")
            .select(
              `
                id,
                username,
                full_name,
                phone
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

    if (profilesError) {
      console.error(
        "ADMIN TRANSACTIONS PROFILE ERROR:",
        profilesError,
      );
    }

    /**
     * PROFILE MAP
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
     * ADD USER DATA
     */
    let result =
      transactions.map(
        (transaction) => ({
          ...transaction,

          amount:
            Number(
              transaction.amount ||
                0,
            ),

          user:
            profileMap.get(
              transaction.user_id,
            ) || null,
        }),
      );

    /**
     * SEARCH
     */
    if (search) {
      result =
        result.filter(
          (transaction) => {
            const user =
              transaction.user;

            return (
              String(
                transaction.id ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                transaction.user_id ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                transaction.type ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                user?.full_name ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                user?.username ??
                  "",
              )
                .toLowerCase()
                .includes(search) ||

              String(
                user?.phone ??
                  "",
              )
                .toLowerCase()
                .includes(search)
            );
          },
        );
    }

    /**
     * SUMMARY
     */
    const totalAmount =
      result.reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.amount ||
              0,
          ),
        0,
      );

    const creditAmount =
      result
        .filter(
          (item) =>
            Number(
              item.amount,
            ) > 0,
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.amount ||
                0,
            ),
          0,
        );

    const debitAmount =
      result
        .filter(
          (item) =>
            Number(
              item.amount,
            ) < 0,
        )
        .reduce(
          (sum, item) =>
            sum +
            Math.abs(
              Number(
                item.amount ||
                  0,
              ),
            ),
          0,
        );

    const uniqueUsers =
      new Set(
        result.map(
          (item) =>
            item.user_id,
        ),
      ).size;

    /**
     * AVAILABLE TRANSACTION TYPES
     *
     * Use all loaded transactions for
     * filter options, not only searched results.
     */
    const types = [
      ...new Set(
        transactions
          .map(
            (item) =>
              item.type,
          )
          .filter(Boolean),
      ),
    ].sort();

    return NextResponse.json({
      success: true,

      transactions:
        result,

      summary: {
        total:
          result.length,

        totalAmount:
          Number(
            totalAmount.toFixed(2),
          ),

        creditAmount:
          Number(
            creditAmount.toFixed(2),
          ),

        debitAmount:
          Number(
            debitAmount.toFixed(2),
          ),

        uniqueUsers:
          Number(
            uniqueUsers,
          ),
      },

      types,
    });
  } catch (error) {
    console.error(
      "ADMIN TRANSACTIONS API ERROR:",
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