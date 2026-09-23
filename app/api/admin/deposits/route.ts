import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_COOKIE_NAME = "pocket_money_admin_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Verify the exact admin session format used by
 * /api/admin/session and /api/admin/login.
 *
 * Token format:
 * base64url(username:issuedAt:signature)
 *
 * Signature:
 * HMAC-SHA256(username:issuedAt, ADMIN_SESSION_SECRET)
 */
function verifyAdminSession(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      return {
        valid: false,
        reason: "NO_SESSION",
      };
    }

    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret) {
      console.error(
        "ADMIN_SESSION_SECRET is missing from environment variables.",
      );

      return {
        valid: false,
        reason: "SERVER_CONFIG",
      };
    }

    let decoded = "";

    try {
      decoded = Buffer.from(token, "base64url").toString("utf8");
    } catch {
      return {
        valid: false,
        reason: "INVALID_TOKEN_ENCODING",
      };
    }

    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return {
        valid: false,
        reason: "INVALID_TOKEN_FORMAT",
      };
    }

    const [username, issuedAtText, signature] = parts;

    if (!username || !issuedAtText || !signature) {
      return {
        valid: false,
        reason: "INVALID_TOKEN_DATA",
      };
    }

    const issuedAt = Number(issuedAtText);

    if (!Number.isFinite(issuedAt)) {
      return {
        valid: false,
        reason: "INVALID_ISSUED_AT",
      };
    }

    const age = Date.now() - issuedAt;

    if (age < 0 || age > SESSION_MAX_AGE) {
      return {
        valid: false,
        reason: "SESSION_EXPIRED",
      };
    }

    const payload = `${username}:${issuedAt}`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return {
        valid: false,
        reason: "INVALID_SIGNATURE",
      };
    }

    return {
      valid: true,
      username,
    };
  } catch (error) {
    console.error("Admin session verification error:", error);

    return {
      valid: false,
      reason: "SESSION_VERIFY_ERROR",
    };
  }
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function numberValue(value: unknown) {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
}

/* =========================================================
   GET /api/admin/deposits
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const session = verifyAdminSession(request);

    if (!session.valid) {
      console.error(
        "Admin deposits GET unauthorized:",
        session.reason,
      );

      return jsonResponse(
        {
          success: false,
          error: "UNAUTHORIZED",
          reason: session.reason,
        },
        401,
      );
    }

    const supabase = getSupabaseAdmin();

    const status =
      request.nextUrl.searchParams.get("status") || "all";

    let query = supabase
      .from("deposits")
      .select(
        `
        id,
        user_id,
        amount,
        payment_method,
        payment_number,
        transaction_id,
        status,
        bonus_amount,
        created_at,
        approved_at,
        updated_at
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (
      status !== "all" &&
      status !== "All" &&
      status.trim() !== ""
    ) {
      query = query.eq("status", status);
    }

    const { data: deposits, error: depositsError } =
      await query;

    if (depositsError) {
      console.error(
        "Admin deposits database error:",
        depositsError,
      );

      return jsonResponse(
        {
          success: false,
          error: depositsError.message,
        },
        500,
      );
    }

    const depositRows = Array.isArray(deposits)
      ? deposits
      : [];

    /* ---------------------------------------------
       Load profiles separately.
       This avoids PostgREST relationship problems.
    --------------------------------------------- */

    const userIds = Array.from(
      new Set(
        depositRows
          .map((deposit: any) => deposit.user_id)
          .filter(Boolean),
      ),
    );

    let profiles: any[] = [];

    if (userIds.length > 0) {
      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            `
            id,
            username,
            full_name,
            phone,
            avatar_url,
            referral_code
            `,
          )
          .in("id", userIds);

      if (profileError) {
        console.error(
          "Admin deposits profile error:",
          profileError,
        );
      } else {
        profiles = profileData || [];
      }
    }

    const profileMap = new Map(
      profiles.map((profile: any) => [
        profile.id,
        profile,
      ]),
    );

    const formattedDeposits = depositRows.map(
      (deposit: any) => {
        const profile =
          profileMap.get(deposit.user_id) || null;

        return {
          ...deposit,

          user: profile,

          username:
            profile?.username ||
            "ব্যবহারকারী",

          full_name:
            profile?.full_name ||
            profile?.username ||
            "ব্যবহারকারী",

          phone:
            profile?.phone ||
            "",

          referral_code:
            profile?.referral_code ||
            "",
        };
      },
    );

    /* ---------------------------------------------
       Summary
    --------------------------------------------- */

    const summary = {
      total: formattedDeposits.length,

      pending: formattedDeposits.filter(
        (item: any) =>
          String(item.status).toLowerCase() ===
          "pending",
      ).length,

      approved: formattedDeposits.filter(
        (item: any) =>
          String(item.status).toLowerCase() ===
          "approved",
      ).length,

      rejected: formattedDeposits.filter(
        (item: any) =>
          String(item.status).toLowerCase() ===
          "rejected",
      ).length,

      pendingAmount:
        formattedDeposits
          .filter(
            (item: any) =>
              String(item.status).toLowerCase() ===
              "pending",
          )
          .reduce(
            (total: number, item: any) =>
              total + numberValue(item.amount),
            0,
          ),

      approvedAmount:
        formattedDeposits
          .filter(
            (item: any) =>
              String(item.status).toLowerCase() ===
              "approved",
          )
          .reduce(
            (total: number, item: any) =>
              total + numberValue(item.amount),
            0,
          ),

      bonusAmount:
        formattedDeposits.reduce(
          (total: number, item: any) =>
            total + numberValue(item.bonus_amount),
          0,
        ),
    };

    return jsonResponse({
      success: true,
      deposits: formattedDeposits,
      summary,

      // Legacy aliases for compatibility
      totalDeposits: summary.total,
      pendingDeposits: summary.pending,
      approvedDeposits: summary.approved,
      rejectedDeposits: summary.rejected,
      pendingAmount: summary.pendingAmount,
      approvedAmount: summary.approvedAmount,
      bonusAmount: summary.bonusAmount,
    });
  } catch (error) {
    console.error(
      "Admin deposits GET fatal error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load deposits.",
      },
      500,
    );
  }
}

/* =========================================================
   PATCH /api/admin/deposits

   Body:
   {
     id: number,
     status: "Approved" | "Rejected"
   }
========================================================= */

export async function PATCH(request: NextRequest) {
  try {
    const session = verifyAdminSession(request);

    if (!session.valid) {
      console.error(
        "Admin deposits PATCH unauthorized:",
        session.reason,
      );

      return jsonResponse(
        {
          success: false,
          error: "UNAUTHORIZED",
          reason: session.reason,
        },
        401,
      );
    }

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "INVALID_JSON",
        },
        400,
      );
    }

    const id = Number(body?.id);
    const requestedStatus = String(
      body?.status || "",
    ).trim();

    if (!Number.isFinite(id)) {
      return jsonResponse(
        {
          success: false,
          error: "INVALID_DEPOSIT_ID",
        },
        400,
      );
    }

    const normalizedStatus =
      requestedStatus.toLowerCase();

    if (
      normalizedStatus !== "approved" &&
      normalizedStatus !== "rejected"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "INVALID_STATUS. Status must be Approved or Rejected.",
        },
        400,
      );
    }

    const supabase = getSupabaseAdmin();

    /* ---------------------------------------------
       Get current deposit
    --------------------------------------------- */

    const { data: deposit, error: depositError } =
      await supabase
        .from("deposits")
        .select(
          `
          id,
          user_id,
          amount,
          payment_method,
          payment_number,
          transaction_id,
          status,
          bonus_amount,
          created_at,
          approved_at
          `,
        )
        .eq("id", id)
        .maybeSingle();

    if (depositError) {
      console.error(
        "Deposit lookup error:",
        depositError,
      );

      return jsonResponse(
        {
          success: false,
          error: depositError.message,
        },
        500,
      );
    }

    if (!deposit) {
      return jsonResponse(
        {
          success: false,
          error: "DEPOSIT_NOT_FOUND",
        },
        404,
      );
    }

    const currentStatus = String(
      deposit.status || "",
    ).toLowerCase();

    /* ---------------------------------------------
       APPROVE
    --------------------------------------------- */

    if (normalizedStatus === "approved") {
      if (currentStatus === "approved") {
        return jsonResponse(
          {
            success: false,
            error: "DEPOSIT_ALREADY_APPROVED",
          },
          400,
        );
      }

      if (currentStatus === "rejected") {
        return jsonResponse(
          {
            success: false,
            error:
              "REJECTED_DEPOSIT_CANNOT_BE_APPROVED",
          },
          400,
        );
      }

      const { data: approvalResult, error: approvalError } =
        await supabase.rpc(
          "admin_approve_deposit",
          {
            p_deposit_id: id,
          },
        );

      if (approvalError) {
        console.error(
          "admin_approve_deposit RPC error:",
          approvalError,
        );

        return jsonResponse(
          {
            success: false,
            error: approvalError.message,
            details:
              approvalError.details ||
              null,
          },
          500,
        );
      }

      return jsonResponse({
        success: true,
        message:
          "Deposit approved successfully.",
        deposit_id: id,
        status: "Approved",
        result: approvalResult,
      });
    }

    /* ---------------------------------------------
       REJECT
    --------------------------------------------- */

    if (currentStatus === "approved") {
      return jsonResponse(
        {
          success: false,
          error:
            "APPROVED_DEPOSIT_CANNOT_BE_REJECTED",
        },
        400,
      );
    }

    if (currentStatus === "rejected") {
      return jsonResponse(
        {
          success: false,
          error: "DEPOSIT_ALREADY_REJECTED",
        },
        400,
      );
    }

    const { data: rejectedDeposit, error: rejectError } =
      await supabase
        .from("deposits")
        .update({
          status: "Rejected",
          approved_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          `
          id,
          user_id,
          amount,
          payment_method,
          payment_number,
          transaction_id,
          status,
          bonus_amount,
          created_at,
          approved_at,
          updated_at
          `,
        )
        .single();

    if (rejectError) {
      console.error(
        "Deposit rejection error:",
        rejectError,
      );

      return jsonResponse(
        {
          success: false,
          error: rejectError.message,
        },
        500,
      );
    }

    return jsonResponse({
      success: true,
      message:
        "Deposit rejected successfully.",
      deposit_id: id,
      status: "Rejected",
      deposit: rejectedDeposit,
    });
  } catch (error) {
    console.error(
      "Admin deposits PATCH fatal error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update deposit.",
      },
      500,
    );
  }
}