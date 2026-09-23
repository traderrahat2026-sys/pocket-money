import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeTelegramAdminUrl(value: unknown): string {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  if (/^https?:\/\/(www\.)?t\.me\//i.test(raw)) {
    return raw;
  }

  if (/^https?:\/\/(www\.)?telegram\.me\//i.test(raw)) {
    return raw;
  }

  let username = raw
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?t\.me\//i, "")
    .replace(/^https?:\/\/(www\.)?telegram\.me\//i, "")
    .replace(/^t\.me\//i, "")
    .replace(/^telegram\.me\//i, "")
    .split(/[/?#]/)[0]
    .trim();

  if (!username) {
    return "";
  }

  return `https://t.me/${username}`;
}

function makeTelegramChannelUrl(value: unknown): string {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  if (
    /^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i.test(
      raw
    )
  ) {
    return raw;
  }

  return "";
}

export async function GET() {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error(
        "Missing NEXT_PUBLIC_SUPABASE_URL"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "NEXT_PUBLIC_SUPABASE_URL missing",
        },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      console.error(
        "Missing SUPABASE_SERVICE_ROLE_KEY"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "SUPABASE_SERVICE_ROLE_KEY missing",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
      Server-side service role is used here.
      This route never exposes the service role key
      to the browser.
    */
    const { data, error } = await supabase
      .from("admin_settings")
      .select(
        "setting_key, setting_value, is_public"
      )
      .eq("is_public", true)
      .in("setting_key", [
        "help_first_admin_url",
        "help_second_admin_url",
        "help_third_admin_url",
        "help_telegram_channel_url",
      ]);

    if (error) {
      console.error(
        "Help line settings database error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    const settings = new Map(
      (data ?? []).map((item) => [
        item.setting_key,
        item.setting_value ?? "",
      ])
    );

    const result = {
      firstAdminUrl: makeTelegramAdminUrl(
        settings.get(
          "help_first_admin_url"
        )
      ),

      secondAdminUrl: makeTelegramAdminUrl(
        settings.get(
          "help_second_admin_url"
        )
      ),

      thirdAdminUrl: makeTelegramAdminUrl(
        settings.get(
          "help_third_admin_url"
        )
      ),

      telegramChannelUrl:
        makeTelegramChannelUrl(
          settings.get(
            "help_telegram_channel_url"
          )
        ),
    };

    console.log(
      "PUBLIC HELP LINE RESULT:",
      result
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Help line unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    );
  }
}