import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SESSION_COOKIE = "pocket_money_admin_session";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    "change-this-admin-secret"
  );
}

/* =========================================================
   ADMIN SESSION VERIFICATION
   Current session format:

   base64url(
     username:timestamp:signature
   )

   signature =
   HMAC-SHA256(
     username:timestamp,
     ADMIN_SESSION_SECRET
   )
   ========================================================= */

function verifyAdminSession(request: Request) {
  const cookieHeader =
    request.headers.get("cookie") || "";

  const match = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) =>
      item.startsWith(`${SESSION_COOKIE}=`),
    );

  if (!match) {
    return false;
  }

  let token = "";

  try {
    token = decodeURIComponent(
      match.substring(
        `${SESSION_COOKIE}=`.length,
      ),
    );
  } catch {
    return false;
  }

  if (!token) {
    return false;
  }

  let decodedToken = "";

  try {
    decodedToken = Buffer.from(
      token,
      "base64url",
    ).toString("utf8");
  } catch {
    return false;
  }

  const parts = decodedToken.split(":");

  if (parts.length !== 3) {
    return false;
  }

  const [
    username,
    timestamp,
    signature,
  ] = parts;

  if (
    !username ||
    !timestamp ||
    !signature
  ) {
    return false;
  }

  const expectedUsername =
    process.env.ADMIN_USERNAME ||
    "cats home admin";

  if (username !== expectedUsername) {
    return false;
  }

  const timestampNumber =
    Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  /*
   * Session lifetime:
   * 7 days
   */
  const maxAge =
    7 * 24 * 60 * 60 * 1000;

  const age =
    Date.now() - timestampNumber;

  if (age > maxAge) {
    return false;
  }

  /*
   * Reject future timestamps.
   */
  if (age < 0) {
    return false;
  }

  const payload =
    `${username}:${timestamp}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        getSecret(),
      )
      .update(payload)
      .digest("base64url");

  try {
    const actualBuffer =
      Buffer.from(signature);

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
      );

    if (
      actualBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      actualBuffer,
      expectedBuffer,
    );
  } catch {
    return false;
  }
}

function unauthorized() {
  return NextResponse.json(
    {
      error: "Unauthorized.",
    },
    {
      status: 401,
    },
  );
}

function cleanError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function normalizeSettingType(
  value: unknown,
) {
  const type = String(
    value || "text",
  )
    .trim()
    .toLowerCase();

  if (
    [
      "text",
      "number",
      "boolean",
      "json",
    ].includes(type)
  ) {
    return type;
  }

  return "text";
}

/* =========================================================
   GET SETTINGS
   ========================================================= */

export async function GET(
  request: Request,
) {
  try {
    if (!verifyAdminSession(request)) {
      return unauthorized();
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("admin_settings")
      .select(
        `
        id,
        setting_key,
        setting_value,
        setting_type,
        description,
        is_public,
        created_at,
        updated_at
        `,
      )
      .order("setting_key", {
        ascending: true,
      });

    if (error) {
      console.error(
        "ADMIN SETTINGS GET ERROR:",
        error,
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      settings: data || [],
    });
  } catch (error) {
    console.error(
      "ADMIN SETTINGS API ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error: cleanError(error),
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST — CREATE SETTING
   ========================================================= */

export async function POST(
  request: Request,
) {
  try {
    if (!verifyAdminSession(request)) {
      return unauthorized();
    }

    const body =
      await request.json();

    const settingKey = String(
      body.setting_key || "",
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    const settingValue =
      body.setting_value === null ||
      body.setting_value === undefined
        ? ""
        : String(
            body.setting_value,
          );

    const settingType =
      normalizeSettingType(
        body.setting_type,
      );

    const description =
      body.description === null ||
      body.description === undefined
        ? null
        : String(
            body.description,
          ).trim() || null;

    const isPublic =
      Boolean(body.is_public);

    if (!settingKey) {
      return NextResponse.json(
        {
          error:
            "Setting key is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !/^[a-z0-9_]+$/.test(
        settingKey,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Setting key can contain only lowercase letters, numbers and underscores.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      settingType === "number"
    ) {
      if (
        settingValue.trim() !== "" &&
        !Number.isFinite(
          Number(settingValue),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Number setting must contain a valid number.",
          },
          {
            status: 400,
          },
        );
      }
    }

    if (
      settingType === "boolean"
    ) {
      if (
        ![
          "true",
          "false",
        ].includes(
          settingValue.toLowerCase(),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Boolean setting must be true or false.",
          },
          {
            status: 400,
          },
        );
      }
    }

    if (
      settingType === "json"
    ) {
      try {
        JSON.parse(settingValue);
      } catch {
        return NextResponse.json(
          {
            error:
              "JSON setting contains invalid JSON.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("admin_settings")
      .insert({
        setting_key: settingKey,
        setting_value:
          settingValue,
        setting_type:
          settingType,
        description,
        is_public: isPublic,
      })
      .select(
        `
        id,
        setting_key,
        setting_value,
        setting_type,
        description,
        is_public,
        created_at,
        updated_at
        `,
      )
      .maybeSingle();

    if (error) {
      console.error(
        "ADMIN SETTINGS CREATE ERROR:",
        error,
      );

      if (
        error.code === "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "A setting with this key already exists.",
          },
          {
            status: 409,
          },
        );
      }

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      setting: data,
    });
  } catch (error) {
    console.error(
      "ADMIN SETTINGS POST ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error: cleanError(error),
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PATCH — UPDATE SETTING
   ========================================================= */

export async function PATCH(
  request: Request,
) {
  try {
    if (!verifyAdminSession(request)) {
      return unauthorized();
    }

    const body =
      await request.json();

    const id = String(
      body.id || "",
    ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Setting ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const updates: Record<
      string,
      unknown
    > = {};

    if (
      body.setting_value !==
      undefined
    ) {
      updates.setting_value =
        body.setting_value ===
        null
          ? ""
          : String(
              body.setting_value,
            );
    }

    if (
      body.setting_type !==
      undefined
    ) {
      updates.setting_type =
        normalizeSettingType(
          body.setting_type,
        );
    }

    if (
      body.description !==
      undefined
    ) {
      updates.description =
        body.description === null
          ? null
          : String(
              body.description,
            ).trim() || null;
    }

    if (
      body.is_public !==
      undefined
    ) {
      updates.is_public =
        Boolean(
          body.is_public,
        );
    }

    if (
      body.setting_key !==
      undefined
    ) {
      const settingKey =
        String(
          body.setting_key || "",
        )
          .trim()
          .toLowerCase()
          .replace(
            /\s+/g,
            "_",
          );

      if (
        !/^[a-z0-9_]+$/.test(
          settingKey,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Setting key can contain only lowercase letters, numbers and underscores.",
          },
          {
            status: 400,
          },
        );
      }

      updates.setting_key =
        settingKey;
    }

    const finalType =
      String(
        updates.setting_type ||
          body.setting_type ||
          "text",
      ).toLowerCase();

    const finalValue =
      String(
        updates.setting_value ??
          body.setting_value ??
          "",
      );

    if (
      finalType === "number"
    ) {
      if (
        finalValue.trim() !== "" &&
        !Number.isFinite(
          Number(finalValue),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Number setting must contain a valid number.",
          },
          {
            status: 400,
          },
        );
      }
    }

    if (
      finalType === "boolean"
    ) {
      if (
        ![
          "true",
          "false",
        ].includes(
          finalValue.toLowerCase(),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Boolean setting must be true or false.",
          },
          {
            status: 400,
          },
        );
      }
    }

    if (
      finalType === "json"
    ) {
      try {
        JSON.parse(finalValue);
      } catch {
        return NextResponse.json(
          {
            error:
              "JSON setting contains invalid JSON.",
          },
          {
            status: 400,
          },
        );
      }
    }

    updates.updated_at =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("admin_settings")
      .update(updates)
      .eq("id", id)
      .select(
        `
        id,
        setting_key,
        setting_value,
        setting_type,
        description,
        is_public,
        created_at,
        updated_at
        `,
      )
      .maybeSingle();

    if (error) {
      console.error(
        "ADMIN SETTINGS UPDATE ERROR:",
        error,
      );

      if (
        error.code === "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "A setting with this key already exists.",
          },
          {
            status: 409,
          },
        );
      }

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Setting was not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      setting: data,
    });
  } catch (error) {
    console.error(
      "ADMIN SETTINGS PATCH ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error: cleanError(error),
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   DELETE — DELETE SETTING
   ========================================================= */

export async function DELETE(
  request: Request,
) {
  try {
    if (!verifyAdminSession(request)) {
      return unauthorized();
    }

    const {
      searchParams,
    } = new URL(request.url);

    const id = (
      searchParams.get("id") ||
      ""
    ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Setting ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      error,
    } = await supabaseAdmin
      .from("admin_settings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "ADMIN SETTINGS DELETE ERROR:",
        error,
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "ADMIN SETTINGS DELETE API ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error: cleanError(error),
      },
      {
        status: 500,
      },
    );
  }
}