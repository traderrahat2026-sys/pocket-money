import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "pocket_money_admin_session";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  referral_code: string | null;
  created_at: string;
  updated_at: string;
};

type WalletRow = {
  user_id: string;
  balance: number | string | null;
  deposit_balance: number | string | null;
  earning_balance: number | string | null;
  total_earned: number | string | null;
  total_deposited: number | string | null;
  total_withdrawn: number | string | null;
  deposit_bonus_amount: number | string | null;
  created_at?: string;
  updated_at?: string;
};

type PackageActivationRow = {
  id: string;
  user_id: string;
  package_amount: number | string;
  is_active: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
  active_from: string | null;
  created_at: string;
};

type ReferralRow = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code: string;
  status: string;
  qualified_at: string | null;
  created_at: string;
};

function verifyAdmin(request: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const adminUsername = process.env.ADMIN_USERNAME;

  if (!secret || !adminUsername) {
    return false;
  }

  const cookieHeader =
    request.headers.get("cookie") || "";

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) =>
      item.startsWith(`${COOKIE_NAME}=`)
    );

  if (!cookie) {
    return false;
  }

  const token = cookie
    .slice(`${COOKIE_NAME}=`.length)
    .trim();

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
      issuedAtString,
      signature,
    ] = parts;

    if (username !== adminUsername) {
      return false;
    }

    const issuedAt = Number(issuedAtString);

    if (!Number.isFinite(issuedAt)) {
      return false;
    }

    const now = Date.now();

    if (issuedAt > now) {
      return false;
    }

    if (now - issuedAt > SESSION_MAX_AGE) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${username}:${issuedAtString}`)
      .digest("base64url");

    const received = Buffer.from(signature);
    const expected = Buffer.from(
      expectedSignature
    );

    if (received.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      received,
      expected
    );
  } catch {
    return false;
  }
}

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing."
    );
  }

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function toNumber(
  value: number | string | null | undefined
) {
  return Number(value || 0);
}

async function getAllAuthUsers(
  supabase: ReturnType<typeof getSupabase>
) {
  const users: Array<{
    id: string;
    email?: string;
    user_metadata?: Record<
      string,
      unknown
    >;
    banned_until?: string | null;
    created_at?: string;
    last_sign_in_at?: string | null;
  }> = [];

  const perPage = 1000;

  let page = 1;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) {
      throw error;
    }

    const pageUsers = data.users || [];

    users.push(...pageUsers);

    if (pageUsers.length < perPage) {
      break;
    }

    page += 1;

    if (page > 100) {
      break;
    }
  }

  return users;
}

function isBlocked(
  bannedUntil: string | null | undefined
) {
  if (!bannedUntil) {
    return false;
  }

  const normalized =
    String(bannedUntil).toLowerCase();

  if (
    normalized === "none" ||
    normalized === "null"
  ) {
    return false;
  }

  const timestamp = new Date(
    bannedUntil
  ).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp > Date.now();
}

async function buildUsers() {
  const supabase = getSupabase();

  const [
    profilesResult,
    walletsResult,
    packagesResult,
    referralsResult,
    authUsers,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
          id,
          username,
          full_name,
          phone,
          avatar_url,
          role,
          referral_code,
          created_at,
          updated_at
        `
      )
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("wallets")
      .select(
        `
          user_id,
          balance,
          deposit_balance,
          earning_balance,
          total_earned,
          total_deposited,
          total_withdrawn,
          deposit_bonus_amount,
          created_at,
          updated_at
        `
      ),

    supabase
      .from("user_package_activations")
      .select(
        `
          id,
          user_id,
          package_amount,
          is_active,
          activated_at,
          deactivated_at,
          active_from,
          created_at
        `
      )
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("referrals")
      .select(
        `
          id,
          referrer_id,
          referred_user_id,
          referral_code,
          status,
          qualified_at,
          created_at
        `
      ),

    getAllAuthUsers(supabase),
  ]);

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  if (walletsResult.error) {
    throw walletsResult.error;
  }

  if (packagesResult.error) {
    throw packagesResult.error;
  }

  if (referralsResult.error) {
    throw referralsResult.error;
  }

  const profiles =
    (profilesResult.data ||
      []) as ProfileRow[];

  const wallets =
    (walletsResult.data ||
      []) as WalletRow[];

  const activations =
    (packagesResult.data ||
      []) as PackageActivationRow[];

  const referrals =
    (referralsResult.data ||
      []) as ReferralRow[];

  const walletMap = new Map<
    string,
    WalletRow
  >();

  for (const wallet of wallets) {
    walletMap.set(
      wallet.user_id,
      wallet
    );
  }

  const authMap = new Map<
    string,
    (typeof authUsers)[number]
  >();

  for (const authUser of authUsers) {
    authMap.set(
      authUser.id,
      authUser
    );
  }

  const packageMap = new Map<
    string,
    PackageActivationRow[]
  >();

  for (const activation of activations) {
    const current =
      packageMap.get(
        activation.user_id
      ) || [];

    current.push(activation);

    packageMap.set(
      activation.user_id,
      current
    );
  }

  const referralMap = new Map<
    string,
    {
      total: number;
      active: number;
      qualified: number;
    }
  >();

  for (const referral of referrals) {
    const current =
      referralMap.get(
        referral.referrer_id
      ) || {
        total: 0,
        active: 0,
        qualified: 0,
      };

    current.total += 1;

    const status = String(
      referral.status || ""
    ).toLowerCase();

    if (
      status === "active" ||
      status === "qualified" ||
      status === "completed"
    ) {
      current.active += 1;
    }

    if (
      status === "qualified" ||
      referral.qualified_at
    ) {
      current.qualified += 1;
    }

    referralMap.set(
      referral.referrer_id,
      current
    );
  }

  return profiles.map((profile) => {
    const wallet = walletMap.get(
      profile.id
    );

    const authUser = authMap.get(
      profile.id
    );

    const userPackages =
      packageMap.get(profile.id) || [];

    const activePackages =
      userPackages.filter(
        (item) =>
          item.is_active === true
      );

    const referralStats =
      referralMap.get(profile.id) || {
        total: 0,
        active: 0,
        qualified: 0,
      };

    return {
      id: profile.id,

      username:
        profile.username || "",

      full_name:
        profile.full_name || "",

      email:
        authUser?.email || "",

      phone:
        profile.phone || "",

      avatar_url:
        profile.avatar_url || null,

      role:
        profile.role || "user",

      referral_code:
        profile.referral_code || "",

      created_at:
        profile.created_at,

      updated_at:
        profile.updated_at,

      last_sign_in_at:
        authUser?.last_sign_in_at ||
        null,

      account_status: isBlocked(
        authUser?.banned_until
      )
        ? "blocked"
        : "active",

      wallet: {
        balance: toNumber(
          wallet?.balance
        ),

        deposit_balance: toNumber(
          wallet?.deposit_balance
        ),

        earning_balance: toNumber(
          wallet?.earning_balance
        ),

        total_earned: toNumber(
          wallet?.total_earned
        ),

        total_deposited: toNumber(
          wallet?.total_deposited
        ),

        total_withdrawn: toNumber(
          wallet?.total_withdrawn
        ),

        deposit_bonus_amount:
          toNumber(
            wallet?.deposit_bonus_amount
          ),
      },

      packages:
        userPackages.map(
          (item) => ({
            id: item.id,
            package_amount:
              toNumber(
                item.package_amount
              ),
            is_active:
              item.is_active === true,
            activated_at:
              item.activated_at,
            deactivated_at:
              item.deactivated_at,
          })
        ),

      active_packages:
        activePackages.map(
          (item) => ({
            id: item.id,
            package_amount:
              toNumber(
                item.package_amount
              ),
            is_active: true,
            activated_at:
              item.activated_at,
            deactivated_at:
              item.deactivated_at,
          })
        ),

      referral: {
        total_referrals:
          referralStats.total,

        active_referrals:
          referralStats.active,

        qualified_referrals:
          referralStats.qualified,

        reward: 0,
      },
    };
  });
}

export async function GET(
  request: Request
) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const users =
      await buildUsers();

    return NextResponse.json({
      success: true,
      users,
      total_users:
        users.length,
    });
  } catch (error) {
    console.error(
      "ADMIN USERS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Users could not be loaded.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request
) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const userId = String(
      body.userId || ""
    ).trim();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User ID is required.",
        },
        { status: 400 }
      );
    }

    const supabase =
      getSupabase();

    const fullName =
      body.full_name === undefined
        ? undefined
        : String(
            body.full_name || ""
          ).trim();

    const username =
      body.username === undefined
        ? undefined
        : String(
            body.username || ""
          ).trim();

    const phone =
      body.phone === undefined
        ? undefined
        : String(
            body.phone || ""
          ).trim();

    const referralCode =
      body.referral_code === undefined
        ? undefined
        : String(
            body.referral_code || ""
          ).trim();

    const role =
      body.role === undefined
        ? undefined
        : String(
            body.role || "user"
          ).trim();

    const email =
      body.email === undefined
        ? undefined
        : String(
            body.email || ""
          )
            .trim()
            .toLowerCase();

    const password =
      body.password === undefined
        ? ""
        : String(
            body.password || ""
          );

    const accountStatus =
      body.account_status === undefined
        ? undefined
        : String(
            body.account_status
          ).toLowerCase();

    if (
      email !== undefined &&
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (
      password &&
      password.length < 6
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    if (
      role !== undefined &&
      ![
        "user",
        "admin",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid role.",
        },
        { status: 400 }
      );
    }

    if (
      accountStatus !== undefined &&
      ![
        "active",
        "blocked",
      ].includes(accountStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid account status.",
        },
        { status: 400 }
      );
    }

    const profileUpdate: Record<
      string,
      string
    > = {};

    if (
      fullName !== undefined
    ) {
      profileUpdate.full_name =
        fullName;
    }

    if (
      username !== undefined
    ) {
      profileUpdate.username =
        username;
    }

    if (phone !== undefined) {
      profileUpdate.phone =
        phone;
    }

    if (
      referralCode !== undefined
    ) {
      profileUpdate.referral_code =
        referralCode;
    }

    if (role !== undefined) {
      profileUpdate.role =
        role;
    }

    if (
      Object.keys(
        profileUpdate
      ).length > 0
    ) {
      profileUpdate.updated_at =
        new Date().toISOString();

      const {
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", userId);

      if (profileError) {
        throw profileError;
      }
    }

    const authUpdate: {
      email?: string;
      password?: string;
      ban_duration?: string;
    } = {};

    if (email !== undefined) {
      authUpdate.email =
        email;
    }

    if (password) {
      authUpdate.password =
        password;
    }

    if (
      accountStatus !==
      undefined
    ) {
      authUpdate.ban_duration =
        accountStatus ===
        "blocked"
          ? "876000h"
          : "none";
    }

    if (
      Object.keys(
        authUpdate
      ).length > 0
    ) {
      const {
        error: authError,
      } =
        await supabase.auth.admin.updateUserById(
          userId,
          authUpdate
        );

      if (authError) {
        throw authError;
      }
    }

    const users =
      await buildUsers();

    const updatedUser =
      users.find(
        (user) =>
          user.id === userId
      );

    return NextResponse.json({
      success: true,
      message:
        "User updated successfully.",
      user:
        updatedUser || null,
    });
  } catch (error) {
    console.error(
      "ADMIN USERS PUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "User could not be updated.",
      },
      { status: 500 }
    );
  }
}