import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

/* =========================================================
   SUPABASE ADMIN CLIENT
========================================================= */

function getSupabase() {
  if (!SUPABASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing.",
    );
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

/* =========================================================
   VERIFY ADMIN SESSION
   EXACT SAME FORMAT AS /api/admin/session
========================================================= */

function verifySessionToken(
  token: string,
): AdminSession | null {
  if (
    !ADMIN_USERNAME ||
    !ADMIN_SESSION_SECRET
  ) {
    console.error(
      "ADMIN_USERNAME or ADMIN_SESSION_SECRET is missing.",
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

    /*
     * Login creates:
     *
     * username:issuedAt:signature
     *
     * Then the entire string is base64url encoded.
     */

    if (
      parts.length !== 3
    ) {
      console.error(
        "TASKS AUTH: Invalid token structure.",
      );

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

    /* USERNAME */

    if (
      username !==
      ADMIN_USERNAME
    ) {
      console.error(
        "TASKS AUTH: Username mismatch.",
      );

      return null;
    }

    /* TIMESTAMP */

    const issuedAt =
      Number(
        issuedAtString,
      );

    if (
      !Number.isFinite(
        issuedAt,
      )
    ) {
      return null;
    }

    const now =
      Date.now();

    /*
     * Token cannot be issued
     * more than 60 seconds in future.
     */

    if (
      issuedAt >
      now + 60 * 1000
    ) {
      return null;
    }

    /*
     * Token expires after 24 hours.
     */

    if (
      now - issuedAt >
      SESSION_MAX_AGE_SECONDS *
        1000
    ) {
      console.error(
        "TASKS AUTH: Session expired.",
      );

      return null;
    }

    /* SIGNATURE */

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
      console.error(
        "TASKS AUTH: Signature mismatch.",
      );

      return null;
    }

    return {
      username,
      issuedAt,
    };
  } catch (error) {
    console.error(
      "TASKS TOKEN VERIFY ERROR:",
      error,
    );

    return null;
  }
}

/* =========================================================
   GET ADMIN SESSION FROM REQUEST
========================================================= */

function getAdminSession(
  request: NextRequest,
): AdminSession | null {
  const token =
    request.cookies.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    console.error(
      "TASKS AUTH: Admin cookie not found.",
    );

    return null;
  }

  return verifySessionToken(
    token,
  );
}

/* =========================================================
   ERROR RESPONSE
========================================================= */

function errorResponse(
  message: string,
  status: number,
  details?: string,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details
        ? { details }
        : {}),
    },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

/* =========================================================
   NORMALIZE TASK
========================================================= */

function normalizeTask(
  row: any,
) {
  return {
    ...row,

    package_amount:
      Number(
        row.package_amount ?? 0,
      ),

    reward_amount:
      Number(
        row.reward_amount ?? 0,
      ),

    duration_hours:
      Number(
        row.duration_hours ?? 24,
      ),

    is_active:
      Boolean(
        row.is_active,
      ),

    screenshot_required:
      Boolean(
        row.screenshot_required,
      ),
  };
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: NextRequest,
) {
  try {
    const session =
      getAdminSession(
        request,
      );

    if (!session) {
      return errorResponse(
        "Unauthorized",
        401,
      );
    }

    const {
      searchParams,
    } = new URL(
      request.url,
    );

    const status =
      String(
        searchParams.get(
          "status",
        ) ?? "all",
      )
        .trim()
        .toLowerCase();

    const packageAmount =
      String(
        searchParams.get(
          "packageAmount",
        ) ?? "all",
      ).trim();

    const search =
      String(
        searchParams.get(
          "search",
        ) ?? "",
      )
        .trim()
        .toLowerCase();

    const supabase =
      getSupabase();

    let query = supabase
      .from("package_tasks")
      .select(`
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
        expires_at,
        updated_at,
        available_from
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    /* STATUS */

    if (
      status === "active" ||
      status === "inactive"
    ) {
      query =
        query.eq(
          "is_active",
          status === "active",
        );
    }

    /* PACKAGE AMOUNT */

    if (
      packageAmount &&
      packageAmount !== "all"
    ) {
      const amount =
        Number(
          packageAmount,
        );

      if (
        Number.isFinite(
          amount,
        )
      ) {
        query =
          query.eq(
            "package_amount",
            amount,
          );
      }
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "ADMIN TASKS GET DATABASE ERROR:",
        error,
      );

      return errorResponse(
        "Failed to load tasks.",
        500,
        error.message,
      );
    }

    let tasks =
      (data ?? []).map(
        normalizeTask,
      );

    /* SEARCH */

    if (search) {
      tasks =
        tasks.filter(
          (task) =>
            String(
              task.title,
            )
              .toLowerCase()
              .includes(
                search,
              ) ||
            String(
              task.description ??
                "",
            )
              .toLowerCase()
              .includes(
                search,
              ) ||
            String(
              task.task_url ??
                "",
            )
              .toLowerCase()
              .includes(
                search,
              ),
        );
    }

    /* SUMMARY */

    const summary = {
      total:
        tasks.length,

      active:
        tasks.filter(
          (task) =>
            task.is_active,
        ).length,

      inactive:
        tasks.filter(
          (task) =>
            !task.is_active,
        ).length,

      totalRewards:
        tasks.reduce(
          (
            sum,
            task,
          ) =>
            sum +
            Number(
              task.reward_amount ||
                0,
            ),
          0,
        ),
    };

    /* PACKAGE AMOUNTS */

    const packageAmounts =
      Array.from(
        new Set(
          tasks
            .map(
              (task) =>
                Number(
                  task.package_amount,
                ),
            )
            .filter(
              (amount) =>
                amount > 0,
            ),
        ),
      ).sort(
        (
          a,
          b,
        ) =>
          a - b,
      );

    return NextResponse.json(
      {
        success: true,

        authenticated: true,

        admin: {
          username:
            session.username,
        },

        tasks,

        summary,

        packageAmounts,
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
      "ADMIN TASKS GET ERROR:",
      error,
    );

    return errorResponse(
      "Server error.",
      500,
      error instanceof Error
        ? error.message
        : undefined,
    );
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest,
) {
  try {
    const session =
      getAdminSession(
        request,
      );

    if (!session) {
      return errorResponse(
        "Unauthorized",
        401,
      );
    }

    const body =
      await request.json();

    const packageAmount =
      Number(
        body.packageAmount,
      );

    const title =
      String(
        body.title ?? "",
      ).trim();

    const description =
      String(
        body.description ?? "",
      ).trim();

    const taskUrl =
      String(
        body.taskUrl ?? "",
      ).trim();

    const rewardAmount =
      Number(
        body.rewardAmount,
      );

    const durationHours =
      Number(
        body.durationHours,
      );

    const screenshotRequired =
      Boolean(
        body.screenshotRequired,
      );

    const isActive =
      body.isActive !== false;

    const availableFrom =
      body.availableFrom
        ? String(
            body.availableFrom,
          )
        : null;

    const expiresAt =
      body.expiresAt
        ? String(
            body.expiresAt,
          )
        : null;

    /* VALIDATION */

    if (
      !Number.isFinite(
        packageAmount,
      ) ||
      packageAmount <= 0
    ) {
      return errorResponse(
        "Valid package amount is required.",
        400,
      );
    }

    if (!title) {
      return errorResponse(
        "Task title is required.",
        400,
      );
    }

    if (!taskUrl) {
      return errorResponse(
        "Task URL is required.",
        400,
      );
    }

    if (
      !Number.isFinite(
        rewardAmount,
      ) ||
      rewardAmount < 0
    ) {
      return errorResponse(
        "Valid reward amount is required.",
        400,
      );
    }

    if (
      !Number.isFinite(
        durationHours,
      ) ||
      durationHours <= 0
    ) {
      return errorResponse(
        "Duration must be greater than 0 hours.",
        400,
      );
    }

    const supabase =
      getSupabase();

    const {
      data,
      error,
    } = await supabase
      .from("package_tasks")
      .insert({
        package_amount:
          packageAmount,

        title,

        description:
          description || null,

        task_url:
          taskUrl,

        reward_amount:
          rewardAmount,

        duration_hours:
          durationHours,

        screenshot_required:
          screenshotRequired,

        is_active:
          isActive,

        available_from:
          availableFrom,

        expires_at:
          expiresAt,
      })
      .select(`
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
        expires_at,
        updated_at,
        available_from
      `)
      .maybeSingle();

    if (error) {
      console.error(
        "CREATE TASK ERROR:",
        error,
      );

      return errorResponse(
        "Failed to create task.",
        500,
        error.message,
      );
    }

    return NextResponse.json(
      {
        success: true,
        authenticated: true,

        task:
          data
            ? normalizeTask(
                data,
              )
            : null,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "ADMIN TASK POST ERROR:",
      error,
    );

    return errorResponse(
      "Server error.",
      500,
      error instanceof Error
        ? error.message
        : undefined,
    );
  }
}

/* =========================================================
   PATCH
========================================================= */

export async function PATCH(
  request: NextRequest,
) {
  try {
    const session =
      getAdminSession(
        request,
      );

    if (!session) {
      return errorResponse(
        "Unauthorized",
        401,
      );
    }

    const body =
      await request.json();

    const taskId =
      String(
        body.taskId ?? "",
      ).trim();

    if (!taskId) {
      return errorResponse(
        "Task ID is required.",
        400,
      );
    }

    const updates: Record<
      string,
      unknown
    > = {};

    if (
      body.packageAmount !==
      undefined
    ) {
      const value =
        Number(
          body.packageAmount,
        );

      if (
        !Number.isFinite(
          value,
        ) ||
        value <= 0
      ) {
        return errorResponse(
          "Invalid package amount.",
          400,
        );
      }

      updates.package_amount =
        value;
    }

    if (
      body.title !==
      undefined
    ) {
      const value =
        String(
          body.title,
        ).trim();

      if (!value) {
        return errorResponse(
          "Task title is required.",
          400,
        );
      }

      updates.title =
        value;
    }

    if (
      body.description !==
      undefined
    ) {
      const value =
        String(
          body.description ?? "",
        ).trim();

      updates.description =
        value || null;
    }

    if (
      body.taskUrl !==
      undefined
    ) {
      const value =
        String(
          body.taskUrl,
        ).trim();

      if (!value) {
        return errorResponse(
          "Task URL is required.",
          400,
        );
      }

      updates.task_url =
        value;
    }

    if (
      body.rewardAmount !==
      undefined
    ) {
      const value =
        Number(
          body.rewardAmount,
        );

      if (
        !Number.isFinite(
          value,
        ) ||
        value < 0
      ) {
        return errorResponse(
          "Invalid reward amount.",
          400,
        );
      }

      updates.reward_amount =
        value;
    }

    if (
      body.durationHours !==
      undefined
    ) {
      const value =
        Number(
          body.durationHours,
        );

      if (
        !Number.isFinite(
          value,
        ) ||
        value <= 0
      ) {
        return errorResponse(
          "Invalid duration.",
          400,
        );
      }

      updates.duration_hours =
        value;
    }

    if (
      body.screenshotRequired !==
      undefined
    ) {
      updates.screenshot_required =
        Boolean(
          body.screenshotRequired,
        );
    }

    if (
      body.isActive !==
      undefined
    ) {
      updates.is_active =
        Boolean(
          body.isActive,
        );
    }

    if (
      body.availableFrom !==
      undefined
    ) {
      updates.available_from =
        body.availableFrom
          ? String(
              body.availableFrom,
            )
          : null;
    }

    if (
      body.expiresAt !==
      undefined
    ) {
      updates.expires_at =
        body.expiresAt
          ? String(
              body.expiresAt,
            )
          : null;
    }

    updates.updated_at =
      new Date().toISOString();

    const supabase =
      getSupabase();

    const {
      data,
      error,
    } = await supabase
      .from("package_tasks")
      .update(updates)
      .eq(
        "id",
        taskId,
      )
      .select(`
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
        expires_at,
        updated_at,
        available_from
      `)
      .maybeSingle();

    if (error) {
      console.error(
        "UPDATE TASK ERROR:",
        error,
      );

      return errorResponse(
        "Failed to update task.",
        500,
        error.message,
      );
    }

    if (!data) {
      return errorResponse(
        "Task not found.",
        404,
      );
    }

    return NextResponse.json(
      {
        success: true,
        authenticated: true,

        task:
          normalizeTask(
            data,
          ),
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "ADMIN TASK PATCH ERROR:",
      error,
    );

    return errorResponse(
      "Server error.",
      500,
      error instanceof Error
        ? error.message
        : undefined,
    );
  }
}

/* =========================================================
   DELETE
========================================================= */

export async function DELETE(
  request: NextRequest,
) {
  try {
    const session =
      getAdminSession(
        request,
      );

    if (!session) {
      return errorResponse(
        "Unauthorized",
        401,
      );
    }

    const {
      searchParams,
    } = new URL(
      request.url,
    );

    const taskId =
      String(
        searchParams.get(
          "taskId",
        ) ?? "",
      ).trim();

    if (!taskId) {
      return errorResponse(
        "Task ID is required.",
        400,
      );
    }

    const supabase =
      getSupabase();

    /* CHECK SUBMISSIONS */

    const {
      data:
        submissionData,
      error:
        submissionError,
    } = await supabase
      .from(
        "package_task_submissions",
      )
      .select("id")
      .eq(
        "task_id",
        taskId,
      )
      .limit(1);

    if (submissionError) {
      console.error(
        "CHECK TASK SUBMISSIONS ERROR:",
        submissionError,
      );

      return errorResponse(
        "Could not check task submissions.",
        500,
        submissionError.message,
      );
    }

    if (
      (
        submissionData ??
        []
      ).length > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This task already has submissions. Deactivate it instead of deleting it.",
        },
        {
          status: 409,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /* DELETE */

    const {
      error,
    } = await supabase
      .from("package_tasks")
      .delete()
      .eq(
        "id",
        taskId,
      );

    if (error) {
      console.error(
        "DELETE TASK ERROR:",
        error,
      );

      return errorResponse(
        "Failed to delete task.",
        500,
        error.message,
      );
    }

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "ADMIN TASK DELETE ERROR:",
      error,
    );

    return errorResponse(
      "Server error.",
      500,
      error instanceof Error
        ? error.message
        : undefined,
    );
  }
}