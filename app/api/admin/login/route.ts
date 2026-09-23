import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE_NAME =
  "pocket_money_admin_session";

const SESSION_MAX_AGE_SECONDS =
  60 * 60 * 24;

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || "";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "";

const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "";

function safeCompare(
  valueA: string,
  valueB: string,
): boolean {
  const bufferA = Buffer.from(
    valueA,
    "utf8",
  );

  const bufferB = Buffer.from(
    valueB,
    "utf8",
  );

  if (
    bufferA.length !==
    bufferB.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    bufferA,
    bufferB,
  );
}

function createSessionToken(
  username: string,
  issuedAt: string,
): string {
  const signature =
    crypto
      .createHmac(
        "sha256",
        ADMIN_SESSION_SECRET,
      )
      .update(
        `${username}:${issuedAt}`,
      )
      .digest("base64url");

  const rawToken =
    `${username}:${issuedAt}:${signature}`;

  return Buffer.from(
    rawToken,
    "utf8",
  ).toString("base64url");
}

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * =========================================
     * ENVIRONMENT CHECK
     * =========================================
     */

    if (
      !ADMIN_USERNAME ||
      !ADMIN_PASSWORD ||
      !ADMIN_SESSION_SECRET
    ) {
      console.error(
        "ADMIN_USERNAME, ADMIN_PASSWORD or ADMIN_SESSION_SECRET is missing.",
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authentication configuration is missing.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * =========================================
     * READ LOGIN DATA
     * =========================================
     */

    const body =
      await request.json();

    const username =
      typeof body?.username ===
      "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body?.password ===
      "string"
        ? body.password
        : "";

    if (
      !username ||
      !password
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Username and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * =========================================
     * VERIFY USERNAME + PASSWORD
     * =========================================
     */

    const usernameValid =
      safeCompare(
        username,
        ADMIN_USERNAME,
      );

    const passwordValid =
      safeCompare(
        password,
        ADMIN_PASSWORD,
      );

    if (
      !usernameValid ||
      !passwordValid
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid admin username or password.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * =========================================
     * CREATE SESSION
     * =========================================
     */

    const issuedAt =
      Date.now().toString();

    const sessionToken =
      createSessionToken(
        ADMIN_USERNAME,
        issuedAt,
      );

    /*
     * =========================================
     * SET HTTP-ONLY COOKIE
     * =========================================
     */

    const response =
      NextResponse.json(
        {
          success: true,
          authenticated: true,
          username:
            ADMIN_USERNAME,
          message:
            "Admin login successful.",
        },
        {
          status: 200,
        },
      );

    response.cookies.set({
      name:
        SESSION_COOKIE_NAME,

      value:
        sessionToken,

      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      maxAge:
        SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error(
      "ADMIN LOGIN ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Admin login failed.",
      },
      {
        status: 500,
      },
    );
  }
}