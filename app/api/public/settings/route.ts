import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        "Supabase environment missing"
      );
    }

    const supabase =
      createClient(url, key);

    const { data, error } =
      await supabase
        .from("admin_settings")
        .select("key,value");

    if (error) {
      throw error;
    }

    const settings: Record<
      string,
      string
    > = {};

    for (const item of data || []) {
      settings[item.key] =
        item.value;
    }

    return NextResponse.json({
      success: true,
      settings: {
        bkash_number:
          settings.bkash_number ||
          "01869506686",

        nagad_number:
          settings.nagad_number ||
          "01928156849",

        rocket_number:
          settings.rocket_number ||
          "01619952823",

        minimum_deposit:
          Number(
            settings.minimum_deposit ||
              500
          ),

        deposit_bonus_threshold:
          Number(
            settings.deposit_bonus_threshold ||
              2000
          ),

        deposit_bonus_amount:
          Number(
            settings.deposit_bonus_amount ||
              500
          ),

        minimum_withdrawal:
          Number(
            settings.minimum_withdrawal ||
              100
          ),

        telegram_channel_url:
          settings.telegram_channel_url ||
          "",

        site_notice:
          settings.site_notice ||
          "",

        maintenance_mode:
          settings.maintenance_mode ===
          "true",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Settings unavailable",
      },
      { status: 500 }
    );
  }
}