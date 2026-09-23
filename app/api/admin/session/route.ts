import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE_NAME =
  "pocket_money_admin_session";

const SESSION_MAX_AGE_SECONDS =
  60 * 60 * 24;

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || "";

const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "";

type AdminSession = {
  username: string;
  issuedAt: number;
};

function clearSessionCookie(
  response: NextResponse,
) {
  response.cookies.set({
    name:
      SESSION_COOKIE_NAME,

    value: "",

    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite: "lax",

    path: "/",

    maxAge: 0,
  });

  return response;
}

function verifySessionToken(
  token: string,
): AdminSession | null {
  if (
    !ADMIN_USERNAME ||
    !ADMIN_SESSION_SECRET
  ) {
    console.error(
      "Admin session environment variables are missing.",
    );

    return null;
  }

  try {
    const decoded =
      Buffer.from(
        token,
        "base64url",
      ).toString("utf8");

    const parts =
      decoded.split(":");

    if (
      parts.length !== 3
    ) {
      return null;
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
      return null;
    }

    /*
     * =========================================
     * USERNAME CHECK
     * =========================================
     */

    if (
      username !==
      ADMIN_USERNAME
    ) {
      return null;
    }

    /*
     * =========================================
     * TIMESTAMP CHECK
     * =========================================
     */

    const issuedAt =
      Number(issuedAtString);

    if (
      !Number.isFinite(
        issuedAt,
      )
    ) {
      return null;
    }

    const now =
      Date.now();

    if (
      issuedAt >
      now + 60 * 1000
    ) {
      return null;
    }

    if (
      now - issuedAt >
      SESSION_MAX_AGE_SECONDS *
        1000
    ) {
      return null;
    }

    /*
     * =========================================
     * SIGNATURE CHECK
     * =========================================
     */

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          ADMIN_SESSION_SECRET,
        )
        .update(
          `${username}:${issuedAtString}`,
        )
        .digest("base64url");

    const receivedBuffer =
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
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    const validSignature =
      crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer,
      );

    if (!validSignature) {
      return null;
    }

    return {
      username,
      issuedAt,
    };
  } catch (error) {
    console.error(
      "ADMIN TOKEN VERIFY ERROR:",
      error,
    );

    return null;
  }
}

function getSessionFromRequest(
  request: NextRequest,
): AdminSession | null {
  const token =
    request.cookies.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(
    token,
  );
}

export async function GET(
  request: NextRequest,
) {
  try {
    /*
     * =========================================
     * VERIFY SESSION
     * =========================================
     */

    const session =
      getSessionFromRequest(
        request,
      );

    if (!session) {
      const response =
        NextResponse.json(
          {
            authenticated:
              false,

            error:
              "Admin session পাওয়া যায়নি বা বৈধ নয়।",
          },
          {
            status: 401,
          },
        );

      return clearSessionCookie(
        response,
      );
    }

    /*
     * =========================================
     * SUCCESS
     * =========================================
     */

    return NextResponse.json(
      {
        authenticated:
          true,

        username:
          session.username,

        issuedAt:
          session.issuedAt,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error(
      "ADMIN SESSION ERROR:",
      error,
    );

    const response =
      NextResponse.json(
        {
          authenticated:
            false,

          error:
            "Admin session verification failed.",
        },
        {
          status: 500,
        },
      );

    return clearSessionCookie(
      response,
    );
  }
}