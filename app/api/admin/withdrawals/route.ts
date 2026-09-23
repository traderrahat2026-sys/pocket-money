import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ADMIN_SESSION_COOKIE = "pocket_money_admin_session";
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/* =========================================================
   SUPABASE
   ========================================================= */

function getAdminSupabase() {
  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* =========================================================
   SESSION HELPERS
   ========================================================= */

function base64UrlDecode(value: string) {
  return Buffer.from(
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

function safeCompare(
  actual: string,
  expected: string
) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

function verifyCurrentSessionToken(
  token: string
) {
  try {
    if (!token || !ADMIN_SESSION_SECRET) {
      return false;
    }

    const decoded = base64UrlDecode(token);
    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return false;
    }

    const username = parts[0];
    const timestamp = parts[1];
    const signature = parts[2];

    if (!username || !timestamp || !signature) {
      return false;
    }

    const expectedUsername =
      process.env.ADMIN_USERNAME;

    if (
      expectedUsername &&
      username !== expectedUsername
    ) {
      return false;
    }

    const issuedAt = Number(timestamp);

    if (!Number.isFinite(issuedAt)) {
      return false;
    }

    const age = Date.now() - issuedAt;

    if (age < 0 || age > SESSION_MAX_AGE) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        ADMIN_SESSION_SECRET
      )
      .update(
        `${username}:${timestamp}`
      )
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    return safeCompare(
      signature,
      expectedSignature
    );
  } catch {
    return false;
  }
}

function verifyLegacySessionToken(
  token: string
) {
  try {
    if (!token || !ADMIN_SESSION_SECRET) {
      return false;
    }

    const parts = token.split(".");

    if (parts.length !== 2) {
      return false;
    }

    const [payload, signature] = parts;

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        ADMIN_SESSION_SECRET
      )
      .update(payload)
      .digest("hex");

    if (
      !safeCompare(
        signature,
        expectedSignature
      )
    ) {
      return false;
    }

    const decoded = JSON.parse(
      Buffer.from(
        payload,
        "base64url"
      ).toString("utf8")
    );

    if (
      !decoded ||
      !decoded.expiresAt
    ) {
      return false;
    }

    if (
      Number(decoded.expiresAt) < Date.now()
    ) {
      return false;
    }

    const expectedUsername =
      process.env.ADMIN_USERNAME;

    if (
      expectedUsername &&
      decoded.username &&
      decoded.username !== expectedUsername
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function verifyAdminSession() {
  try {
    const cookieStore = await cookies();

    const sessionCookie =
      cookieStore.get(
        ADMIN_SESSION_COOKIE
      );

    if (!sessionCookie?.value) {
      return false;
    }

    const token = sessionCookie.value;

    if (
      verifyCurrentSessionToken(token)
    ) {
      return true;
    }

    if (
      verifyLegacySessionToken(token)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeStatus(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function cleanError(message: string) {
  const key = String(message || "")
    .replace(/^ERROR:\s*/i, "")
    .trim();

  const errorMap: Record<string, string> = {
    WITHDRAWAL_NOT_FOUND:
      "উত্তোলনের অনুরোধ পাওয়া যায়নি।",

    WITHDRAWAL_ALREADY_APPROVED:
      "এই উত্তোলন ইতিমধ্যে অনুমোদিত হয়েছে।",

    WITHDRAWAL_ALREADY_REJECTED:
      "এই উত্তোলন ইতিমধ্যে বাতিল করা হয়েছে।",

    WITHDRAWAL_ALREADY_PROCESSED:
      "এই উত্তোলন ইতিমধ্যে প্রক্রিয়া করা হয়েছে।",

    INVALID_WITHDRAWAL_AMOUNT:
      "উত্তোলনের পরিমাণ সঠিক নয়।",

    INSUFFICIENT_EARNING_BALANCE:
      "ইউজারের আর্নিং ব্যালেন্স যথেষ্ট নয়।",

    WALLET_NOT_FOUND:
      "ইউজারের ওয়ালেট পাওয়া যায়নি।",

    WITHDRAWAL_100_ALREADY_USED:
      "৳100 উত্তোলন ইতিমধ্যে ব্যবহার করা হয়েছে।",

    WITHDRAWAL_200_ALREADY_USED:
      "৳200 উত্তোলন ইতিমধ্যে ব্যবহার করা হয়েছে।",

    "Admin access required":
      "অ্যাডমিন অনুমতি পাওয়া যায়নি।",
  };

  return (
    errorMap[key] ??
    key ??
    "উত্তোলন প্রক্রিয়া করা যায়নি।"
  );
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  request: Request
) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const status = String(
      searchParams.get("status") ?? "all"
    )
      .trim()
      .toLowerCase();

    const search = String(
      searchParams.get("search") ?? ""
    ).trim();

    const supabase =
      getAdminSupabase();

    let query = supabase
      .from("withdrawals")
      .select(`
        id,
        user_id,
        payment_method,
        account_number,
        amount,
        status,
        admin_note,
        reviewed_by,
        requested_at,
        reviewed_at,
        created_at,
        updated_at
      `)
      .order(
        "requested_at",
        {
          ascending: false,
        }
      );

    if (
      status !== "all" &&
      [
        "pending",
        "approved",
        "rejected",
        "completed",
      ].includes(status)
    ) {
      query = query.eq(
        "status",
        status
      );
    }

    const {
      data: withdrawals,
      error,
    } = await query;

    if (error) {
      console.error(
        "ADMIN WITHDRAWALS GET ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "উত্তোলনের তথ্য লোড করা যায়নি।",
          details: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const rows = withdrawals ?? [];

    /* -----------------------------------------------------
       PROFILES
       ----------------------------------------------------- */

    const userIds = Array.from(
      new Set(
        rows
          .map(
            (item) => item.user_id
          )
          .filter(Boolean)
      )
    );

    let profiles: any[] = [];

    if (userIds.length > 0) {
      const {
        data,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          full_name,
          phone,
          role
        `)
        .in("id", userIds);

      if (profileError) {
        console.error(
          "ADMIN WITHDRAWALS PROFILE ERROR:",
          profileError
        );
      } else {
        profiles = data ?? [];
      }
    }

    const profileMap = new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

    /* -----------------------------------------------------
       AUTH USERS
       ----------------------------------------------------- */

    let authUsers: any[] = [];

    const authResult =
      await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (!authResult.error) {
      authUsers =
        authResult.data.users ?? [];
    }

    const authMap = new Map(
      authUsers.map(
        (user) => [
          user.id,
          user,
        ]
      )
    );

    /* -----------------------------------------------------
       ENRICH
       ----------------------------------------------------- */

    const enrichedRows =
      rows.map((withdrawal) => {
        const profile =
          profileMap.get(
            withdrawal.user_id
          );

        const authUser =
          authMap.get(
            withdrawal.user_id
          );

        return {
          ...withdrawal,

          user: {
            id: withdrawal.user_id,

            full_name:
              profile?.full_name ?? "",

            username:
              profile?.username ?? "",

            phone:
              profile?.phone ?? "",

            email:
              authUser?.email ?? "",
          },
        };
      });

    /* -----------------------------------------------------
       SEARCH
       ----------------------------------------------------- */

    const filteredRows = search
      ? enrichedRows.filter(
          (withdrawal) => {
            const q =
              search.toLowerCase();

            return [
              withdrawal.id,
              withdrawal.user_id,
              withdrawal.user?.full_name,
              withdrawal.user?.username,
              withdrawal.user?.phone,
              withdrawal.user?.email,
              withdrawal.account_number,
              withdrawal.payment_method,
            ].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(q)
            );
          }
        )
      : enrichedRows;

    /* -----------------------------------------------------
       SUMMARY
       ----------------------------------------------------- */

    const pendingRows =
      enrichedRows.filter(
        (item) =>
          normalizeStatus(
            item.status
          ) === "pending"
      );

    const approvedRows =
      enrichedRows.filter(
        (item) =>
          normalizeStatus(
            item.status
          ) === "approved"
      );

    const rejectedRows =
      enrichedRows.filter(
        (item) =>
          normalizeStatus(
            item.status
          ) === "rejected"
      );

    const sumAmount = (
      items: any[]
    ) =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount ?? 0
          ),
        0
      );

    const summary = {
      total:
        enrichedRows.length,

      pending:
        pendingRows.length,

      approved:
        approvedRows.length,

      rejected:
        rejectedRows.length,

      pendingAmount:
        sumAmount(pendingRows),

      approvedAmount:
        sumAmount(approvedRows),

      rejectedAmount:
        sumAmount(rejectedRows),

      totalAmount:
        sumAmount(enrichedRows),
    };

    return NextResponse.json(
      {
        success: true,
        withdrawals:
          filteredRows,
        summary,
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
      "ADMIN WITHDRAWALS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "সার্ভার সমস্যা হয়েছে।",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH
   ========================================================= */

export async function PATCH(
  request: Request
) {
  try {
    /* -----------------------------------------------------
       ADMIN AUTH
       ----------------------------------------------------- */

    if (!(await verifyAdminSession())) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const withdrawalId =
      String(
        body.withdrawalId ??
          body.withdrawal_id ??
          body.id ??
          ""
      ).trim();

    const action =
      String(
        body.action ?? ""
      )
        .trim()
        .toLowerCase();

    const adminNote =
      body.adminNote === null ||
      body.adminNote === undefined
        ? null
        : String(
            body.adminNote
          ).trim() || null;

    if (!withdrawalId) {
      return NextResponse.json(
        {
          error:
            "Withdrawal ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !["approve", "reject"].includes(
        action
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid withdrawal action.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getAdminSupabase();

    /* -----------------------------------------------------
       CHECK CURRENT STATUS FIRST
       ----------------------------------------------------- */

    const {
      data: currentWithdrawal,
      error: currentError,
    } = await supabase
      .from("withdrawals")
      .select(`
        id,
        user_id,
        amount,
        status
      `)
      .eq(
        "id",
        withdrawalId
      )
      .maybeSingle();

    if (currentError) {
      console.error(
        "CURRENT WITHDRAWAL ERROR:",
        currentError
      );

      return NextResponse.json(
        {
          error:
            "উত্তোলনের তথ্য পাওয়া যায়নি।",
          details:
            currentError.message,
        },
        {
          status: 400,
        }
      );
    }

    if (!currentWithdrawal) {
      return NextResponse.json(
        {
          error:
            "উত্তোলনের অনুরোধ পাওয়া যায়নি।",
        },
        {
          status: 404,
        }
      );
    }

    const currentStatus =
      normalizeStatus(
        currentWithdrawal.status
      );

    if (currentStatus === "approved") {
      return NextResponse.json(
        {
          error:
            "এই উত্তোলন ইতিমধ্যে অনুমোদিত হয়েছে।",
        },
        {
          status: 400,
        }
      );
    }

    if (currentStatus === "rejected") {
      return NextResponse.json(
        {
          error:
            "এই উত্তোলন ইতিমধ্যে বাতিল করা হয়েছে।",
        },
        {
          status: 400,
        }
      );
    }

    if (currentStatus !== "pending") {
      return NextResponse.json(
        {
          error:
            "এই উত্তোলন আর প্রক্রিয়া করার অবস্থায় নেই।",
        },
        {
          status: 400,
        }
      );
    }

    /* -----------------------------------------------------
       APPROVE
       ----------------------------------------------------- */

    let rpcResult;

    if (action === "approve") {
      rpcResult =
        await supabase.rpc(
          "admin_approve_withdrawal",
          {
            p_withdrawal_id:
              withdrawalId,

            p_note:
              adminNote,
          }
        );
    }

    /* -----------------------------------------------------
       REJECT
       ----------------------------------------------------- */

    else {
      rpcResult =
        await supabase.rpc(
          "admin_reject_withdrawal",
          {
            p_withdrawal_id:
              withdrawalId,

            p_admin_note:
              adminNote,
          }
        );
    }

    if (rpcResult.error) {
      console.error(
        "ADMIN WITHDRAWAL RPC ERROR:",
        rpcResult.error
      );

      const rawMessage =
        rpcResult.error.message ||
        "Failed to process withdrawal.";

      return NextResponse.json(
        {
          success: false,

          error:
            cleanError(
              rawMessage
            ),

          details:
            rawMessage,
        },
        {
          status: 400,
        }
      );
    }

    /* -----------------------------------------------------
       VERIFY UPDATED DATABASE ROW
       ----------------------------------------------------- */

    const {
      data: updatedWithdrawal,
      error: reloadError,
    } = await supabase
      .from("withdrawals")
      .select(`
        id,
        user_id,
        payment_method,
        account_number,
        amount,
        status,
        admin_note,
        reviewed_by,
        requested_at,
        reviewed_at,
        created_at,
        updated_at
      `)
      .eq(
        "id",
        withdrawalId
      )
      .maybeSingle();

    if (reloadError) {
      console.error(
        "ADMIN WITHDRAWAL RELOAD ERROR:",
        reloadError
      );

      return NextResponse.json(
        {
          success: false,

          error:
            "উত্তোলন প্রক্রিয়া হয়েছে, কিন্তু updated status যাচাই করা যায়নি।",

          details:
            reloadError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!updatedWithdrawal) {
      return NextResponse.json(
        {
          success: false,
          error:
            "প্রক্রিয়ার পরে withdrawal পাওয়া যায়নি।",
        },
        {
          status: 404,
        }
      );
    }

    const expectedStatus =
      action === "approve"
        ? "approved"
        : "rejected";

    const actualStatus =
      normalizeStatus(
        updatedWithdrawal.status
      );

    /* -----------------------------------------------------
       STATUS MUST ACTUALLY CHANGE
       ----------------------------------------------------- */

    if (
      actualStatus !==
      expectedStatus
    ) {
      console.error(
        "WITHDRAWAL STATUS VERIFICATION FAILED",
        {
          withdrawalId,
          action,
          expectedStatus,
          actualStatus,
          rpcResult:
            rpcResult.data,
        }
      );

      return NextResponse.json(
        {
          success: false,

          error:
            `Database status পরিবর্তন হয়নি। বর্তমান status: ${actualStatus || "unknown"}`,

          details:
            "RPC completed but the expected withdrawal status was not stored.",

          withdrawal:
            updatedWithdrawal,
        },
        {
          status: 500,
        }
      );
    }

    /* -----------------------------------------------------
       SUCCESS
       ----------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        action,

        message:
          action === "approve"
            ? "উত্তোলন অনুমোদন করা হয়েছে।"
            : "উত্তোলন বাতিল করা হয়েছে এবং টাকা ফেরত দেওয়া হয়েছে।",

        result:
          rpcResult.data,

        withdrawal:
          updatedWithdrawal,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "ADMIN WITHDRAWAL PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "সার্ভার সমস্যা হয়েছে।",
      },
      {
        status: 500,
      }
    );
  }
}