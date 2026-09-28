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
      return null;
    }

    if (
      !safeCompare(
        username,
        ADMIN_USERNAME
      )
    ) {
      return null;
    }

    const issuedAt =
      Number(issuedAtText);

    if (
      !Number.isFinite(
        issuedAt
      )
    ) {
      return null;
    }

    const now =
      Date.now();

    if (
      issuedAt >
      now + 60 * 1000
    ) {
      return null;
    }

    if (
      now - issuedAt >
      SESSION_MAX_AGE_SECONDS *
        1000
    ) {
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
      return null;
    }

    return {
      username,
      issuedAt,
    };
  } catch {
    return null;
  }
}

function getAdminSession(
  request: NextRequest
) {
  const token =
    request.cookies.get(
      SESSION_COOKIE_NAME
    )?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(
    token
  );
}

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
    | LOAD PACKAGE MASTER DATA
    |--------------------------------------------------------------------------
    */

    const packagesResult =
      await supabase
        .from("packages")
        .select(
          `
            id,
            package_amount,
            daily_reward,
            duration_days,
            is_active,
            created_at,
            updated_at
          `
        )
        .order(
          "package_amount",
          {
            ascending: true,
          }
        );

    if (
      packagesResult.error
    ) {
      console.error(
        "PACKAGES MASTER ERROR:",
        packagesResult.error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            packagesResult.error.message ||
            "Failed to load package settings.",
        },
        {
          status: 500,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | LOAD ACTIVATIONS
    |--------------------------------------------------------------------------
    */

    const activationsResult =
      await supabase
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
        );

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
            activationsResult.error.message ||
            "Failed to load package activations.",
        },
        {
          status: 500,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | LOAD TASKS
    |--------------------------------------------------------------------------
    */

    const tasksResult =
      await supabase
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
        );

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
            tasksResult.error.message ||
            "Failed to load package tasks.",
        },
        {
          status: 500,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | LOAD IMAGES
    |--------------------------------------------------------------------------
    */

    const imagesResult =
      await supabase
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
        );

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
            imagesResult.error.message ||
            "Failed to load package images.",
        },
        {
          status: 500,
        }
      );
    }

    const masterPackages =
      packagesResult.data || [];

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
    */

    const packageAmountsSet =
      new Set<number>(
        OFFICIAL_PACKAGE_AMOUNTS
      );

    for (
      const pkg of masterPackages
    ) {
      const amount =
        Number(
          pkg.package_amount
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
    | BUILD PACKAGES
    |--------------------------------------------------------------------------
    */

    const packages =
      packageAmounts.map(
        (amount) => {
          const masterPackage =
            masterPackages.find(
              (pkg) =>
                Number(
                  pkg.package_amount
                ) === amount
            );

          const packageActivations =
            activations.filter(
              (activation) =>
                Number(
                  activation.package_amount
                ) === amount
            );

          const activeActivations =
            packageActivations.filter(
              (activation) =>
                activation.is_active ===
                true
            );

          const inactiveActivations =
            packageActivations.filter(
              (activation) =>
                activation.is_active !==
                true
            );

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

          const packageImages =
            images.filter(
              (image) =>
                Number(
                  image.package_amount
                ) === amount
            );

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

          const primaryImage =
            packageImages[0] ||
            null;

          const latestActivation =
            packageActivations[0] ||
            null;

          const dailyReward =
            Number(
              masterPackage?.daily_reward ||
                0
            );

          const durationDays =
            Number(
              masterPackage?.duration_days ||
                30
            );

          return {
            id:
              masterPackage?.id ||
              null,

            package_amount:
              amount,

            packageAmount:
              amount,

            daily_reward:
              dailyReward,

            dailyReward:
              dailyReward,

            duration_days:
              durationDays,

            durationDays:
              durationDays,

            is_active:
              masterPackage
                ? masterPackage.is_active
                : true,

            active:
              activeUserIds.size >
              0,

            activeUsers:
              activeUserIds.size,

            totalUsers:
              totalUserIds.size,

            totalActivations:
              packageActivations.length,

            inactiveUsers:
              inactiveActivations.length,

            activeTasks:
              activeTasks.length,

            inactiveTasks:
              inactiveTasks.length,

            totalTasks:
              packageTasks.length,

            totalRewards,

            imagesCount:
              packageImages.length,

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
      totalPackages:
        filteredPackages.length,

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

    return NextResponse.json(
      {
        success: true,

        packages:
          filteredPackages,

        summary,

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
| POST
| PACKAGE IMAGE OR PACKAGE
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

    const action =
      body.action || "image";

    /*
    |--------------------------------------------------------------------------
    | CREATE PACKAGE
    |--------------------------------------------------------------------------
    */

    if (
      action ===
      "package"
    ) {
      const packageAmount =
        Number(
          body.package_amount
        );

      const dailyReward =
        Number(
          body.daily_reward
        );

      const durationDays =
        Number(
          body.duration_days ??
            30
        );

      const isActive =
        body.is_active !==
        false;

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

      if (
        !Number.isFinite(
          dailyReward
        ) ||
        dailyReward < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Valid daily reward is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(
          durationDays
        ) ||
        durationDays <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Valid duration is required.",
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
        .from("packages")
        .insert({
          package_amount:
            packageAmount,

          daily_reward:
            dailyReward,

          duration_days:
            durationDays,

          is_active:
            isActive,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "ADMIN PACKAGE CREATE ERROR:",
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
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE PACKAGE IMAGE
    |--------------------------------------------------------------------------
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
        "ADMIN PACKAGES IMAGE POST ERROR:",
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
            : "Failed to create package.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH
| PACKAGE MASTER / PACKAGE IMAGE
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

    /*
    |--------------------------------------------------------------------------
    | PACKAGE MASTER EDIT
    |--------------------------------------------------------------------------
    */

    if (
      body.type ===
      "package" ||
      body.package_id
    ) {
      const packageId =
        body.package_id ||
        body.id;

      if (!packageId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Package ID is required.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: currentPackage,
        error:
          currentPackageError,
      } = await supabase
        .from("packages")
        .select(
          `
            id,
            package_amount,
            daily_reward,
            duration_days,
            is_active
          `
        )
        .eq(
          "id",
          packageId
        )
        .maybeSingle();

      if (
        currentPackageError
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              currentPackageError.message,
          },
          {
            status: 500,
          }
        );
      }

      if (!currentPackage) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Package not found.",
          },
          {
            status: 404,
          }
        );
      }

      const oldAmount =
        Number(
          currentPackage.package_amount
        );

      const newAmount =
        body.package_amount !==
        undefined
          ? Number(
              body.package_amount
            )
          : oldAmount;

      const dailyReward =
        body.daily_reward !==
        undefined
          ? Number(
              body.daily_reward
            )
          : Number(
              currentPackage.daily_reward
            );

      const durationDays =
        body.duration_days !==
        undefined
          ? Number(
              body.duration_days
            )
          : Number(
              currentPackage.duration_days
          );

      const isActive =
        body.is_active !==
        undefined
          ? Boolean(
              body.is_active
            )
          : Boolean(
              currentPackage.is_active
            );

      if (
        !Number.isFinite(
          newAmount
        ) ||
        newAmount <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid package price.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isFinite(
          dailyReward
        ) ||
        dailyReward < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid daily reward.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(
          durationDays
        ) ||
        durationDays <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid duration.",
          },
          {
            status: 400,
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | CHECK DUPLICATE PACKAGE PRICE
      |--------------------------------------------------------------------------
      */

      if (
        newAmount !==
        oldAmount
      ) {
        const {
          data: duplicatePackage,
          error:
            duplicateError,
        } = await supabase
          .from("packages")
          .select("id")
          .eq(
            "package_amount",
            newAmount
          )
          .neq(
            "id",
            packageId
          )
          .maybeSingle();

        if (
          duplicateError
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                duplicateError.message,
            },
            {
              status: 500,
            }
          );
        }

        if (
          duplicatePackage
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "A package with this price already exists.",
            },
            {
              status: 409,
            }
          );
        }

        /*
        |--------------------------------------------------------------------------
        | UPDATE EXISTING REFERENCES
        |--------------------------------------------------------------------------
        |
        | package_amount is currently used as the
        | package identifier in these existing tables.
        |
        */

        const taskUpdate =
          await supabase
            .from(
              "package_tasks"
            )
            .update({
              package_amount:
                newAmount,
            })
            .eq(
              "package_amount",
              oldAmount
            );

        if (
          taskUpdate.error
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                taskUpdate.error.message,
            },
            {
              status: 500,
            }
          );
        }

        const imageUpdate =
          await supabase
            .from(
              "package_images"
            )
            .update({
              package_amount:
                newAmount,
            })
            .eq(
              "package_amount",
              oldAmount
            );

        if (
          imageUpdate.error
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                imageUpdate.error.message,
            },
            {
              status: 500,
            }
          );
        }

        const activationUpdate =
          await supabase
            .from(
              "user_package_activations"
            )
            .update({
              package_amount:
                newAmount,
            })
            .eq(
              "package_amount",
              oldAmount
            );

        if (
          activationUpdate.error
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                activationUpdate.error.message,
            },
            {
              status: 500,
            }
          );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE PACKAGE MASTER
      |--------------------------------------------------------------------------
      */

      const {
        data,
        error,
      } = await supabase
        .from("packages")
        .update({
          package_amount:
            newAmount,

          daily_reward:
            dailyReward,

          duration_days:
            durationDays,

          is_active:
            isActive,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          packageId
        )
        .select()
        .single();

      if (error) {
        console.error(
          "ADMIN PACKAGE UPDATE ERROR:",
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
    }

    /*
    |--------------------------------------------------------------------------
    | PACKAGE IMAGE EDIT
    |--------------------------------------------------------------------------
    */

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
        "ADMIN PACKAGE IMAGE PATCH ERROR:",
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
            : "Failed to update package.",
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