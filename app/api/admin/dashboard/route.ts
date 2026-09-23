import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SESSION_COOKIE_NAME = "pocket_money_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type AdminSession = {
  username: string;
  issuedAt: number;
};

function clearSessionCookie(
  response: NextResponse,
): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

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
    const decoded = Buffer.from(
      token,
      "base64url",
    ).toString("utf8");

    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return null;
    }

    const username = parts[0];
    const issuedAtString = parts[1];
    const signature = parts[2];

    if (
      !username ||
      !issuedAtString ||
      !signature
    ) {
      return null;
    }

    if (username !== ADMIN_USERNAME) {
      return null;
    }

    const issuedAt = Number(
      issuedAtString,
    );

    if (!Number.isFinite(issuedAt)) {
      return null;
    }

    const now = Date.now();

    if (issuedAt > now + 60 * 1000) {
      return null;
    }

    if (
      now - issuedAt >
      SESSION_MAX_AGE_SECONDS * 1000
    ) {
      return null;
    }

    const payload =
      `${username}:${issuedAtString}`;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          ADMIN_SESSION_SECRET,
        )
        .update(payload)
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

    if (
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer,
      )
    ) {
      return null;
    }

    return {
      username,
      issuedAt,
    };
  } catch (error) {
    console.error(
      "ADMIN TOKEN VERIFY ERROR:",
      error,
    );

    return null;
  }
}

function getSessionFromRequest(
  request: Request,
): AdminSession | null {
  const cookieHeader =
    request.headers.get("cookie") || "";

  const cookies = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  const sessionCookie =
    cookies.find((item) =>
      item.startsWith(
        `${SESSION_COOKIE_NAME}=`,
      ),
    );

  if (!sessionCookie) {
    return null;
  }

  const token =
    sessionCookie
      .slice(
        `${SESSION_COOKIE_NAME}=`.length,
      )
      .trim();

  if (!token) {
    return null;
  }

  try {
    return verifySessionToken(
      decodeURIComponent(token),
    );
  } catch {
    return null;
  }
}

function createSupabaseAdmin() {
  if (!SUPABASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing from .env.local.",
    );
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local.",
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

function numberValue(
  value: unknown,
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function statusEquals(
  value: unknown,
  expected: string,
): boolean {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase() ===
    expected.toLowerCase()
  );
}

function safeDate(
  value: unknown,
): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(
    String(value),
  ).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

export async function GET(
  request: Request,
) {
  try {
    /*
     * =========================================
     * ADMIN AUTHENTICATION
     * =========================================
     */

    const session =
      getSessionFromRequest(
        request,
      );

    if (!session) {
      const response =
        NextResponse.json(
          {
            success: false,
            authenticated: false,
            error:
              "Admin session পাওয়া যায়নি বা বৈধ নয়।",
          },
          {
            status: 401,
          },
        );

      return clearSessionCookie(
        response,
      );
    }

    /*
     * =========================================
     * SUPABASE ADMIN CLIENT
     * =========================================
     */

    const supabase =
      createSupabaseAdmin();

    /*
     * =========================================
     * DATABASE QUERIES
     * =========================================
     */

    const [
      profilesResult,
      walletsResult,
      activationsResult,
      depositsResult,
      withdrawalsResult,
      tasksResult,
      packageTasksResult,
      submissionsResult,
      packageSubmissionsResult,
      referralsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,username,full_name,phone,role,referral_code,created_at,updated_at",
        ),

      supabase
        .from("wallets")
        .select(
          "user_id,balance,deposit_balance,earning_balance,total_deposited,total_withdrawn,total_earned,deposit_bonus_claimed,deposit_bonus_amount",
        ),

      supabase
        .from("user_package_activations")
        .select(
          "id,user_id,package_amount,is_active,activated_at,deactivated_at,created_at,updated_at,active_from",
        ),

      supabase
        .from("deposits")
        .select(
          "id,user_id,amount,payment_method,payment_number,transaction_id,status,bonus_amount,created_at,approved_at,updated_at",
        ),

      supabase
        .from("withdrawals")
        .select(
          "id,user_id,payment_method,account_number,amount,status,admin_note,reviewed_by,requested_at,reviewed_at,created_at",
        ),

      supabase
        .from("tasks")
        .select(
          "id,title,description,reward_amount,task_url,screenshot_required,is_active,created_at,updated_at",
        ),

      supabase
        .from("package_tasks")
        .select(
          "id,package_amount,title,description,task_url,reward_amount,duration_hours,screenshot_required,is_active,created_at,expires_at,updated_at,available_from",
        ),

      supabase
        .from("task_submissions")
        .select(
          "id,task_id,user_id,screenshot_url,status,admin_note,reviewed_by,submitted_at,reviewed_at",
        ),

      supabase
        .from(
          "package_task_submissions",
        )
        .select(
          "id,user_id,task_id,screenshot_url,status,admin_note,reward_amount,created_at,reviewed_at,reviewed_by",
        ),

      supabase
        .from("referrals")
        .select(
          "id,referrer_id,referred_user_id,referral_code,status,qualified_at,created_at",
        ),
    ]);

    /*
     * =========================================
     * QUERY ERROR CHECK
     * =========================================
     */

    if (profilesResult.error) {
      console.error(
        "PROFILES QUERY ERROR:",
        profilesResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in profiles: ${profilesResult.error.message}`,
        },
        { status: 500 },
      );
    }

    if (walletsResult.error) {
      console.error(
        "WALLETS QUERY ERROR:",
        walletsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in wallets: ${walletsResult.error.message}`,
        },
        { status: 500 },
      );
    }

    if (activationsResult.error) {
      console.error(
        "ACTIVATIONS QUERY ERROR:",
        activationsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in user_package_activations: ${activationsResult.error.message}`,
        },
        { status: 500 },
      );
    }

    if (depositsResult.error) {
      console.error(
        "DEPOSITS QUERY ERROR:",
        depositsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in deposits: ${depositsResult.error.message}`,
        },
        { status: 500 },
      );
    }

    if (withdrawalsResult.error) {
      console.error(
        "WITHDRAWALS QUERY ERROR:",
        withdrawalsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in withdrawals: ${withdrawalsResult.error.message}`,
        },
        { status: 500 },
      );
    }

    if (tasksResult.error) {
      console.error(
        "TASKS QUERY ERROR:",
        tasksResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in tasks: ${tasksResult.error.message}`,
        },
        { status: 500 },
      );
    }

    if (packageTasksResult.error) {
      console.error(
        "PACKAGE TASKS QUERY ERROR:",
        packageTasksResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in package_tasks: ${packageTasksResult.error.message}`,
        },
        { status: 500 },
      );
    }

    if (submissionsResult.error) {
      console.error(
        "SUBMISSIONS QUERY ERROR:",
        submissionsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in task_submissions: ${submissionsResult.error.message}`,
        },
        { status: 500 },
      );
    }

    if (packageSubmissionsResult.error) {
      console.error(
        "PACKAGE SUBMISSIONS QUERY ERROR:",
        packageSubmissionsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in package_task_submissions: ${packageSubmissionsResult.error.message}`,
        },
        { status: 500 },
      );
    }

    if (referralsResult.error) {
      console.error(
        "REFERRALS QUERY ERROR:",
        referralsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error:
            `Database error in referrals: ${referralsResult.error.message}`,
        },
        { status: 500 },
      );
    }

    /*
     * =========================================
     * DATA
     * =========================================
     */

    const profiles =
      profilesResult.data || [];

    const wallets =
      walletsResult.data || [];

    const activations =
      activationsResult.data || [];

    const deposits =
      depositsResult.data || [];

    const withdrawals =
      withdrawalsResult.data || [];

    const tasks =
      tasksResult.data || [];

    const packageTasks =
      packageTasksResult.data || [];

    const submissions =
      submissionsResult.data || [];

    const packageSubmissions =
      packageSubmissionsResult.data || [];

    const referrals =
      referralsResult.data || [];

    /*
     * =========================================
     * PROFILE MAP
     * =========================================
     */

    const profileMap = new Map<
      string,
      (typeof profiles)[number]
    >();

    for (
      const profile of profiles
    ) {
      profileMap.set(
        profile.id,
        profile,
      );
    }

    /*
     * =========================================
     * USERS
     * =========================================
     */

    const userProfiles =
      profiles.filter(
        (profile) =>
          profile.role !== "admin",
      );

    const totalUsers =
      userProfiles.length;

    const totalAdmins =
      profiles.filter(
        (profile) =>
          profile.role === "admin",
      ).length;

    const activePackageUserIds =
      new Set(
        activations
          .filter(
            (activation) =>
              activation.is_active ===
              true,
          )
          .map(
            (activation) =>
              activation.user_id,
          ),
      );

    /*
     * =========================================
     * PACKAGE STATISTICS
     * =========================================
     */

    const activeActivations =
      activations.filter(
        (activation) =>
          activation.is_active ===
          true,
      );

    const packageStatsMap =
      new Map<
        string,
        {
          package_amount: number;
          total: number;
          active: number;
        }
      >();

    for (
      const activation of activations
    ) {
      const amount =
        numberValue(
          activation.package_amount,
        );

      const key = String(amount);

      if (
        !packageStatsMap.has(
          key,
        )
      ) {
        packageStatsMap.set(
          key,
          {
            package_amount:
              amount,
            total: 0,
            active: 0,
          },
        );
      }

      const stats =
        packageStatsMap.get(
          key,
        );

      if (!stats) {
        continue;
      }

      stats.total += 1;

      if (
        activation.is_active
      ) {
        stats.active += 1;
      }
    }

    const packageStats =
      Array.from(
        packageStatsMap.values(),
      ).sort(
        (a, b) =>
          a.package_amount -
          b.package_amount,
      );

    /*
     * =========================================
     * DEPOSIT STATISTICS
     * =========================================
     */

    const pendingDeposits =
      deposits.filter(
        (deposit) =>
          statusEquals(
            deposit.status,
            "pending",
          ),
      );

    const approvedDeposits =
      deposits.filter(
        (deposit) =>
          statusEquals(
            deposit.status,
            "approved",
          ),
      );

    const rejectedDeposits =
      deposits.filter(
        (deposit) =>
          statusEquals(
            deposit.status,
            "rejected",
          ),
      );

    const depositTotalAmount =
      deposits.reduce(
        (sum, deposit) =>
          sum +
          numberValue(
            deposit.amount,
          ),
        0,
      );

    const pendingDepositAmount =
      pendingDeposits.reduce(
        (sum, deposit) =>
          sum +
          numberValue(
            deposit.amount,
          ),
        0,
      );

    const approvedDepositAmount =
      approvedDeposits.reduce(
        (sum, deposit) =>
          sum +
          numberValue(
            deposit.amount,
          ),
        0,
      );

    const rejectedDepositAmount =
      rejectedDeposits.reduce(
        (sum, deposit) =>
          sum +
          numberValue(
            deposit.amount,
          ),
        0,
      );

    const depositBonusAmount =
      approvedDeposits.reduce(
        (sum, deposit) =>
          sum +
          numberValue(
            deposit.bonus_amount,
          ),
        0,
      );

    /*
     * =========================================
     * WITHDRAWAL STATISTICS
     * =========================================
     */

    const pendingWithdrawals =
      withdrawals.filter(
        (withdrawal) =>
          statusEquals(
            withdrawal.status,
            "pending",
          ),
      );

    const approvedWithdrawals =
      withdrawals.filter(
        (withdrawal) =>
          statusEquals(
            withdrawal.status,
            "approved",
          ),
      );

    const rejectedWithdrawals =
      withdrawals.filter(
        (withdrawal) =>
          statusEquals(
            withdrawal.status,
            "rejected",
          ),
      );

    const withdrawalTotalAmount =
      withdrawals.reduce(
        (sum, withdrawal) =>
          sum +
          numberValue(
            withdrawal.amount,
          ),
        0,
      );

    const pendingWithdrawalAmount =
      pendingWithdrawals.reduce(
        (sum, withdrawal) =>
          sum +
          numberValue(
            withdrawal.amount,
          ),
        0,
      );

    const approvedWithdrawalAmount =
      approvedWithdrawals.reduce(
        (sum, withdrawal) =>
          sum +
          numberValue(
            withdrawal.amount,
          ),
        0,
      );

    const rejectedWithdrawalAmount =
      rejectedWithdrawals.reduce(
        (sum, withdrawal) =>
          sum +
          numberValue(
            withdrawal.amount,
          ),
        0,
      );

    /*
     * =========================================
     * NORMAL TASK STATISTICS
     * =========================================
     */

    const activeNormalTasks =
      tasks.filter(
        (task) =>
          task.is_active ===
          true,
      );

    const pendingNormalSubmissions =
      submissions.filter(
        (submission) =>
          statusEquals(
            submission.status,
            "pending",
          ),
      );

    const approvedNormalSubmissions =
      submissions.filter(
        (submission) =>
          statusEquals(
            submission.status,
            "approved",
          ),
      );

    const taskRewardMap =
      new Map<
        string,
        number
      >();

    for (
      const task of tasks
    ) {
      taskRewardMap.set(
        task.id,
        numberValue(
          task.reward_amount,
        ),
      );
    }

    const normalRewardPaid =
      approvedNormalSubmissions.reduce(
        (
          sum,
          submission,
        ) =>
          sum +
          numberValue(
            taskRewardMap.get(
              submission.task_id,
            ),
          ),
        0,
      );

    /*
     * =========================================
     * PACKAGE TASK STATISTICS
     * =========================================
     */

    const activePackageTasks =
      packageTasks.filter(
        (task) =>
          task.is_active ===
          true,
      );

    const pendingPackageSubmissions =
      packageSubmissions.filter(
        (submission) =>
          statusEquals(
            submission.status,
            "pending",
          ),
      );

    const approvedPackageSubmissions =
      packageSubmissions.filter(
        (submission) =>
          statusEquals(
            submission.status,
            "approved",
          ),
      );

    const packageTaskRewardMap =
      new Map<
        string,
        number
      >();

    for (
      const task of packageTasks
    ) {
      packageTaskRewardMap.set(
        task.id,
        numberValue(
          task.reward_amount,
        ),
      );
    }

    const packageRewardPaid =
      approvedPackageSubmissions.reduce(
        (
          sum,
          submission,
        ) => {
          const storedReward =
            numberValue(
              submission.reward_amount,
            );

          if (
            storedReward > 0
          ) {
            return (
              sum +
              storedReward
            );
          }

          return (
            sum +
            numberValue(
              packageTaskRewardMap.get(
                submission.task_id,
              ),
            )
          );
        },
        0,
      );

    /*
     * =========================================
     * REFERRAL STATISTICS
     * =========================================
     */

    const pendingReferrals =
      referrals.filter(
        (referral) =>
          statusEquals(
            referral.status,
            "pending",
          ),
      );

    const qualifiedReferrals =
      referrals.filter(
        (referral) =>
          statusEquals(
            referral.status,
            "qualified",
          ),
      );

    const completedReferrals =
      referrals.filter(
        (referral) =>
          statusEquals(
            referral.status,
            "completed",
          ),
      );

    const rejectedReferrals =
      referrals.filter(
        (referral) =>
          statusEquals(
            referral.status,
            "rejected",
          ),
      );

    const uniqueReferrers =
      new Set(
        referrals.map(
          (referral) =>
            referral.referrer_id,
        ),
      ).size;

    /*
     * =========================================
     * WALLET STATISTICS
     * =========================================
     */

    const walletDepositBalance =
      wallets.reduce(
        (sum, wallet) =>
          sum +
          numberValue(
            wallet.deposit_balance,
          ),
        0,
      );

    const walletEarningBalance =
      wallets.reduce(
        (sum, wallet) =>
          sum +
          numberValue(
            wallet.earning_balance,
          ),
        0,
      );

    const walletTotalBalance =
      walletDepositBalance +
      walletEarningBalance;

    const walletTotalEarned =
      wallets.reduce(
        (sum, wallet) =>
          sum +
          numberValue(
            wallet.total_earned,
          ),
        0,
      );

    const walletTotalWithdrawn =
      wallets.reduce(
        (sum, wallet) =>
          sum +
          numberValue(
            wallet.total_withdrawn,
          ),
        0,
      );

    const walletTotalDeposited =
      wallets.reduce(
        (sum, wallet) =>
          sum +
          numberValue(
            wallet.total_deposited,
          ),
        0,
      );

    /*
     * =========================================
     * RECENT DEPOSITS
     * =========================================
     */

    const recentDeposits =
      [...deposits]
        .sort(
          (a, b) =>
            safeDate(
              b.created_at,
            ) -
            safeDate(
              a.created_at,
            ),
        )
        .slice(0, 10)
        .map(
          (deposit) => {
            const profile =
              profileMap.get(
                deposit.user_id,
              );

            return {
              ...deposit,

              user: {
                id:
                  profile?.id ||
                  deposit.user_id,

                name:
                  profile?.full_name ||
                  profile?.username ||
                  "Unknown User",

                username:
                  profile?.username ||
                  "",

                phone:
                  profile?.phone ||
                  "",
              },
            };
          },
        );

    /*
     * =========================================
     * RECENT WITHDRAWALS
     * =========================================
     */

    const recentWithdrawals =
      [...withdrawals]
        .sort(
          (a, b) =>
            safeDate(
              b.requested_at ||
                b.created_at,
            ) -
            safeDate(
              a.requested_at ||
                a.created_at,
            ),
        )
        .slice(0, 10)
        .map(
          (withdrawal) => {
            const profile =
              profileMap.get(
                withdrawal.user_id,
              );

            return {
              ...withdrawal,

              user: {
                id:
                  profile?.id ||
                  withdrawal.user_id,

                name:
                  profile?.full_name ||
                  profile?.username ||
                  "Unknown User",

                username:
                  profile?.username ||
                  "",

                phone:
                  profile?.phone ||
                  "",
              },
            };
          },
        );

    /*
     * =========================================
     * RECENT NORMAL SUBMISSIONS
     * =========================================
     */

    const recentNormalSubmissions =
      [...submissions]
        .sort(
          (a, b) =>
            safeDate(
              b.submitted_at,
            ) -
            safeDate(
              a.submitted_at,
            ),
        )
        .slice(0, 10)
        .map(
          (submission) => {
            const profile =
              profileMap.get(
                submission.user_id,
              );

            const task =
              tasks.find(
                (item) =>
                  item.id ===
                  submission.task_id,
              );

            return {
              ...submission,

              submission_type:
                "normal",

              reward_amount:
                numberValue(
                  task?.reward_amount,
                ),

              task: task
                ? {
                    id: task.id,

                    title:
                      task.title,

                    reward_amount:
                      numberValue(
                        task.reward_amount,
                      ),
                  }
                : null,

              user: {
                id:
                  profile?.id ||
                  submission.user_id,

                name:
                  profile?.full_name ||
                  profile?.username ||
                  "Unknown User",

                username:
                  profile?.username ||
                  "",

                phone:
                  profile?.phone ||
                  "",
              },
            };
          },
        );

    /*
     * =========================================
     * RECENT PACKAGE SUBMISSIONS
     * =========================================
     */

    const recentPackageSubmissions =
      [...packageSubmissions]
        .sort(
          (a, b) =>
            safeDate(
              b.created_at,
            ) -
            safeDate(
              a.created_at,
            ),
        )
        .slice(0, 10)
        .map(
          (submission) => {
            const profile =
              profileMap.get(
                submission.user_id,
              );

            const task =
              packageTasks.find(
                (item) =>
                  item.id ===
                  submission.task_id,
              );

            const storedReward =
              numberValue(
                submission.reward_amount,
              );

            const rewardAmount =
              storedReward > 0
                ? storedReward
                : numberValue(
                    task?.reward_amount,
                  );

            return {
              ...submission,

              submission_type:
                "package",

              reward_amount:
                rewardAmount,

              task: task
                ? {
                    id: task.id,

                    title:
                      task.title,

                    package_amount:
                      numberValue(
                        task.package_amount,
                      ),

                    reward_amount:
                      numberValue(
                        task.reward_amount,
                      ),
                  }
                : null,

              user: {
                id:
                  profile?.id ||
                  submission.user_id,

                name:
                  profile?.full_name ||
                  profile?.username ||
                  "Unknown User",

                username:
                  profile?.username ||
                  "",

                phone:
                  profile?.phone ||
                  "",
              },
            };
          },
        );

    /*
     * =========================================
     * MERGED RECENT SUBMISSIONS
     * =========================================
     */

    const recentSubmissions = [
      ...recentNormalSubmissions.map(
        (item) => ({
          ...item,

          activity_date:
            item.submitted_at ||
            null,
        }),
      ),

      ...recentPackageSubmissions.map(
        (item) => ({
          ...item,

          activity_date:
            item.created_at ||
            null,
        }),
      ),
    ]
      .sort(
        (a, b) =>
          safeDate(
            b.activity_date,
          ) -
          safeDate(
            a.activity_date,
          ),
      )
      .slice(0, 10);

    /*
     * =========================================
     * RECENT REFERRALS
     * =========================================
     */

    const recentReferrals =
      [...referrals]
        .sort(
          (a, b) =>
            safeDate(
              b.created_at,
            ) -
            safeDate(
              a.created_at,
            ),
        )
        .slice(0, 10)
        .map(
          (referral) => {
            const referrer =
              profileMap.get(
                referral.referrer_id,
              );

            const referredUser =
              profileMap.get(
                referral.referred_user_id,
              );

            return {
              ...referral,

              referrer: {
                id:
                  referrer?.id ||
                  referral.referrer_id,

                name:
                  referrer?.full_name ||
                  referrer?.username ||
                  "Unknown User",

                username:
                  referrer?.username ||
                  "",

                phone:
                  referrer?.phone ||
                  "",
              },

              referred_user: {
                id:
                  referredUser?.id ||
                  referral.referred_user_id,

                name:
                  referredUser?.full_name ||
                  referredUser?.username ||
                  "Unknown User",

                username:
                  referredUser?.username ||
                  "",

                phone:
                  referredUser?.phone ||
                  "",
              },
            };
          },
        );

    /*
     * =========================================
     * RECENT ACTIVITY
     * =========================================
     */

    const recentActivity = [
      ...deposits.map(
        (deposit) => ({
          id:
            `deposit-${deposit.id}`,

          type:
            "deposit",

          user_id:
            deposit.user_id,

          amount:
            numberValue(
              deposit.amount,
            ),

          status:
            deposit.status,

          created_at:
            deposit.created_at,
        }),
      ),

      ...withdrawals.map(
        (withdrawal) => ({
          id:
            `withdrawal-${withdrawal.id}`,

          type:
            "withdrawal",

          user_id:
            withdrawal.user_id,

          amount:
            numberValue(
              withdrawal.amount,
            ),

          status:
            withdrawal.status,

          created_at:
            withdrawal.requested_at ||
            withdrawal.created_at,
        }),
      ),

      ...submissions.map(
        (submission) => ({
          id:
            `task-${submission.id}`,

          type:
            "task_submission",

          user_id:
            submission.user_id,

          task_id:
            submission.task_id,

          status:
            submission.status,

          created_at:
            submission.submitted_at,
        }),
      ),

      ...packageSubmissions.map(
        (submission) => ({
          id:
            `package-task-${submission.id}`,

          type:
            "package_task_submission",

          user_id:
            submission.user_id,

          task_id:
            submission.task_id,

          amount:
            numberValue(
              submission.reward_amount,
            ),

          status:
            submission.status,

          created_at:
            submission.created_at,
        }),
      ),

      ...referrals.map(
        (referral) => ({
          id:
            `referral-${referral.id}`,

          type:
            "referral",

          user_id:
            referral.referrer_id,

          referred_user_id:
            referral.referred_user_id,

          status:
            referral.status,

          created_at:
            referral.created_at,
        }),
      ),
    ]
      .sort(
        (a, b) =>
          safeDate(
            b.created_at,
          ) -
          safeDate(
            a.created_at,
          ),
      )
      .slice(0, 20)
      .map(
        (activity) => {
          const profile =
            profileMap.get(
              activity.user_id,
            );

          return {
            ...activity,

            user: {
              id:
                profile?.id ||
                activity.user_id,

              name:
                profile?.full_name ||
                profile?.username ||
                "Unknown User",

              username:
                profile?.username ||
                "",

              phone:
                profile?.phone ||
                "",
            },
          };
        },
      );

    /*
     * =========================================
     * USER DETAILS
     * =========================================
     */

    const userDetails =
      userProfiles.map(
        (profile) => {
          const userWallet =
            wallets.find(
              (wallet) =>
                wallet.user_id ===
                profile.id,
            );

          const userActivations =
            activations.filter(
              (activation) =>
                activation.user_id ===
                profile.id,
            );

          const activeUserActivations =
            userActivations.filter(
              (activation) =>
                activation.is_active ===
                true,
            );

          const userDeposits =
            deposits.filter(
              (deposit) =>
                deposit.user_id ===
                profile.id,
            );

          const userWithdrawals =
            withdrawals.filter(
              (withdrawal) =>
                withdrawal.user_id ===
                profile.id,
            );

          const userReferrals =
            referrals.filter(
              (referral) =>
                referral.referrer_id ===
                profile.id,
            );

          return {
            ...profile,

            activePackageCount:
              activeUserActivations.length,

            activePackages:
              activeUserActivations,

            totalDeposited:
              numberValue(
                userWallet?.total_deposited,
              ),

            totalWithdrawn:
              numberValue(
                userWallet?.total_withdrawn,
              ),

            totalEarned:
              numberValue(
                userWallet?.total_earned,
              ),

            walletBalance:
              numberValue(
                userWallet?.deposit_balance,
              ) +
              numberValue(
                userWallet?.earning_balance,
              ),

            depositBalance:
              numberValue(
                userWallet?.deposit_balance,
              ),

            earningBalance:
              numberValue(
                userWallet?.earning_balance,
              ),

            depositCount:
              userDeposits.length,

            withdrawalCount:
              userWithdrawals.length,

            referralCount:
              userReferrals.length,
          };
        },
      );

    /*
     * =========================================
     * FINAL RESPONSE
     * =========================================
     */

    const generatedAt =
      new Date().toISOString();

    return NextResponse.json(
      {
        success: true,

        authenticated: true,

        admin: {
          username:
            session.username,
        },

        users: {
          total:
            totalUsers,

          totalProfiles:
            profiles.length,

          admins:
            totalAdmins,

          activePackageUsers:
            activePackageUserIds.size,

          recent:
            userDetails
              .slice(0, 8),
          
          list:
            userDetails,
        },

        packages: {
          activeActivations:
            activeActivations.length,

          totalActivations:
            activations.length,

          stats:
            packageStats,
        },

        deposits: {
          total:
            deposits.length,

          pending:
            pendingDeposits.length,

          approved:
            approvedDeposits.length,

          rejected:
            rejectedDeposits.length,

          totalAmount:
            depositTotalAmount,

          pendingAmount:
            pendingDepositAmount,

          approvedAmount:
            approvedDepositAmount,

          rejectedAmount:
            rejectedDepositAmount,

          bonusAmount:
            depositBonusAmount,

          recent:
            recentDeposits,
        },

        withdrawals: {
          total:
            withdrawals.length,

          pending:
            pendingWithdrawals.length,

          approved:
            approvedWithdrawals.length,

          rejected:
            rejectedWithdrawals.length,

          totalAmount:
            withdrawalTotalAmount,

          pendingAmount:
            pendingWithdrawalAmount,

          approvedAmount:
            approvedWithdrawalAmount,

          rejectedAmount:
            rejectedWithdrawalAmount,

          recent:
            recentWithdrawals,
        },

        tasks: {
          normalTotal:
            tasks.length,

          normalActive:
            activeNormalTasks.length,

          packageTotal:
            packageTasks.length,

          packageActive:
            activePackageTasks.length,

          pendingSubmissions:
            pendingNormalSubmissions.length +
            pendingPackageSubmissions.length,

          approvedSubmissions:
            approvedNormalSubmissions.length +
            approvedPackageSubmissions.length,

          normalRewardPaid:
            normalRewardPaid,

          packageRewardPaid:
            packageRewardPaid,

          rewardPaid:
            normalRewardPaid +
            packageRewardPaid,
        },

        referrals: {
          total:
            referrals.length,

          pending:
            pendingReferrals.length,

          qualified:
            qualifiedReferrals.length,

          completed:
            completedReferrals.length,

          rejected:
            rejectedReferrals.length,

          uniqueReferrers:
            uniqueReferrers,
        },

        wallet: {
          totalBalance:
            walletTotalBalance,

          depositBalance:
            walletDepositBalance,

          earningBalance:
            walletEarningBalance,

          totalEarned:
            walletTotalEarned,

          totalWithdrawn:
            walletTotalWithdrawn,

          totalDeposited:
            walletTotalDeposited,
        },

        recentActivity:
          recentActivity,

        recentDeposits:
          recentDeposits,

        recentWithdrawals:
          recentWithdrawals,

        recentSubmissions:
          recentSubmissions,

        recentReferrals:
          recentReferrals,

        packageStats:
          packageStats,

        generated_at:
          generatedAt,

        generatedAt:
          generatedAt,
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
      "ADMIN DASHBOARD ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        authenticated: true,

        error:
          error instanceof Error
            ? error.message
            : "Dashboard server error.",

        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}