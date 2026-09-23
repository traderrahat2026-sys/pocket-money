import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SESSION_COOKIE = "pocket_money_admin_session";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL environment variable.",
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY environment variable.",
  );
}

const supabaseAdmin = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!,
);

/* =========================================================
   ADMIN SESSION
========================================================= */

function getSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    "change-this-admin-secret"
  );
}

function getCookieValue(
  request: Request,
  cookieName: string,
) {
  const cookieHeader =
    request.headers.get("cookie") || "";

  const cookies = cookieHeader
    .split(";")
    .map((item) => item.trim());

  for (const cookie of cookies) {
    if (cookie.startsWith(`${cookieName}=`)) {
      return decodeURIComponent(
        cookie.substring(cookieName.length + 1),
      );
    }
  }

  return null;
}

function safeCompare(
  actual: string,
  expected: string,
) {
  try {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

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

/**
 * Supports:
 *
 * Current:
 * base64url(username:issuedAt:signature)
 *
 * Legacy:
 * username.timestamp.signature
 */
function verifyAdminSession(request: Request) {
  const token = getCookieValue(
    request,
    SESSION_COOKIE,
  );

  if (!token) {
    return false;
  }

  const secret = getSecret();

  const expectedUsername =
    process.env.ADMIN_USERNAME ||
    "cats home admin";

  /* =======================================================
     CURRENT FORMAT
  ======================================================= */

  try {
    const decoded = Buffer.from(
      token,
      "base64url",
    ).toString("utf8");

    const parts = decoded.split(":");

    if (parts.length === 3) {
      const [
        username,
        timestamp,
        signature,
      ] = parts;

      if (
        username &&
        timestamp &&
        signature
      ) {
        if (username !== expectedUsername) {
          return false;
        }

        const timestampNumber =
          Number(timestamp);

        if (!Number.isFinite(timestampNumber)) {
          return false;
        }

        const issuedAt =
          timestampNumber < 100000000000
            ? timestampNumber * 1000
            : timestampNumber;

        const age =
          Date.now() - issuedAt;

        const maxAge =
          7 * 24 * 60 * 60 * 1000;

        if (
          age < 0 ||
          age > maxAge
        ) {
          return false;
        }

        const payload =
          `${username}:${timestamp}`;

        const expectedBase64Signature =
          crypto
            .createHmac(
              "sha256",
              secret,
            )
            .update(payload)
            .digest("base64url");

        if (
          safeCompare(
            signature,
            expectedBase64Signature,
          )
        ) {
          return true;
        }

        const expectedHexSignature =
          crypto
            .createHmac(
              "sha256",
              secret,
            )
            .update(payload)
            .digest("hex");

        if (
          safeCompare(
            signature,
            expectedHexSignature,
          )
        ) {
          return true;
        }
      }
    }
  } catch {
    // Continue to legacy format.
  }

  /* =======================================================
     LEGACY FORMAT
  ======================================================= */

  try {
    const parts = token.split(".");

    if (parts.length === 3) {
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

      if (username !== expectedUsername) {
        return false;
      }

      const timestampNumber =
        Number(timestamp);

      if (!Number.isFinite(timestampNumber)) {
        return false;
      }

      const issuedAt =
        timestampNumber < 100000000000
          ? timestampNumber * 1000
          : timestampNumber;

      const age =
        Date.now() - issuedAt;

      const maxAge =
        7 * 24 * 60 * 60 * 1000;

      if (
        age < 0 ||
        age > maxAge
      ) {
        return false;
      }

      const payload =
        `${username}.${timestamp}`;

      const expectedHexSignature =
        crypto
          .createHmac(
            "sha256",
            secret,
          )
          .update(payload)
          .digest("hex");

      if (
        safeCompare(
          signature,
          expectedHexSignature,
        )
      ) {
        return true;
      }

      const expectedBase64Signature =
        crypto
          .createHmac(
            "sha256",
            secret,
          )
          .update(payload)
          .digest("base64url");

      if (
        safeCompare(
          signature,
          expectedBase64Signature,
        )
      ) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized.",
    },
    {
      status: 401,
    },
  );
}

/* =========================================================
   ERROR HELPERS
========================================================= */

function cleanError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown })
        .message,
    );
  }

  return "Something went wrong.";
}

function mapRpcError(message: string) {
  const normalized = message.trim();

  const errorMap: Record<string, string> = {
    SUBMISSION_NOT_FOUND:
      "Task submission was not found.",

    SUBMISSION_ALREADY_REJECTED:
      "This submission has already been rejected.",

    SUBMISSION_ALREADY_APPROVED:
      "This submission has already been approved.",

    TASK_NOT_FOUND:
      "The related task was not found.",

    INVALID_REWARD_AMOUNT:
      "The task reward amount is invalid.",

    ALREADY_APPROVED:
      "This task submission has already been approved.",

    ALREADY_REJECTED:
      "This task submission has already been rejected.",

    NOT_FOUND:
      "Task submission was not found.",

    Authentication_required:
      "Authentication is required.",
  };

  return (
    errorMap[normalized] ||
    normalized
  );
}

/* =========================================================
   GET — TASK SUBMISSIONS
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    if (!verifyAdminSession(request)) {
      return unauthorized();
    }

    const { searchParams } =
      new URL(request.url);

    const status =
      searchParams.get("status") ||
      "all";

    const search =
      (
        searchParams.get("search") ||
        ""
      ).trim();

    const packageAmount =
      searchParams.get(
        "packageAmount",
      ) || "all";

    /* =====================================================
       IMPORTANT:
       Get ALL submissions first.
       Summary must NOT depend on selected status filter.
    ===================================================== */

    const {
      data: allSubmissions,
      error: allSubmissionsError,
    } = await supabaseAdmin
      .from("package_task_submissions")
      .select(
        `
        id,
        user_id,
        task_id,
        screenshot_url,
        status,
        admin_note,
        reward_amount,
        created_at,
        reviewed_at,
        reviewed_by
        `,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (allSubmissionsError) {
      console.error(
        "ALL TASK SUBMISSIONS GET ERROR:",
        allSubmissionsError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            allSubmissionsError.message,
        },
        {
          status: 500,
        },
      );
    }

    const rows =
      allSubmissions || [];

    /* =====================================================
       IDS
    ===================================================== */

    const userIds = [
      ...new Set(
        rows
          .map(
            (row) =>
              row.user_id,
          )
          .filter(Boolean),
      ),
    ];

    const taskIds = [
      ...new Set(
        rows
          .map(
            (row) =>
              row.task_id,
          )
          .filter(Boolean),
      ),
    ];

    /* =====================================================
       RELATED DATA
    ===================================================== */

    const [
      profilesResult,
      tasksResult,
      activationsResult,
    ] = await Promise.all([
      userIds.length
        ? supabaseAdmin
            .from("profiles")
            .select(
              `
              id,
              username,
              full_name,
              phone,
              referral_code
              `,
            )
            .in(
              "id",
              userIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      taskIds.length
        ? supabaseAdmin
            .from("package_tasks")
            .select(
              `
              id,
              package_amount,
              title,
              description,
              task_url,
              reward_amount,
              duration_hours,
              screenshot_required,
              is_active,
              created_at,
              available_from,
              expires_at
              `,
            )
            .in(
              "id",
              taskIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      userIds.length
        ? supabaseAdmin
            .from(
              "user_package_activations",
            )
            .select(
              `
              id,
              user_id,
              package_amount,
              is_active,
              activated_at,
              deactivated_at,
              active_from
              `,
            )
            .in(
              "user_id",
              userIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (profilesResult.error) {
      console.error(
        "TASK SUBMISSIONS PROFILES ERROR:",
        profilesResult.error,
      );
    }

    if (tasksResult.error) {
      console.error(
        "TASK SUBMISSIONS TASKS ERROR:",
        tasksResult.error,
      );
    }

    if (activationsResult.error) {
      console.error(
        "TASK SUBMISSIONS ACTIVATIONS ERROR:",
        activationsResult.error,
      );
    }

    /* =====================================================
       MAPS
    ===================================================== */

    const profileMap =
      new Map();

    for (
      const profile of
        profilesResult.data ||
        []
    ) {
      profileMap.set(
        profile.id,
        profile,
      );
    }

    const taskMap =
      new Map();

    for (
      const task of
        tasksResult.data ||
        []
    ) {
      taskMap.set(
        task.id,
        task,
      );
    }

    const activationsByUser =
      new Map<
        string,
        any[]
      >();

    for (
      const activation of
        activationsResult.data ||
        []
    ) {
      const existing =
        activationsByUser.get(
          activation.user_id,
        ) || [];

      existing.push(
        activation,
      );

      activationsByUser.set(
        activation.user_id,
        existing,
      );
    }

    /* =====================================================
       BUILD COMPLETE DATA
    ===================================================== */

    const completeData =
      rows.map(
        (submission) => {
          const profile =
            profileMap.get(
              submission.user_id,
            );

          const task =
            taskMap.get(
              submission.task_id,
            );

          const activations =
            activationsByUser.get(
              submission.user_id,
            ) || [];

          const matchingActivation =
            task
              ? activations.find(
                  (
                    activation,
                  ) =>
                    Number(
                      activation.package_amount,
                    ) ===
                      Number(
                        task.package_amount,
                      ) &&
                    activation.is_active ===
                      true,
                )
              : null;

          return {
            ...submission,

            user: profile
              ? {
                  id: profile.id,
                  username:
                    profile.username,
                  full_name:
                    profile.full_name,
                  phone:
                    profile.phone,
                  referral_code:
                    profile.referral_code,
                }
              : null,

            task: task
              ? {
                  id: task.id,
                  package_amount:
                    task.package_amount,
                  title:
                    task.title,
                  description:
                    task.description,
                  task_url:
                    task.task_url,
                  reward_amount:
                    task.reward_amount,
                  duration_hours:
                    task.duration_hours,
                  screenshot_required:
                    task.screenshot_required,
                  is_active:
                    task.is_active,
                  created_at:
                    task.created_at,
                  available_from:
                    task.available_from,
                  expires_at:
                    task.expires_at,
                }
              : null,

            package_amount:
              task?.package_amount ??
              null,

            user_has_active_matching_package:
              Boolean(
                matchingActivation,
              ),
          };
        },
      );

    /* =====================================================
       SUMMARY
       
       IMPORTANT:
       Summary uses COMPLETE DATA.
       It does NOT use status/search filters.
    ===================================================== */

    const summary = {
      total:
        completeData.length,

      pending:
        completeData.filter(
          (item) =>
            String(
              item.status,
            ).toLowerCase() ===
            "pending",
        ).length,

      approved:
        completeData.filter(
          (item) =>
            String(
              item.status,
            ).toLowerCase() ===
            "approved",
        ).length,

      rejected:
        completeData.filter(
          (item) =>
            String(
              item.status,
            ).toLowerCase() ===
            "rejected",
        ).length,

      approvedRewards:
        completeData
          .filter(
            (item) =>
              String(
                item.status,
              ).toLowerCase() ===
              "approved",
          )
          .reduce(
            (
              sum,
              item,
            ) => {
              /*
               * Prefer the actual reward stored
               * on the submission.
               *
               * This is the reward that was recorded
               * when the task was approved.
               */
              return (
                sum +
                Number(
                  item.reward_amount ||
                    0,
                )
              );
            },
            0,
          ),
    };

    /* =====================================================
       FILTER DATA FOR TABLE ONLY
    ===================================================== */

    let filteredData =
      [...completeData];

    /* Status */

    if (status !== "all") {
      filteredData =
        filteredData.filter(
          (item) =>
            String(
              item.status,
            ).toLowerCase() ===
            status.toLowerCase(),
        );
    }

    /* Search */

    if (search) {
      const lowerSearch =
        search.toLowerCase();

      filteredData =
        filteredData.filter(
          (item) => {
            const user =
              item.user;

            const task =
              item.task;

            return (
              String(
                user?.full_name ||
                  "",
              )
                .toLowerCase()
                .includes(
                  lowerSearch,
                ) ||

              String(
                user?.username ||
                  "",
              )
                .toLowerCase()
                .includes(
                  lowerSearch,
                ) ||

              String(
                user?.phone ||
                  "",
              )
                .toLowerCase()
                .includes(
                  lowerSearch,
                ) ||

              String(
                user?.referral_code ||
                  "",
              )
                .toLowerCase()
                .includes(
                  lowerSearch,
                ) ||

              String(
                task?.title ||
                  "",
              )
                .toLowerCase()
                .includes(
                  lowerSearch,
                ) ||

              String(
                task?.package_amount ||
                  "",
              )
                .toLowerCase()
                .includes(
                  lowerSearch,
                )
            );
          },
        );
    }

    /* Package */

    if (
      packageAmount !==
      "all"
    ) {
      const amount =
        Number(
          packageAmount,
        );

      filteredData =
        filteredData.filter(
          (item) =>
            Number(
              item.package_amount,
            ) === amount,
        );
    }

    /* =====================================================
       OFFICIAL PACKAGE AMOUNTS
    ===================================================== */

    const officialPackageAmounts =
      [
        500,
        1000,
        1500,
        2000,
        3000,
        5000,
        10000,
        20000,
        25000,
      ];

    const packageAmounts =
      [
        ...new Set([
          ...officialPackageAmounts,
          ...completeData
            .map(
              (item) =>
                item.package_amount,
            )
            .filter(
              (
                value,
              ) =>
                value !==
                null,
            ),
        ]),
      ].sort(
        (a, b) =>
          Number(a) -
          Number(b),
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      /*
       * Only filtered records go to table.
       */
      submissions:
        filteredData,

      /*
       * Summary always represents
       * the complete submission history.
       */
      summary,

      packageAmounts,
    });
  } catch (error) {
    console.error(
      "TASK SUBMISSIONS API ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          cleanError(error),
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PATCH — APPROVE / REJECT
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

    const submissionId =
      String(
        body.submissionId ||
          "",
      ).trim();

    const action =
      String(
        body.action || "",
      )
        .trim()
        .toLowerCase();

    const adminNote =
      body.adminNote ===
        null ||
      body.adminNote ===
        undefined
        ? null
        : String(
            body.adminNote,
          ).trim();

    if (!submissionId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submission ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      ![
        "approve",
        "reject",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Action must be either approve or reject.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       APPROVE
    ===================================================== */

    if (
      action ===
      "approve"
    ) {
      const rpcResult =
        await supabaseAdmin.rpc(
          "admin_approve_package_task_submission",
          {
            p_submission_id:
              submissionId,
          },
        );

      if (rpcResult.error) {
        console.error(
          "TASK SUBMISSION APPROVE RPC ERROR:",
          rpcResult.error,
        );

        return NextResponse.json(
          {
            success: false,
            error:
              mapRpcError(
                rpcResult
                  .error
                  .message,
              ),
          },
          {
            status: 400,
          },
        );
      }

      const {
        data: updatedSubmission,
        error:
          fetchError,
      } =
        await supabaseAdmin
          .from(
            "package_task_submissions",
          )
          .select(
            `
            id,
            user_id,
            task_id,
            screenshot_url,
            status,
            admin_note,
            reward_amount,
            created_at,
            reviewed_at,
            reviewed_by
            `,
          )
          .eq(
            "id",
            submissionId,
          )
          .maybeSingle();

      if (fetchError) {
        console.error(
          "UPDATED APPROVED SUBMISSION FETCH ERROR:",
          fetchError,
        );
      }

      return NextResponse.json({
        success: true,
        action: "approved",
        result:
          rpcResult.data,
        submission:
          updatedSubmission,
      });
    }

    /* =====================================================
       REJECT
    ===================================================== */

    const rpcResult =
      await supabaseAdmin.rpc(
        "admin_reject_package_task_submission",
        {
          p_submission_id:
            submissionId,
          p_admin_note:
            adminNote,
        },
      );

    if (rpcResult.error) {
      console.error(
        "TASK SUBMISSION REJECT RPC ERROR:",
        rpcResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            mapRpcError(
              rpcResult.error
                .message,
            ),
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: updatedSubmission,
      error:
        fetchError,
    } =
      await supabaseAdmin
        .from(
          "package_task_submissions",
        )
        .select(
          `
          id,
          user_id,
          task_id,
          screenshot_url,
          status,
          admin_note,
          reward_amount,
          created_at,
          reviewed_at,
          reviewed_by
          `,
        )
        .eq(
          "id",
          submissionId,
        )
        .maybeSingle();

    if (fetchError) {
      console.error(
        "UPDATED REJECTED SUBMISSION FETCH ERROR:",
        fetchError,
      );
    }

    return NextResponse.json({
      success: true,
      action: "rejected",
      result:
        rpcResult.data,
      submission:
        updatedSubmission,
    });
  } catch (error) {
    console.error(
      "TASK SUBMISSION PATCH ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          cleanError(error),
      },
      {
        status: 500,
      },
    );
  }
}