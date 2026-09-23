import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SESSION_COOKIE_NAME =
  "pocket_money_admin_session";

const SESSION_MAX_AGE_SECONDS =
  60 * 60 * 24;

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || "";

const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/*
|--------------------------------------------------------------------------
| OFFICIAL PACKAGE AMOUNTS
|--------------------------------------------------------------------------
| These packages must always appear in the admin Packages page,
| even if a package currently has no image or task.
*/

const OFFICIAL_PACKAGE_AMOUNTS = [
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

/*
|--------------------------------------------------------------------------
| SUPABASE ADMIN CLIENT
|--------------------------------------------------------------------------
*/

function getSupabaseAdmin() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase server environment variables are missing."
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
    }
  );
}

/*
|--------------------------------------------------------------------------
| SAFE STRING COMPARE
|--------------------------------------------------------------------------
*/

function safeCompare(
  a: string,
  b: string
) {
  const aBuffer = Buffer.from(
    a,
    "utf8"
  );

  const bBuffer = Buffer.from(
    b,
    "utf8"
  );

  if (
    aBuffer.length !==
    bBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    aBuffer,
    bBuffer
  );
}

/*
|--------------------------------------------------------------------------
| VERIFY ADMIN SESSION
|--------------------------------------------------------------------------
*/

function verifySessionToken(
  token: string
) {
  if (
    !token ||
    !ADMIN_USERNAME ||
    !ADMIN_SESSION_SECRET
  ) {
    return null;
  }

  try {
    const decoded =
      Buffer.from(
        token,
        "base64url"
      ).toString("utf8");

    const parts =
      decoded.split(":");

    if (
      parts.length !== 3
    ) {
      console.error(
        "PACKAGES AUTH: Invalid token structure."
      );

      return null;
    }

    const [
      username,
      issuedAtText,
      signature,
    ] = parts;

    if (
      !username ||
      !issuedAtText ||
      !signature
    ) {
      console.error(
        "PACKAGES AUTH: Missing token fields."
      );

      return null;
    }

    if (
      !safeCompare(
        username,
        ADMIN_USERNAME
      )
    ) {
      console.error(
        "PACKAGES AUTH: Username mismatch."
      );

      return null;
    }

    const issuedAt =
      Number(issuedAtText);

    if (
      !Number.isFinite(
        issuedAt
      )
    ) {
      console.error(
        "PACKAGES AUTH: Invalid issuedAt."
      );

      return null;
    }

    const now =
      Date.now();

    if (
      issuedAt >
      now + 60 * 1000
    ) {
      console.error(
        "PACKAGES AUTH: Token timestamp is in the future."
      );

      return null;
    }

    if (
      now - issuedAt >
      SESSION_MAX_AGE_SECONDS *
        1000
    ) {
      console.error(
        "PACKAGES AUTH: Session expired."
      );

      return null;
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          ADMIN_SESSION_SECRET
        )
        .update(
          `${username}:${issuedAt}`
        )
        .digest("base64url");

    if (
      !safeCompare(
        signature,
        expectedSignature
      )
    ) {
      console.error(
        "PACKAGES AUTH: Signature mismatch."
      );

      return null;
    }

    return {
      username,
      issuedAt,
    };
  } catch (error) {
    console.error(
      "PACKAGES AUTH: Token verification failed:",
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| GET ADMIN SESSION
|--------------------------------------------------------------------------
*/

function getAdminSession(
  request: NextRequest
) {
  const token =
    request.cookies.get(
      SESSION_COOKIE_NAME
    )?.value;

  if (!token) {
    console.error(
      "PACKAGES AUTH: Admin cookie not found."
    );

    return null;
  }

  return verifySessionToken(
    token
  );
}

/*
|--------------------------------------------------------------------------
| UNAUTHORIZED
|--------------------------------------------------------------------------
*/

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized",
    },
    {
      status: 401,
    }
  );
}

/*
|--------------------------------------------------------------------------
| GET PACKAGES
|--------------------------------------------------------------------------
*/

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * Admin authentication
     */

    const session =
      getAdminSession(
        request
      );

    if (!session) {
      return unauthorizedResponse();
    }

    const supabase =
      getSupabaseAdmin();

    /*
     * Read filters
     */

    const { searchParams } =
      new URL(
        request.url
      );

    const search =
      (
        searchParams.get(
          "search"
        ) || ""
      ).trim();

    const status =
      searchParams.get(
        "status"
      ) || "all";

    /*
     |--------------------------------------------------------------------------
     | LOAD ALL REAL PACKAGE DATA
     |--------------------------------------------------------------------------
     */

    const [
      activationsResult,
      tasksResult,
      imagesResult,
    ] = await Promise.all([
      /*
       * REAL USER PACKAGE ACTIVATIONS
       */
      supabase
        .from(
          "user_package_activations"
        )
        .select(
          `
            id,
            user_id,
            package_amount,
            is_active,
            activated_at,
            deactivated_at,
            active_from,
            created_at,
            updated_at
          `
        )
        .order(
          "activated_at",
          {
            ascending: false,
          }
        ),

      /*
       * REAL PACKAGE TASKS
       */
      supabase
        .from(
          "package_tasks"
        )
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
            expires_at,
            updated_at,
            available_from
          `
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      /*
       * REAL PACKAGE IMAGES
       */
      supabase
        .from(
          "package_images"
        )
        .select(
          `
            id,
            package_amount,
            image_url,
            storage_path,
            created_at,
            updated_at
          `
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),
    ]);

    /*
     |--------------------------------------------------------------------------
     | DATABASE ERROR HANDLING
     |--------------------------------------------------------------------------
     */

    if (
      activationsResult.error
    ) {
      console.error(
        "PACKAGES ACTIVATIONS ERROR:",
        activationsResult.error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            activationsResult
              .error
              .message ||
            "Failed to load package activations.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      tasksResult.error
    ) {
      console.error(
        "PACKAGES TASKS ERROR:",
        tasksResult.error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            tasksResult
              .error
              .message ||
            "Failed to load package tasks.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      imagesResult.error
    ) {
      console.error(
        "PACKAGES IMAGES ERROR:",
        imagesResult.error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            imagesResult
              .error
              .message ||
            "Failed to load package images.",
        },
        {
          status: 500,
        }
      );
    }

    const activations =
      activationsResult.data || [];

    const tasks =
      tasksResult.data || [];

    const images =
      imagesResult.data || [];

    /*
     |--------------------------------------------------------------------------
     | PACKAGE AMOUNTS
     |--------------------------------------------------------------------------
     |
     | Start with the official 9 packages.
     |
     | Then also include any additional package amount
     | found in database, so existing real data is never hidden.
     |
     */

    const packageAmountsSet =
      new Set<number>(
        OFFICIAL_PACKAGE_AMOUNTS
      );

    for (
      const activation of activations
    ) {
      const amount =
        Number(
          activation.package_amount
        );

      if (
        Number.isFinite(
          amount
        ) &&
        amount > 0
      ) {
        packageAmountsSet.add(
          amount
        );
      }
    }

    for (
      const task of tasks
    ) {
      const amount =
        Number(
          task.package_amount
        );

      if (
        Number.isFinite(
          amount
        ) &&
        amount > 0
      ) {
        packageAmountsSet.add(
          amount
        );
      }
    }

    for (
      const image of images
    ) {
      const amount =
        Number(
          image.package_amount
        );

      if (
        Number.isFinite(
          amount
        ) &&
        amount > 0
      ) {
        packageAmountsSet.add(
          amount
        );
      }
    }

    let packageAmounts =
      Array.from(
        packageAmountsSet
      ).sort(
        (a, b) =>
          a - b
      );

    /*
     |--------------------------------------------------------------------------
     | SEARCH
     |--------------------------------------------------------------------------
     */

    if (search) {
      packageAmounts =
        packageAmounts.filter(
          (amount) =>
            amount
              .toString()
              .includes(
                search
              )
        );
    }

    /*
     |--------------------------------------------------------------------------
     | BUILD PACKAGE OBJECTS
     |--------------------------------------------------------------------------
     */

    const packages =
      packageAmounts.map(
        (amount) => {
          /*
           * All activation records
           * for this package.
           */
          const packageActivations =
            activations.filter(
              (activation) =>
                Number(
                  activation.package_amount
                ) === amount
            );

          /*
           * Active activation records.
           */
          const activeActivations =
            packageActivations.filter(
              (activation) =>
                activation.is_active ===
                true
            );

          /*
           * Inactive activation records.
           */
          const inactiveActivations =
            packageActivations.filter(
              (activation) =>
                activation.is_active !==
                true
            );

          /*
           * DISTINCT ACTIVE USERS
           *
           * If the same user somehow has
           * multiple active records, count
           * that user only once.
           */
          const activeUserIds =
            new Set<string>();

          for (
            const activation of
              activeActivations
          ) {
            if (
              activation.user_id
            ) {
              activeUserIds.add(
                activation.user_id
              );
            }
          }

          /*
           * DISTINCT TOTAL USERS
           */
          const totalUserIds =
            new Set<string>();

          for (
            const activation of
              packageActivations
          ) {
            if (
              activation.user_id
            ) {
              totalUserIds.add(
                activation.user_id
              );
            }
          }

          /*
           * Package tasks
           */
          const packageTasks =
            tasks.filter(
              (task) =>
                Number(
                  task.package_amount
                ) === amount
            );

          const activeTasks =
            packageTasks.filter(
              (task) =>
                task.is_active ===
                true
            );

          const inactiveTasks =
            packageTasks.filter(
              (task) =>
                task.is_active !==
                true
            );

          /*
           * Package images
           */
          const packageImages =
            images.filter(
              (image) =>
                Number(
                  image.package_amount
                ) === amount
            );

          /*
           * Total configured task rewards
           */
          const totalRewards =
            packageTasks.reduce(
              (
                total,
                task
              ) =>
                total +
                Number(
                  task.reward_amount ||
                    0
                ),
              0
            );

          /*
           * Primary/latest image
           */
          const primaryImage =
            packageImages[0] ||
            null;

          /*
           * Latest activation
           */
          const latestActivation =
            packageActivations[0] ||
            null;

          /*
           * Return package
           */
          return {
            package_amount:
              amount,

            packageAmount:
              amount,

            /*
             * A package is considered
             * active when at least one
             * user currently has it active.
             */
            active:
              activeUserIds.size >
              0,

            /*
             * DISTINCT USER COUNTS
             */
            activeUsers:
              activeUserIds.size,

            totalUsers:
              totalUserIds.size,

            /*
             * Activation counts
             */
            totalActivations:
              packageActivations.length,

            inactiveUsers:
              inactiveActivations.length,

            /*
             * Tasks
             */
            activeTasks:
              activeTasks.length,

            inactiveTasks:
              inactiveTasks.length,

            totalTasks:
              packageTasks.length,

            totalRewards,

            /*
             * Images
             */
            imagesCount:
              packageImages.length,

            /*
             * Primary image
             */
            image:
              primaryImage
                ?.image_url ||
              "",

            imageId:
              primaryImage
                ?.id ||
              null,

            storagePath:
              primaryImage
                ?.storage_path ||
              null,

            /*
             * FULL REAL DATA
             */
            images:
              packageImages,

            tasks:
              packageTasks,

            activations:
              packageActivations,

            latestActivation,
          };
        }
      );

    /*
     |--------------------------------------------------------------------------
     | STATUS FILTER
     |--------------------------------------------------------------------------
     */

    let filteredPackages =
      packages;

    if (
      status ===
      "active"
    ) {
      filteredPackages =
        packages.filter(
          (pkg) =>
            pkg.activeUsers >
            0
        );
    }

    if (
      status ===
      "inactive"
    ) {
      filteredPackages =
        packages.filter(
          (pkg) =>
            pkg.activeUsers ===
            0
        );
    }

    /*
     |--------------------------------------------------------------------------
     | SUMMARY
     |--------------------------------------------------------------------------
     */

    const summary = {
      /*
       * Number of package sections.
       */
      totalPackages:
        filteredPackages.length,

      /*
       * Sum of distinct active
       * package users.
       */
      activePackageUsers:
        filteredPackages.reduce(
          (
            total,
            pkg
          ) =>
            total +
            Number(
              pkg.activeUsers ||
                0
            ),
          0
        ),

      /*
       * Sum of distinct users
       * across package records.
       */
      totalPackageUsers:
        filteredPackages.reduce(
          (
            total,
            pkg
          ) =>
            total +
            Number(
              pkg.totalUsers ||
                0
            ),
          0
        ),

      /*
       * Total activation rows.
       */
      totalActivations:
        filteredPackages.reduce(
          (
            total,
            pkg
          ) =>
            total +
            Number(
              pkg.totalActivations ||
                0
            ),
          0
        ),

      /*
       * Tasks
       */
      totalTasks:
        filteredPackages.reduce(
          (
            total,
            pkg
          ) =>
            total +
            Number(
              pkg.totalTasks ||
                0
            ),
          0
        ),

      activeTasks:
        filteredPackages.reduce(
          (
            total,
            pkg
          ) =>
            total +
            Number(
              pkg.activeTasks ||
                0
            ),
          0
        ),

      /*
       * Images
       */
      totalImages:
        filteredPackages.reduce(
          (
            total,
            pkg
          ) =>
            total +
            Number(
              pkg.imagesCount ||
                0
            ),
          0
        ),

      /*
       * Rewards
       */
      totalRewards:
        filteredPackages.reduce(
          (
            total,
            pkg
          ) =>
            total +
            Number(
              pkg.totalRewards ||
                0
            ),
          0
        ),
    };

    /*
     |--------------------------------------------------------------------------
     | RESPONSE
     |--------------------------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        packages:
          filteredPackages,

        summary,

        /*
         * Always expose official package
         * amounts as well.
         */
        officialPackages:
          OFFICIAL_PACKAGE_AMOUNTS,

        packageAmounts,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN PACKAGES GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load packages.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST PACKAGE IMAGE
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  try {
    const session =
      getAdminSession(
        request
      );

    if (!session) {
      return unauthorizedResponse();
    }

    const supabase =
      getSupabaseAdmin();

    const body =
      await request.json();

    /*
     * Support both old and new
     * field names.
     */
    const packageAmount =
      Number(
        body.package_amount ??
          body.amount
      );

    const imageUrl =
      typeof (
        body.image_url ??
        body.imageUrl
      ) === "string"
        ? String(
            body.image_url ??
              body.imageUrl
          ).trim()
        : "";

    const storagePath =
      typeof (
        body.storage_path ??
        body.storagePath
      ) === "string"
        ? String(
            body.storage_path ??
              body.storagePath
          ).trim()
        : "";

    if (
      !Number.isFinite(
        packageAmount
      ) ||
      packageAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Valid package amount is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Image URL is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from(
        "package_images"
      )
      .insert({
        package_amount:
          packageAmount,

        image_url:
          imageUrl,

        storage_path:
          storagePath ||
          null,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "ADMIN PACKAGES POST ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      package: data,
    });
  } catch (error) {
    console.error(
      "ADMIN PACKAGES POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create package image.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH PACKAGE IMAGE
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: NextRequest
) {
  try {
    const session =
      getAdminSession(
        request
      );

    if (!session) {
      return unauthorizedResponse();
    }

    const supabase =
      getSupabaseAdmin();

    const body =
      await request.json();

    const id =
      body.id;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Package image ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const updateData:
      Record<
        string,
        unknown
      > = {};

    if (
      body.package_amount !==
      undefined
    ) {
      const packageAmount =
        Number(
          body.package_amount
        );

      if (
        !Number.isFinite(
          packageAmount
        ) ||
        packageAmount <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid package amount.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.package_amount =
        packageAmount;
    }

    if (
      body.image_url !==
      undefined
    ) {
      updateData.image_url =
        typeof body.image_url ===
        "string"
          ? body.image_url.trim()
          : "";
    }

    if (
      body.storage_path !==
      undefined
    ) {
      updateData.storage_path =
        typeof body.storage_path ===
        "string"
          ? body.storage_path.trim() ||
            null
          : null;
    }

    updateData.updated_at =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabase
      .from(
        "package_images"
      )
      .update(
        updateData
      )
      .eq(
        "id",
        id
      )
      .select()
      .single();

    if (error) {
      console.error(
        "ADMIN PACKAGES PATCH ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      package: data,
    });
  } catch (error) {
    console.error(
      "ADMIN PACKAGES PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update package image.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE PACKAGE IMAGE
|--------------------------------------------------------------------------
*/

export async function DELETE(
  request: NextRequest
) {
  try {
    const session =
      getAdminSession(
        request
      );

    if (!session) {
      return unauthorizedResponse();
    }

    const supabase =
      getSupabaseAdmin();

    const { searchParams } =
      new URL(
        request.url
      );

    /*
     * Support both:
     * ?id=
     * ?imageId=
     */
    const id =
      searchParams.get(
        "id"
      ) ||
      searchParams.get(
        "imageId"
      );

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Package image ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
    } = await supabase
      .from(
        "package_images"
      )
      .delete()
      .eq(
        "id",
        id
      );

    if (error) {
      console.error(
        "ADMIN PACKAGES DELETE ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Package image deleted successfully.",
    });
  } catch (error) {
    console.error(
      "ADMIN PACKAGES DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete package image.",
      },
      {
        status: 500,
      }
    );
  }
}