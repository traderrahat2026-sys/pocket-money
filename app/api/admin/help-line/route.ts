import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "pocket_money_admin_session";

const MAX_AGE =
  7 * 24 * 60 * 60 * 1000;

function verifyAdminSession(
  request: NextRequest
) {
  const token = request.cookies.get(
    COOKIE_NAME
  )?.value;

  if (!token) {
    return false;
  }

  try {
    const decoded = Buffer.from(
      token,
      "base64url"
    ).toString("utf8");

    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return false;
    }

    const [
      username,
      timestampText,
      signature,
    ] = parts;

    const timestamp = Number(timestampText);

    if (
      !username ||
      !timestamp ||
      !signature
    ) {
      return false;
    }

    if (
      Date.now() - timestamp >
      MAX_AGE
    ) {
      return false;
    }

    const secret =
      process.env.ADMIN_SESSION_SECRET;

    if (!secret) {
      return false;
    }

    const payload =
      `${username}:${timestamp}`;

    const expectedSignature =
      crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64url");

    const signatureBuffer =
      Buffer.from(signature);

    const expectedBuffer =
      Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      signatureBuffer,
      expectedBuffer
    );
  } catch {
    return false;
  }
}

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin configuration missing"
    );
  }

  return createClient(
    url,
    serviceRoleKey
  );
}

const SETTINGS = [
  "help_first_admin_url",
  "help_second_admin_url",
  "help_third_admin_url",
  "help_telegram_channel_url",
] as const;

function normalizeUsername(
  value: unknown
) {
  let username = String(
    value ?? ""
  ).trim();

  if (!username) {
    return "";
  }

  // যদি https://t.me/username দেওয়া হয়,
  // সেটাকেও username হিসেবে convert করবে।
  username = username
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^https?:\/\/telegram\.me\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();

  return username
    ? `@${username}`
    : "";
}

function normalizeChannelUrl(
  value: unknown
) {
  const url = String(
    value ?? ""
  ).trim();

  if (!url) {
    return "";
  }

  return url;
}

export async function GET(
  request: NextRequest
) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const supabase =
      getSupabaseAdmin();

    const {
      data,
      error,
    } = await supabase
      .from("admin_settings")
      .select(
        "setting_key, setting_value"
      )
      .in(
        "setting_key",
        SETTINGS
      );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const values: Record<
      string,
      string
    > = {};

    for (const item of data || []) {
      values[item.setting_key] =
        item.setting_value || "";
    }

    return NextResponse.json({
      success: true,
      data: {
        firstAdminUrl:
          values.help_first_admin_url ||
          "",

        secondAdminUrl:
          values.help_second_admin_url ||
          "",

        thirdAdminUrl:
          values.help_third_admin_url ||
          "",

        telegramChannelUrl:
          values.help_telegram_channel_url ||
          "",
      },
    });
  } catch (error) {
    console.error(
      "Admin help GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "তথ্য লোড করা যায়নি",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const body =
      await request.json();

    const firstAdminUsername =
      normalizeUsername(
        body.firstAdminUrl
      );

    const secondAdminUsername =
      normalizeUsername(
        body.secondAdminUrl
      );

    const thirdAdminUsername =
      normalizeUsername(
        body.thirdAdminUrl
      );

    const telegramChannelUrl =
      normalizeChannelUrl(
        body.telegramChannelUrl
      );

    // Username validation
    const usernameRegex =
      /^@[A-Za-z0-9_]{5,32}$/;

    const usernames = [
      firstAdminUsername,
      secondAdminUsername,
      thirdAdminUsername,
    ];

    for (const username of usernames) {
      if (
        username &&
        !usernameRegex.test(username)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Admin Username সঠিক নয়। উদাহরণ: @poket_money_ADMIN",
          },
          {
            status: 400,
          }
        );
      }
    }

    // Channel URL validation
    if (telegramChannelUrl) {
      try {
        const parsed =
          new URL(
            telegramChannelUrl
          );

        const hostname =
          parsed.hostname
            .toLowerCase();

        if (
          hostname !==
            "t.me" &&
          hostname !==
            "www.t.me" &&
          hostname !==
            "telegram.me" &&
          hostname !==
            "www.telegram.me"
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Telegram Channel-এর সঠিক Link দিন।",
            },
            {
              status: 400,
            }
          );
        }
      } catch {
        return NextResponse.json(
          {
            success: false,
            message:
              "Telegram Channel Link সঠিক নয়।",
          },
          {
            status: 400,
          }
        );
      }
    }

    const values: Record<
      string,
      string
    > = {
      help_first_admin_url:
        firstAdminUsername,

      help_second_admin_url:
        secondAdminUsername,

      help_third_admin_url:
        thirdAdminUsername,

      help_telegram_channel_url:
        telegramChannelUrl,
    };

    const supabase =
      getSupabaseAdmin();

    for (
      const settingKey of SETTINGS
    ) {
      const settingValue =
        values[settingKey];

      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("admin_settings")
        .select("id")
        .eq(
          "setting_key",
          settingKey
        )
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing?.id) {
        const {
          error,
        } = await supabase
          .from("admin_settings")
          .update({
            setting_value:
              settingValue,

            setting_type:
              "url",

            is_public: true,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existing.id
          );

        if (error) {
          throw error;
        }
      } else {
        const {
          error,
        } = await supabase
          .from("admin_settings")
          .insert({
            setting_key:
              settingKey,

            setting_value:
              settingValue,

            setting_type:
              "url",

            is_public: true,
          });

        if (error) {
          throw error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "হেল্প লাইন সেটিংস সফলভাবে সংরক্ষণ হয়েছে",
    });
  } catch (error) {
    console.error(
      "Admin help POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "সেটিংস সংরক্ষণ করা যায়নি",
      },
      {
        status: 500,
      }
    );
  }
}