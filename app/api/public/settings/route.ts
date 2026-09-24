import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const PUBLIC_SETTING_KEYS = [
  "bkash_number",
  "nagad_number",
  "rocket_number",
  "deposit_bonus_amount",
  "deposit_bonus_threshold",
  "minimum_deposit",
  "minimum_withdrawal",
  "maintenance_mode",
  "site_name",
  "support_telegram",
  "help_first_admin_url",
  "help_second_admin_url",
  "help_third_admin_url",
  "help_telegram_channel_url",
];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_settings")
      .select(
        "setting_key, setting_value, setting_type, is_public",
      )
      .eq("is_public", true)
      .in("setting_key", PUBLIC_SETTING_KEYS);

    if (error) {
      console.error(
        "PUBLIC SETTINGS GET ERROR:",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        },
      );
    }

    const settings: Record<string, string> = {};

    for (const item of data || []) {
      settings[item.setting_key] =
        item.setting_value ?? "";
    }

    return NextResponse.json(
      {
        success: true,
        settings,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error(
      "PUBLIC SETTINGS API ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Public settings load failed.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}