"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

type SubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | null;

type Task = {
  id: string;
  package_amount: number;
  title: string;
  description: string | null;
  task_url: string;
  reward_amount: number;
  screenshot_required: boolean;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  remaining_seconds: number;
  submission_status: SubmissionStatus;
  cycle_started_at: string;
};

type Submission = {
  id: string;
  task_id: string;
  package_amount?: number;
  title?: string;
  reward_amount?: number;
  screenshot_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  cycle_started_at: string;
};

export default function TasksPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cycleRefreshLock = useRef(false);

  /*
   * ============================================================
   * LOAD TASKS
   * ============================================================
   */

  const loadTasks = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setErrorMessage(null);

        /*
         * ======================================================
         * AUTH USER
         * ======================================================
         */

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("TASK USER ERROR:", userError);
        }

        if (!user) {
          setTasks([]);
          setSubmissions([]);
          setLoading(false);
          return;
        }

        /*
         * ======================================================
         * GET TASKS
         * ======================================================
         */

        const {
          data: loadedTasks,
          error: tasksError,
        } = await supabase.rpc("get_my_tasks");

        if (tasksError) {
          console.error(
            "GET MY TASKS ERROR:",
            tasksError
          );

          throw tasksError;
        }

        /*
         * ======================================================
         * GET CURRENT USER SUBMISSIONS
         * ======================================================
         */

        const {
          data: loadedSubmissions,
          error: submissionsError,
        } = await supabase.rpc(
          "get_my_task_submissions"
        );

        if (submissionsError) {
          console.error(
            "GET MY TASK SUBMISSIONS ERROR:",
            submissionsError
          );

          throw submissionsError;
        }

        /*
         * ======================================================
         * NORMALIZE SUBMISSIONS
         * ======================================================
         */

        const normalizedSubmissions: Submission[] = [];

        for (const rawSubmission of loadedSubmissions ?? []) {
          const submission: any = rawSubmission;

          if (!submission?.id) {
            continue;
          }

          normalizedSubmissions.push({
            id: String(submission.id),

            task_id: String(
              submission.task_id ?? ""
            ),

            package_amount:
              submission.package_amount != null
                ? Number(
                    submission.package_amount
                  )
                : undefined,

            title:
              submission.title != null
                ? String(submission.title)
                : undefined,

            reward_amount:
              submission.reward_amount != null
                ? Number(
                    submission.reward_amount
                  )
                : undefined,

            screenshot_url:
              submission.screenshot_url != null
                ? String(
                    submission.screenshot_url
                  )
                : null,

            status:
              submission.status === "pending" ||
              submission.status === "approved" ||
              submission.status === "rejected"
                ? submission.status
                : "pending",

            admin_note:
              submission.admin_note != null
                ? String(
                    submission.admin_note
                  )
                : null,

            submitted_at:
              submission.submitted_at != null
                ? String(
                    submission.submitted_at
                  )
                : "",

            reviewed_at:
              submission.reviewed_at != null
                ? String(
                    submission.reviewed_at
                  )
                : null,

            cycle_started_at:
              submission.cycle_started_at != null
                ? String(
                    submission.cycle_started_at
                  )
                : "",
          });
        }

        /*
         * ======================================================
         * NORMALIZE TASKS
         * ======================================================
         *
         * IMPORTANT:
         *
         * Admin OFF:
         * is_active = false
         *
         * The task is completely removed from the frontend.
         *
         * ======================================================
         */

        const normalizedTasks: Task[] = [];

        for (const rawTask of loadedTasks ?? []) {
          const task: any = rawTask;

          if (!task?.id) {
            continue;
          }

          /*
           * ====================================================
           * ACTIVE CHECK
           * ====================================================
           */

          const taskIsActive =
            task.is_active === true ||
            task.is_active === "true" ||
            task.is_active === 1;

          /*
           * Admin OFF হলে task দেখাবো না।
           */

          if (!taskIsActive) {
            continue;
          }

          /*
           * ====================================================
           * CYCLE
           * ====================================================
           */

          const cycleStartedAt =
            task.cycle_started_at != null
              ? String(
                  task.cycle_started_at
                )
              : "";

          /*
           * ====================================================
           * EXPIRY
           * ====================================================
           */

          let expiresAt =
            task.expires_at != null
              ? String(task.expires_at)
              : "";

          /*
           * expires_at না থাকলে cycle start থেকে 24 hours
           */

          if (
            !expiresAt &&
            cycleStartedAt
          ) {
            const cycleTime =
              new Date(
                cycleStartedAt
              ).getTime();

            if (!Number.isNaN(cycleTime)) {
              expiresAt =
                new Date(
                  cycleTime +
                    24 *
                      60 *
                      60 *
                      1000
                ).toISOString();
            }
          }

          /*
           * ====================================================
           * REMAINING TIME
           * ====================================================
           */

          let remainingSeconds = Number(
            task.remaining_seconds ?? 0
          );

          if (
            (!remainingSeconds ||
              Number.isNaN(
                remainingSeconds
              )) &&
            expiresAt
          ) {
            const expiryTime =
              new Date(
                expiresAt
              ).getTime();

            if (
              !Number.isNaN(
                expiryTime
              )
            ) {
              remainingSeconds =
                Math.max(
                  0,
                  Math.floor(
                    (expiryTime -
                      Date.now()) /
                      1000
                  )
                );
            }
          }

          /*
           * ====================================================
           * ADD ACTIVE TASK
           * ====================================================
           */

          normalizedTasks.push({
            id: String(task.id),

            package_amount: Number(
              task.package_amount ?? 0
            ),

            title:
              task.title != null &&
              String(
                task.title
              ).trim() !== ""
                ? String(task.title)
                : "কাজ",

            description:
              task.description != null
                ? String(
                    task.description
                  )
                : null,

            task_url:
              task.task_url != null
                ? String(
                    task.task_url
                  )
                : "",

            reward_amount: Number(
              task.reward_amount ?? 0
            ),

            screenshot_required:
              task.screenshot_required ===
                true ||
              task.screenshot_required ===
                "true" ||
              task.screenshot_required ===
                1,

            is_active: true,

            created_at:
              task.created_at != null
                ? String(
                    task.created_at
                  )
                : "",

            expires_at: expiresAt,

            remaining_seconds: Math.max(
              0,
              Number.isFinite(
                remainingSeconds
              )
                ? Math.floor(
                    remainingSeconds
                  )
                : 0
            ),

            submission_status: null,

            cycle_started_at:
              cycleStartedAt,
          });
        }

        /*
         * ======================================================
         * REMOVE DUPLICATE TASKS
         * ======================================================
         */

        const uniqueTaskMap =
          new Map<string, Task>();

        for (const task of normalizedTasks) {
          if (
            !uniqueTaskMap.has(
              task.id
            )
          ) {
            uniqueTaskMap.set(
              task.id,
              task
            );
          }
        }

        const finalTasks =
          Array.from(
            uniqueTaskMap.values()
          );

        /*
         * ======================================================
         * SORT BY PACKAGE
         * ======================================================
         */

        finalTasks.sort(
          (a, b) =>
            a.package_amount -
            b.package_amount
        );

        /*
         * ======================================================
         * SAVE
         * ======================================================
         */

        setTasks(finalTasks);
        setSubmissions(
          normalizedSubmissions
        );
      } catch (error: any) {
        console.error(
          "LOAD TASKS ERROR:",
          error
        );

        setTasks([]);

        setErrorMessage(
          error?.message ||
            "কাজ লোড করতে সমস্যা হয়েছে।"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    loadTasks(true);
  }, [loadTasks]);

  /*
   * ============================================================
   * BODY SCROLL LOCK
   * ============================================================
   */

  useEffect(() => {
    if (!showUploadModal) {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    const previousTouchAction =
      document.body.style.touchAction;

    document.body.style.overflow =
      "hidden";

    document.body.style.touchAction =
      "none";

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.body.style.touchAction =
        previousTouchAction;
    };
  }, [showUploadModal]);

  /*
   * ============================================================
   * GET CURRENT CYCLE START
   * ============================================================
   */

  const getCurrentCycleStart =
    useCallback(
      (task: Task) => {
        if (
          !task.cycle_started_at
        ) {
          return null;
        }

        const time =
          new Date(
            task.cycle_started_at
          ).getTime();

        if (
          Number.isNaN(time)
        ) {
          return null;
        }

        return time;
      },
      []
    );

  /*
   * ============================================================
   * GET CURRENT USER SUBMISSION
   * ============================================================
   */

  const getSubmission =
    useCallback(
      (task: Task) => {
        const currentCycleStart =
          getCurrentCycleStart(
            task
          );

        if (
          currentCycleStart ===
          null
        ) {
          return null;
        }

        const currentSubmission =
          submissions.find(
            (submission) => {
              /*
               * Same task
               */

              if (
                submission.task_id !==
                task.id
              ) {
                return false;
              }

              /*
               * Must have cycle
               */

              if (
                !submission.cycle_started_at
              ) {
                return false;
              }

              const submissionCycle =
                new Date(
                  submission.cycle_started_at
                ).getTime();

              if (
                Number.isNaN(
                  submissionCycle
                )
              ) {
                return false;
              }

              /*
               * Same global cycle
               */

              return (
                submissionCycle ===
                currentCycleStart
              );
            }
          );

        return (
          currentSubmission ?? null
        );
      },
      [
        getCurrentCycleStart,
        submissions,
      ]
    );

  /*
   * ============================================================
   * LIVE COUNTDOWN
   * ============================================================
   */

  useEffect(() => {
    if (!tasks.length) {
      return;
    }

    const timer =
      setInterval(() => {
        const now = Date.now();

        let cycleEnded =
          false;

        setTasks(
          (currentTasks) =>
            currentTasks.map(
              (task) => {
                if (
                  !task.expires_at
                ) {
                  return task;
                }

                const expiresAt =
                  new Date(
                    task.expires_at
                  ).getTime();

                if (
                  Number.isNaN(
                    expiresAt
                  )
                ) {
                  return task;
                }

                const remainingSeconds =
                  Math.max(
                    0,
                    Math.floor(
                      (expiresAt -
                        now) /
                        1000
                    )
                  );

                if (
                  remainingSeconds <=
                  0
                ) {
                  cycleEnded = true;
                }

                return {
                  ...task,
                  remaining_seconds:
                    remainingSeconds,
                };
              }
            )
        );

        /*
         * Cycle শেষ হলে reload
         */

        if (
          cycleEnded &&
          !cycleRefreshLock.current
        ) {
          cycleRefreshLock.current =
            true;

          loadTasks(false).finally(
            () => {
              setTimeout(() => {
                cycleRefreshLock.current =
                  false;
              }, 1500);
            }
          );
        }
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    tasks.length,
    loadTasks,
  ]);

  /*
   * ============================================================
   * ADMIN TASK REFRESH
   * ============================================================
   *
   * প্রতি 10 seconds-এ database থেকে task আবার check হবে।
   *
   * Admin OFF করলে task disappear করবে।
   * Admin ON করলে eligible task আবার আসবে।
   *
   * ============================================================
   */

  useEffect(() => {
    if (loading) {
      return;
    }

    const interval =
      setInterval(() => {
        if (
          cycleRefreshLock.current
        ) {
          return;
        }

        cycleRefreshLock.current =
          true;

        loadTasks(false).finally(
          () => {
            setTimeout(() => {
              cycleRefreshLock.current =
                false;
            }, 500);
          }
        );
      }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [
    loading,
    loadTasks,
  ]);

  /*
   * ============================================================
   * MANUAL REFRESH
   * ============================================================
   */

  const handleRefresh =
    async () => {
      try {
        setRefreshing(true);
        setMessage(null);
        setErrorMessage(null);

        await loadTasks(false);
      } catch {
        /*
         * loadTasks already handles error
         */
      } finally {
        setRefreshing(false);
      }
    };

  /*
   * ============================================================
   * MONEY FORMAT
   * ============================================================
   */

  const formatMoney =
    (amount: number) => {
      return new Intl.NumberFormat(
        "en-BD"
      ).format(
        Number.isFinite(
          Number(amount)
        )
          ? Number(amount)
          : 0
      );
    };

  /*
   * ============================================================
   * COUNTDOWN FORMAT
   * ============================================================
   */

  const formatCountdown =
    (seconds: number) => {
      const safeSeconds =
        Math.max(
          0,
          Math.floor(
            Number.isFinite(
              Number(seconds)
            )
              ? Number(seconds)
              : 0
          )
        );

      const hours =
        Math.floor(
          safeSeconds / 3600
        );

      const minutes =
        Math.floor(
          (safeSeconds % 3600) /
            60
        );

      const secs =
        safeSeconds % 60;

      return [
        String(hours).padStart(
          2,
          "0"
        ),
        String(minutes).padStart(
          2,
          "0"
        ),
        String(secs).padStart(
          2,
          "0"
        ),
      ].join(":");
    };

  /*
   * ============================================================
   * START TASK
   * ============================================================
   */

  const handleStartTask =
    async (task: Task) => {
      setMessage(null);
      setErrorMessage(null);

      /*
       * Extra active check
       */

      if (!task.is_active) {
        setErrorMessage(
          "এই কাজটি বর্তমানে Admin-এর মাধ্যমে বন্ধ করা হয়েছে।"
        );

        return;
      }

      /*
       * Current user's submission
       */

      const submission =
        getSubmission(task);

      if (submission) {
        setMessage(
          "এই ২৪ ঘণ্টার সাইকেলে এই কাজটি ইতিমধ্যে জমা দেওয়া হয়েছে। পরবর্তী সাইকেলে আবার জমা দিতে পারবেন।"
        );

        return;
      }

      if (!task.task_url) {
        setMessage(
          "এই কাজের কোনো লিংক পাওয়া যায়নি।"
        );

        return;
      }

      window.open(
        task.task_url,
        "_blank",
        "noopener,noreferrer"
      );
    };

  /*
   * ============================================================
   * OPEN SUBMISSION
   * ============================================================
   */

  const openSubmission =
    (task: Task) => {
      setMessage(null);
      setErrorMessage(null);

      /*
       * Active check
       */

      if (!task.is_active) {
        setErrorMessage(
          "এই কাজটি বর্তমানে Admin-এর মাধ্যমে বন্ধ করা হয়েছে।"
        );

        return;
      }

      /*
       * Current user's submission
       */

      const submission =
        getSubmission(task);

      if (submission) {
        setMessage(
          "এই ২৪ ঘণ্টার সাইকেলে এই কাজটি ইতিমধ্যে জমা দেওয়া হয়েছে। পরবর্তী সাইকেলে আবার জমা দিতে পারবেন।"
        );

        return;
      }

      setSelectedTask(task);
      setSelectedFile(null);
      setShowUploadModal(true);
    };

  /*
   * ============================================================
   * CLOSE MODAL
   * ============================================================
   */

  const closeUploadModal =
    () => {
      if (uploading) {
        return;
      }

      setShowUploadModal(false);
      setSelectedTask(null);
      setSelectedFile(null);
      setErrorMessage(null);
    };

  /*
   * ============================================================
   * FILE CHANGE
   * ============================================================
   */

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0] ??
      null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    /*
     * Image only
     */

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setSelectedFile(null);

      setErrorMessage(
        "শুধু Image Screenshot নির্বাচন করুন।"
      );

      event.target.value = "";

      return;
    }

    /*
     * 10MB maximum
     */

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setSelectedFile(null);

      setErrorMessage(
        "Screenshot-এর size সর্বোচ্চ 10MB হতে পারবে।"
      );

      event.target.value = "";

      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
  };

  /*
   * ============================================================
   * SUBMIT TASK
   * ============================================================
   */

  const handleSubmit =
    async () => {
      if (!selectedTask) {
        return;
      }

      if (uploading) {
        return;
      }

      setMessage(null);
      setErrorMessage(null);

      /*
       * Active check
       */

      if (!selectedTask.is_active) {
        setErrorMessage(
          "এই কাজটি বর্তমানে Admin-এর মাধ্যমে বন্ধ করা হয়েছে।"
        );

        return;
      }

      /*
       * Current user's current-cycle submission
       */

      const currentSubmission =
        getSubmission(
          selectedTask
        );

      if (currentSubmission) {
        setErrorMessage(
          "এই ২৪ ঘণ্টার সাইকেলে এই কাজটি ইতিমধ্যে জমা দেওয়া হয়েছে।"
        );

        return;
      }

      /*
       * Screenshot required
       */

      if (
        selectedTask.screenshot_required &&
        !selectedFile
      ) {
        setErrorMessage(
          "এই কাজের জন্য Screenshot প্রয়োজন।"
        );

        return;
      }

      try {
        setUploading(true);

        /*
         * ====================================================
         * AUTH
         * ====================================================
         */

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          setErrorMessage(
            "আপনার Login session পাওয়া যায়নি। আবার Login করুন।"
          );

          setUploading(false);

          router.push("/login");

          return;
        }

        let screenshotUrl:
          | string
          | null = null;

        /*
         * ====================================================
         * SCREENSHOT UPLOAD
         * ====================================================
         */

        if (selectedFile) {
          const extension =
            selectedFile.name
              .split(".")
              .pop()
              ?.toLowerCase() ||
            "jpg";

          const safeExtension = [
            "jpg",
            "jpeg",
            "png",
            "webp",
          ].includes(
            extension
          )
            ? extension
            : "jpg";

          const fileName =
            `${user.id}/${selectedTask.id}/${Date.now()}.${safeExtension}`;

          try {
            const {
              error: uploadError,
            } =
              await supabase.storage
                .from(
                  "task-screenshots"
                )
                .upload(
                  fileName,
                  selectedFile,
                  {
                    cacheControl:
                      "3600",
                    upsert: false,
                    contentType:
                      selectedFile.type ||
                      "image/jpeg",
                  }
                );

            if (uploadError) {
              console.error(
                "SCREENSHOT UPLOAD ERROR:",
                uploadError
              );

              throw uploadError;
            }
          } catch (
            storageError: any
          ) {
            console.error(
              "STORAGE ERROR:",
              storageError
            );

            const storageMessage =
              storageError?.message ||
              "";

            if (
              storageMessage
                .toLowerCase()
                .includes(
                  "failed to fetch"
                )
            ) {
              throw new Error(
                "Screenshot upload করা যাচ্ছে না। Supabase Storage connection বা task-screenshots bucket-এর permission সমস্যা হয়েছে।"
              );
            }

            throw new Error(
              storageMessage ||
                "Screenshot upload করতে সমস্যা হয়েছে।"
            );
          }

          /*
           * Public URL
           */

          const {
            data: publicUrlData,
          } =
            supabase.storage
              .from(
                "task-screenshots"
              )
              .getPublicUrl(
                fileName
              );

          screenshotUrl =
            publicUrlData?.publicUrl ??
            null;

          if (!screenshotUrl) {
            throw new Error(
              "Screenshot-এর URL পাওয়া যায়নি।"
            );
          }
        }

        /*
         * ====================================================
         * DATABASE SUBMISSION
         * ====================================================
         */

        let submissionId:
          | string
          | null = null;

        try {
          const {
            data,
            error: submitError,
          } =
            await supabase.rpc(
              "submit_package_task",
              {
                p_task_id:
                  selectedTask.id,

                p_screenshot_url:
                  screenshotUrl,
              }
            );

          if (submitError) {
            console.error(
              "SUBMIT TASK ERROR:",
              submitError
            );

            throw submitError;
          }

          if (
            data !== null &&
            data !== undefined
          ) {
            submissionId =
              String(data);
          }
        } catch (
          rpcError: any
        ) {
          console.error(
            "SUBMIT RPC ERROR:",
            rpcError
          );

          const rpcMessage =
            rpcError?.message ||
            "";

          if (
            rpcMessage
              .toLowerCase()
              .includes(
                "failed to fetch"
              )
          ) {
            throw new Error(
              "কাজ Submit করা যাচ্ছে না। Supabase connection বা submit_package_task RPC-তে সমস্যা হয়েছে।"
            );
          }

          throw rpcError;
        }

        /*
         * ====================================================
         * VERIFY
         * ====================================================
         */

        if (!submissionId) {
          throw new Error(
            "Submission ID পাওয়া যায়নি।"
          );
        }

        /*
         * ====================================================
         * CLOSE
         * ====================================================
         */

        setShowUploadModal(false);
        setSelectedTask(null);
        setSelectedFile(null);
        setErrorMessage(null);

        setMessage(
          "কাজ সফলভাবে জমা হয়েছে। Admin যাচাই করার পর Reward যোগ হবে।"
        );

        /*
         * Reload
         */

        await loadTasks(false);
      } catch (error: any) {
        console.error(
          "HANDLE SUBMIT ERROR:",
          error
        );

        const errorText =
          error?.message || "";

        const normalizedError =
          errorText.toLowerCase();

        if (
          normalizedError.includes(
            "already submitted"
          )
        ) {
          setErrorMessage(
            "এই ২৪ ঘণ্টার সাইকেলে এই কাজটি ইতিমধ্যে জমা দেওয়া হয়েছে।"
          );
        } else if (
          normalizedError.includes(
            "screenshot is required"
          )
        ) {
          setErrorMessage(
            "এই কাজের জন্য Screenshot প্রয়োজন।"
          );
        } else if (
          normalizedError.includes(
            "not eligible"
          )
        ) {
          setErrorMessage(
            "এই কাজের জন্য আপনার কোনো Active Package নেই।"
          );
        } else if (
          normalizedError.includes(
            "task is not available"
          )
        ) {
          setErrorMessage(
            "এই কাজটি বর্তমানে Admin-এর মাধ্যমে বন্ধ করা হয়েছে।"
          );
        } else if (
          normalizedError.includes(
            "task not found"
          )
        ) {
          setErrorMessage(
            "এই কাজটি আর পাওয়া যাচ্ছে না।"
          );
        } else if (
          normalizedError.includes(
            "failed to fetch"
          )
        ) {
          setErrorMessage(
            "Server-এর সাথে সংযোগ করা যাচ্ছে না। Screenshot upload বা Supabase connection পরীক্ষা করুন।"
          );
        } else if (
          normalizedError.includes(
            "row-level security"
          ) ||
          normalizedError.includes(
            "permission denied"
          ) ||
          normalizedError.includes(
            "new row violates"
          )
        ) {
          setErrorMessage(
            "Permission সমস্যার কারণে Submit করা যাচ্ছে না। Supabase policy/RLS পরীক্ষা করতে হবে।"
          );
        } else {
          setErrorMessage(
            errorText ||
              "কাজ জমা দিতে সমস্যা হয়েছে।"
          );
        }
      } finally {
        setUploading(false);
      }
    };

  /*
   * ============================================================
   * COUNTS
   * ============================================================
   */

  const pendingCount =
    useMemo(() => {
      return tasks.filter(
        (task) =>
          getSubmission(
            task
          )?.status ===
          "pending"
      ).length;
    }, [
      tasks,
      getSubmission,
    ]);

  const availableCount =
    useMemo(() => {
      return tasks.filter(
        (task) =>
          !getSubmission(task)
      ).length;
    }, [
      tasks,
      getSubmission,
    ]);

  /*
   * Prevent unused variable build/lint issue.
   */

  void pendingCount;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <Header />

      <main className="mx-auto w-full max-w-3xl px-4 pt-5">
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              কাজ
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              আপনার Active Package অনুযায়ী কাজগুলো এখানে দেখানো হবে।
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {refreshing
              ? "লোড হচ্ছে..."
              : "রিফ্রেশ"}
          </button>
        </div>

        {/* ================================================== */}
        {/* MESSAGE */}
        {/* ================================================== */}

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {errorMessage &&
          !showUploadModal && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

        {/* ================================================== */}
        {/* SUMMARY */}
        {/* ================================================== */}

        {!loading &&
          tasks.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">
                  মোট কাজ
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {tasks.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">
                  জমা দেওয়া হয়নি
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {availableCount}
                </p>
              </div>
            </div>
          )}

        {/* ================================================== */}
        {/* LOADING */}
        {/* ================================================== */}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-3xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="h-5 w-32 rounded bg-slate-800" />

                  <div className="mt-4 h-7 w-3/4 rounded bg-slate-800" />

                  <div className="mt-3 h-4 w-full rounded bg-slate-800" />

                  <div className="mt-2 h-4 w-2/3 rounded bg-slate-800" />

                  <div className="mt-5 h-11 rounded-xl bg-slate-800" />
                </div>
              )
            )}
          </div>
        )}

        {/* ================================================== */}
        {/* NO TASK */}
        {/* ================================================== */}

        {!loading &&
          !errorMessage &&
          tasks.length === 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-3xl">
                📋
              </div>

              <h2 className="mt-5 text-xl font-bold">
                কোনো কাজ পাওয়া যায়নি
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                আপনার Active Package অনুযায়ী বর্তমানে কোনো কাজ নেই।
              </p>

              <Link
                href="/packages"
                className="mt-5 inline-flex rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                প্যাকেজ দেখুন
              </Link>
            </div>
          )}

        {/* ================================================== */}
        {/* TASK LIST */}
        {/* ================================================== */}

        {!loading &&
          tasks.length > 0 && (
            <div className="space-y-4">
              {tasks.map(
                (task) => {
                  /*
                   * Final safety check.
                   */

                  if (!task.is_active) {
                    return null;
                  }

                  const submission =
                    getSubmission(
                      task
                    );

                  const submittedThisCycle =
                    Boolean(
                      submission
                    );

                  const isPending =
                    submission?.status ===
                    "pending";

                  const isApproved =
                    submission?.status ===
                    "approved";

                  const isRejected =
                    submission?.status ===
                    "rejected";

                  return (
                    <div
                      key={task.id}
                      className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20"
                    >
                      {/* TASK TOP */}

                      <div className="border-b border-slate-800 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="mb-2 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                              ৳
                              {formatMoney(
                                task.package_amount
                              )}{" "}
                              প্যাকেজ
                            </div>

                            <h2 className="text-lg font-bold leading-7">
                              {task.title}
                            </h2>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-xs text-slate-500">
                              রিওয়ার্ড
                            </p>

                            <p className="text-lg font-extrabold text-emerald-400">
                              ৳
                              {formatMoney(
                                task.reward_amount
                              )}
                            </p>
                          </div>
                        </div>

                        {task.description && (
                          <p className="mt-3 text-sm leading-6 text-slate-400">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* CURRENT CYCLE */}

                      <div className="p-5">
                        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-slate-500">
                                এই ২৪ ঘণ্টার সাইকেল
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-200">
                                সময় বাকি
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-800 px-3 py-2 font-mono text-sm font-bold text-amber-400">
                              {formatCountdown(
                                task.remaining_seconds
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SUBMISSION STATUS */}

                        {submittedThisCycle && (
                          <div
                            className={`mb-4 rounded-2xl border px-4 py-3 ${
                              isApproved
                                ? "border-emerald-500/30 bg-emerald-500/10"
                                : isPending
                                ? "border-amber-500/30 bg-amber-500/10"
                                : isRejected
                                ? "border-red-500/30 bg-red-500/10"
                                : "border-slate-700 bg-slate-800/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-xl">
                                {isApproved
                                  ? "✅"
                                  : isPending
                                  ? "⏳"
                                  : "❌"}
                              </div>

                              <div>
                                <p
                                  className={`text-sm font-bold ${
                                    isApproved
                                      ? "text-emerald-400"
                                      : isPending
                                      ? "text-amber-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {isApproved
                                    ? "অনুমোদিত"
                                    : isPending
                                    ? "যাচাই চলছে"
                                    : "প্রত্যাখ্যাত"}
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-400">
                                  এই ২৪ ঘণ্টার সাইকেলে কাজটি ইতিমধ্যে জমা দেওয়া হয়েছে। পরবর্তী সাইকেল শুরু হলে আবার Submit করতে পারবেন।
                                </p>

                                {submission?.admin_note && (
                                  <p className="mt-2 text-xs text-slate-300">
                                    নোট:{" "}
                                    {
                                      submission.admin_note
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ACTION BUTTONS */}

                        {!submittedThisCycle && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleStartTask(
                                  task
                                )
                              }
                              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                            >
                              কাজ শুরু করুন
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openSubmission(
                                  task
                                )
                              }
                              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                            >
                              প্রুফ আপলোড
                            </button>
                          </div>
                        )}

                        {submittedThisCycle && (
                          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-center text-xs text-slate-500">
                            পরবর্তী ২৪ ঘণ্টার সাইকেলে আবার Submit করা যাবে
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

        {/* ================================================== */}
        {/* HISTORY */}
        {/* ================================================== */}

        {!loading &&
          submissions.length > 0 && (
            <div className="mt-8">
              <div className="mb-4">
                <h2 className="text-xl font-bold">
                  জমা দেওয়ার ইতিহাস
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  আপনার আগের সব কাজের Submission এখানে থাকবে।
                </p>
              </div>

              <div className="space-y-3">
                {submissions.map(
                  (submission) => (
                    <div
                      key={submission.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200">
                            {submission.title ||
                              "কাজ"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            প্যাকেজ: ৳
                            {formatMoney(
                              Number(
                                submission.package_amount ||
                                  0
                              )
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            জমা:{" "}
                            {submission.submitted_at
                              ? new Date(
                                  submission.submitted_at
                                ).toLocaleString(
                                  "bn-BD"
                                )
                              : "-"}
                          </p>

                          {submission.cycle_started_at && (
                            <p className="mt-1 text-xs text-slate-600">
                              সাইকেল:{" "}
                              {new Date(
                                submission.cycle_started_at
                              ).toLocaleString(
                                "bn-BD"
                              )}
                            </p>
                          )}
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                            submission.status ===
                            "approved"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : submission.status ===
                                "pending"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {submission.status ===
                          "approved"
                            ? "অনুমোদিত"
                            : submission.status ===
                              "pending"
                            ? "যাচাই চলছে"
                            : "প্রত্যাখ্যাত"}
                        </span>
                      </div>

                      {submission.admin_note && (
                        <div className="mt-3 rounded-xl bg-slate-950 p-3 text-xs text-slate-400">
                          Admin Note:{" "}
                          {
                            submission.admin_note
                          }
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
      </main>

      {/* ====================================================== */}
      {/* PROOF UPLOAD MODAL */}
      {/* ====================================================== */}

      {showUploadModal &&
        selectedTask && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 sm:p-5">
            <div
              className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
              style={{
                maxHeight:
                  "calc(100dvh - 24px)",
              }}
            >
              {/* POPUP HEADER */}

              <div className="shrink-0 border-b border-slate-800 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold sm:text-xl">
                      প্রুফ আপলোড করুন
                    </h2>

                    <p className="mt-1 truncate text-xs text-slate-400 sm:text-sm">
                      {selectedTask.title}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeUploadModal
                    }
                    disabled={uploading}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="বন্ধ করুন"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* POPUP CONTENT */}

              <div
                className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5"
                style={{
                  WebkitOverflowScrolling:
                    "touch",
                }}
              >
                {/* REWARD */}

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-400">
                      রিওয়ার্ড
                    </span>

                    <span className="font-bold text-emerald-400">
                      ৳
                      {formatMoney(
                        selectedTask.reward_amount
                      )}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-400">
                      প্যাকেজ
                    </span>

                    <span className="font-semibold text-white">
                      ৳
                      {formatMoney(
                        selectedTask.package_amount
                      )}
                    </span>
                  </div>
                </div>

                {/* SCREENSHOT */}

                {selectedTask.screenshot_required && (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Screenshot
                    </label>

                    <label className="flex min-h-[145px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-5 text-center transition hover:border-emerald-500/50">
                      <div className="text-3xl">
                        📷
                      </div>

                      <p className="mt-2 text-sm font-semibold text-white">
                        {selectedFile
                          ? "Screenshot পরিবর্তন করুন"
                          : "Screenshot নির্বাচন করুন"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        JPG, PNG অথবা WebP
                      </p>

                      {selectedFile && (
                        <div className="mt-3 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                          <p className="truncate text-xs font-semibold text-emerald-400">
                            {
                              selectedFile.name
                            }
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            Screenshot নির্বাচন করা হয়েছে
                          </p>
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/*"
                        onChange={
                          handleFileChange
                        }
                        className="hidden"
                        disabled={
                          uploading
                        }
                      />
                    </label>
                  </div>
                )}

                {/* NO SCREENSHOT */}

                {!selectedTask.screenshot_required && (
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
                    এই কাজের জন্য Screenshot প্রয়োজন নেই।
                  </div>
                )}

                {/* ERROR */}

                {errorMessage && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
                    {errorMessage}
                  </div>
                )}

                <div className="h-2" />
              </div>

              {/* POPUP ACTIONS */}

              <div
                className="shrink-0 border-t border-slate-800 bg-slate-900 px-4 pt-3 sm:px-5"
                style={{
                  paddingBottom:
                    "max(12px, env(safe-area-inset-bottom))",
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={
                      closeUploadModal
                    }
                    disabled={
                      uploading
                    }
                    className="min-h-[50px] rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    বাতিল
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleSubmit
                    }
                    disabled={
                      uploading ||
                      (selectedTask.screenshot_required &&
                        !selectedFile)
                    }
                    className="min-h-[50px] rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 active:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading
                      ? "জমা হচ্ছে..."
                      : "জমা দিন"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      <BottomNav />
    </div>
  );
}