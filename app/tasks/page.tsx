"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  status:
    | "pending"
    | "approved"
    | "rejected";
  admin_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  cycle_started_at: string;
};

export default function TasksPage() {
  const router = useRouter();

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [submissions, setSubmissions] =
    useState<Submission[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [selectedTask, setSelectedTask] =
    useState<Task | null>(null);

  const [showUploadModal, setShowUploadModal] =
    useState(false);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  /*
   * Prevent multiple cycle reloads
   * at the exact same time.
   */
  const cycleRefreshLock =
    useRef(false);

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
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          console.error(
            "TASK USER ERROR:",
            userError
          );
        }

        if (!user) {
          setTasks([]);
          setSubmissions([]);
          setLoading(false);
          return;
        }

        /*
         * ======================================================
         * GET CURRENT GLOBAL-CYCLE TASKS
         * ======================================================
         */

        const {
          data: loadedTasks,
          error: tasksError,
        } =
          await supabase.rpc(
            "get_my_tasks"
          );

        if (tasksError) {
          console.error(
            "GET MY TASKS ERROR:",
            tasksError
          );

          throw tasksError;
        }

        /*
         * ======================================================
         * GET COMPLETE SUBMISSION HISTORY
         * ======================================================
         */

        const {
          data:
            loadedSubmissions,
          error:
            submissionsError,
        } =
          await supabase.rpc(
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
         * NORMALIZE TASKS
         * ======================================================
         */

        const normalizedTasks: Task[] =
          (loadedTasks ?? []).map(
            (task: any) => {
              const cycleStartedAt =
                task.cycle_started_at ??
                new Date().toISOString();

              const expiresAt =
                task.expires_at ??
                new Date(
                  new Date(
                    cycleStartedAt
                  ).getTime() +
                    24 *
                      60 *
                      60 *
                      1000
                ).toISOString();

              return {
                id: task.id,

                package_amount:
                  Number(
                    task.package_amount ??
                      0
                  ),

                title:
                  task.title ??
                  "কাজ",

                description:
                  task.description ??
                  null,

                task_url:
                  task.task_url ??
                  "",

                reward_amount:
                  Number(
                    task.reward_amount ??
                      0
                  ),

                screenshot_required:
                  Boolean(
                    task.screenshot_required
                  ),

                is_active:
                  Boolean(
                    task.is_active
                  ),

                created_at:
                  task.created_at,

                expires_at:
                  expiresAt,

                remaining_seconds:
                  Math.max(
                    0,
                    Number(
                      task.remaining_seconds ??
                        0
                    )
                  ),

                submission_status:
                  task.submission_status ===
                    "pending" ||
                  task.submission_status ===
                    "approved" ||
                  task.submission_status ===
                    "rejected"
                    ? task.submission_status
                    : null,

                /*
                 * GLOBAL CYCLE
                 */
                cycle_started_at:
                  cycleStartedAt,
              };
            }
          );

        /*
         * ======================================================
         * NORMALIZE SUBMISSIONS
         * ======================================================
         */

        const normalizedSubmissions: Submission[] =
          (
            loadedSubmissions ??
            []
          ).map(
            (submission: any) => ({
              id:
                submission.id,

              task_id:
                submission.task_id,

              package_amount:
                submission.package_amount !=
                null
                  ? Number(
                      submission.package_amount
                    )
                  : undefined,

              title:
                submission.title ??
                undefined,

              reward_amount:
                submission.reward_amount !=
                null
                  ? Number(
                      submission.reward_amount
                    )
                  : undefined,

              screenshot_url:
                submission.screenshot_url ??
                null,

              status:
                submission.status,

              admin_note:
                submission.admin_note ??
                null,

              submitted_at:
                submission.submitted_at,

              reviewed_at:
                submission.reviewed_at ??
                null,

              cycle_started_at:
                submission.cycle_started_at,
            })
          );

        /*
         * ======================================================
         * SAVE STATE
         * ======================================================
         */

        setTasks(
          normalizedTasks
        );

        setSubmissions(
          normalizedSubmissions
        );
      } catch (error: any) {
        console.error(
          "LOAD TASKS ERROR:",
          error
        );

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
   * LOCK BODY SCROLL WHILE UPLOAD MODAL IS OPEN
   *
   * IMPORTANT FOR MOBILE
   *
   * This prevents the page behind the modal from scrolling and
   * sending the modal/buttons outside the visible viewport.
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
   * GET CURRENT GLOBAL CYCLE START
   *
   * IMPORTANT:
   *
   * NEVER calculate this from task.created_at.
   *
   * The RPC already gives us the synchronized
   * global cycle_started_at.
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

        return new Date(
          task.cycle_started_at
        ).getTime();
      },
      []
    );

  /*
   * ============================================================
   * FIND SUBMISSION FOR CURRENT GLOBAL CYCLE
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

        /*
         * Prefer actual submission history.
         */

        const currentCycleSubmission =
          submissions.find(
            (submission) => {
              if (
                submission.task_id !==
                task.id
              ) {
                return false;
              }

              if (
                !submission.cycle_started_at
              ) {
                return false;
              }

              const submissionCycle =
                new Date(
                  submission.cycle_started_at
                ).getTime();

              /*
               * Exact global cycle match.
               */
              return (
                submissionCycle ===
                currentCycleStart
              );
            }
          );

        if (
          currentCycleSubmission
        ) {
          return currentCycleSubmission;
        }

        /*
         * ======================================================
         * RPC STATUS FALLBACK
         *
         * This is important immediately after submission
         * before the complete history finishes updating.
         * ======================================================
         */

        if (
          task.submission_status ===
            "pending" ||
          task.submission_status ===
            "approved" ||
          task.submission_status ===
            "rejected"
        ) {
          return {
            id:
              `current-${task.id}`,

            task_id:
              task.id,

            screenshot_url:
              null,

            status:
              task.submission_status,

            admin_note:
              null,

            submitted_at:
              "",

            reviewed_at:
              null,

            cycle_started_at:
              task.cycle_started_at,
          } as Submission;
        }

        return null;
      },
      [
        getCurrentCycleStart,
        submissions,
      ]
    );

  /*
   * ============================================================
   * LIVE COUNTDOWN
   *
   * Countdown is based ONLY on expires_at returned by RPC.
   *
   * Submission time does NOT affect it.
   * ============================================================
   */

  useEffect(() => {
    if (!tasks.length) {
      return;
    }

    const timer =
      setInterval(() => {
        const now =
          Date.now();

        let cycleEnded = false;

        setTasks(
          (currentTasks) =>
            currentTasks.map(
              (task) => {
                const expiresAt =
                  new Date(
                    task.expires_at
                  ).getTime();

                const remainingSeconds =
                  Math.max(
                    0,
                    Math.floor(
                      (
                        expiresAt -
                        now
                      ) / 1000
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
         * When the global cycle ends,
         * reload DB state.
         *
         * This gives the same task a new
         * global cycle.
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

    return () =>
      clearInterval(timer);
  }, [
    tasks.length,
    loadTasks,
  ]);

  /*
   * ============================================================
   * ADMIN GLOBAL REFRESH DETECTION
   *
   * If Admin presses "সময় Refresh" while the user is already
   * sitting on this page, the User panel should update too.
   *
   * We periodically call get_my_tasks().
   *
   * 10 seconds is used so the user panel catches an Admin
   * refresh quickly without continuously hammering Supabase.
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

    return () =>
      clearInterval(
        interval
      );
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
        // loadTasks already handles error state.
      } finally {
        setRefreshing(false);
      }
    };

  /*
   * ============================================================
   * FORMAT MONEY
   * ============================================================
   */

  const formatMoney =
    (amount: number) => {
      return new Intl.NumberFormat(
        "en-BD"
      ).format(
        Number(
          amount || 0
        )
      );
    };

  /*
   * ============================================================
   * FORMAT COUNTDOWN
   * ============================================================
   */

  const formatCountdown =
    (seconds: number) => {
      const safeSeconds =
        Math.max(
          0,
          Math.floor(
            seconds
          )
        );

      const hours =
        Math.floor(
          safeSeconds /
            3600
        );

      const minutes =
        Math.floor(
          (safeSeconds %
            3600) /
            60
        );

      const secs =
        safeSeconds % 60;

      return [
        String(
          hours
        ).padStart(
          2,
          "0"
        ),

        String(
          minutes
        ).padStart(
          2,
          "0"
        ),

        String(
          secs
        ).padStart(
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
    async (
      task: Task
    ) => {
      setMessage(null);
      setErrorMessage(null);

      const submission =
        getSubmission(
          task
        );

      /*
       * Any submission in the current
       * global cycle blocks another submission.
       */

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
   * OPEN SUBMISSION MODAL
   * ============================================================
   */

  const openSubmission =
    (
      task: Task
    ) => {
      setMessage(null);
      setErrorMessage(null);

      const submission =
        getSubmission(
          task
        );

      /*
       * Pending / Approved / Rejected
       * সব current cycle-এ block করবে।
       */

      if (submission) {
        setMessage(
          "এই ২৪ ঘণ্টার সাইকেলে এই কাজটি ইতিমধ্যে জমা দেওয়া হয়েছে। পরবর্তী সাইকেলে আবার জমা দিতে পারবেন।"
        );

        return;
      }

      setSelectedTask(
        task
      );

      setSelectedFile(
        null
      );

      setShowUploadModal(
        true
      );
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

      setShowUploadModal(
        false
      );

      setSelectedTask(
        null
      );

      setSelectedFile(
        null
      );

      setErrorMessage(
        null
      );
    };

  /*
   * ============================================================
   * FILE CHANGE
   * ============================================================
   */

  const handleFileChange =
    (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0] ??
        null;

      setSelectedFile(
        file
      );

      setErrorMessage(
        null
      );
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

      setMessage(null);
      setErrorMessage(null);

      /*
       * ======================================================
       * CLIENT-SIDE CURRENT GLOBAL CYCLE CHECK
       * ======================================================
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
       * ======================================================
       * SCREENSHOT REQUIRED
       * ======================================================
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
        setUploading(
          true
        );

        /*
         * ====================================================
         * AUTH
         * ====================================================
         */

        const {
          data: {
            user,
          },
          error:
            userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          router.push(
            "/login"
          );

          return;
        }

        let screenshotUrl:
          | string
          | null = null;

        /*
         * ====================================================
         * UPLOAD SCREENSHOT
         * ====================================================
         */

        if (selectedFile) {
          const extension =
            selectedFile.name
              .split(".")
              .pop()
              ?.toLowerCase() ||
            "jpg";

          const fileName =
            `${user.id}/${selectedTask.id}/${Date.now()}.${extension}`;

          const {
            error:
              uploadError,
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

                  upsert:
                    false,
                }
              );

          if (uploadError) {
            console.error(
              "SCREENSHOT UPLOAD ERROR:",
              uploadError
            );

            throw uploadError;
          }

          const {
            data:
              publicUrlData,
          } =
            supabase.storage
              .from(
                "task-screenshots"
              )
              .getPublicUrl(
                fileName
              );

          screenshotUrl =
            publicUrlData
              ?.publicUrl ??
            null;
        }

        /*
         * ====================================================
         * DATABASE SUBMISSION
         *
         * The RPC itself calculates the current global cycle.
         *
         * Client does NOT send cycle_started_at.
         * ====================================================
         */

        const {
          data:
            submissionId,
          error:
            submitError,
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

        if (!submissionId) {
          throw new Error(
            "Submission ID পাওয়া যায়নি।"
          );
        }

        /*
         * ====================================================
         * CLOSE MODAL
         * ====================================================
         */

        setShowUploadModal(
          false
        );

        setSelectedTask(
          null
        );

        setSelectedFile(
          null
        );

        setMessage(
          "কাজ সফলভাবে জমা হয়েছে। Admin যাচাই করার পর Reward যোগ হবে।"
        );

        /*
         * ====================================================
         * RELOAD DATABASE STATE
         * ====================================================
         */

        await loadTasks(
          false
        );
      } catch (error: any) {
        console.error(
          "HANDLE SUBMIT ERROR:",
          error
        );

        const errorText =
          error?.message ||
          "কাজ জমা দিতে সমস্যা হয়েছে।";

        /*
         * ====================================================
         * FRIENDLY ERROR
         * ====================================================
         */

        if (
          errorText.includes(
            "already submitted"
          )
        ) {
          setErrorMessage(
            "এই ২৪ ঘণ্টার সাইকেলে এই কাজটি ইতিমধ্যে জমা দেওয়া হয়েছে।"
          );
        } else if (
          errorText.includes(
            "Screenshot is required"
          )
        ) {
          setErrorMessage(
            "এই কাজের জন্য Screenshot প্রয়োজন।"
          );
        } else if (
          errorText.includes(
            "not eligible"
          )
        ) {
          setErrorMessage(
            "এই কাজের জন্য আপনার কোনো Active Package নেই।"
          );
        } else {
          setErrorMessage(
            errorText
          );
        }
      } finally {
        setUploading(
          false
        );
      }
    };

  /*
   * ============================================================
   * TASK COUNTS
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
          !getSubmission(
            task
          )
      ).length;
    }, [
      tasks,
      getSubmission,
    ]);

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
            onClick={
              handleRefresh
            }
            disabled={
              refreshing
            }
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
                  const submission =
                    getSubmission(
                      task
                    );

                  const submittedThisCycle =
                    Boolean(
                      submission
                    );

                  const isPending =
                    submission
                      ?.status ===
                    "pending";

                  const isApproved =
                    submission
                      ?.status ===
                    "approved";

                  const isRejected =
                    submission
                      ?.status ===
                    "rejected";

                  return (
                    <div
                      key={
                        task.id
                      }
                      className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20"
                    >
                      {/* ========================================= */}
                      {/* TASK TOP */}
                      {/* ========================================= */}

                      <div className="border-b border-slate-800 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="mb-2 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                              ৳
                              {formatMoney(
                                task.package_amount
                              )}{" "}
                              PACKAGE
                            </div>

                            <h2 className="text-lg font-bold leading-7">
                              {
                                task.title
                              }
                            </h2>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-xs text-slate-500">
                              Reward
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
                            {
                              task.description
                            }
                          </p>
                        )}
                      </div>

                      {/* ========================================= */}
                      {/* CURRENT GLOBAL CYCLE */}
                      {/* ========================================= */}

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

                        {/* ========================================= */}
                        {/* SUBMISSION STATUS */}
                        {/* ========================================= */}

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

                        {/* ========================================= */}
                        {/* ACTION BUTTONS */}
                        {/* ========================================= */}

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
                  Submission History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  আপনার আগের সব কাজের Submission এখানে থাকবে।
                </p>
              </div>

              <div className="space-y-3">
                {submissions.map(
                  (
                    submission
                  ) => (
                    <div
                      key={
                        submission.id
                      }
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200">
                            {submission.title ||
                              "কাজ"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Package: ৳
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
                              Cycle:{" "}
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
                            ? "Pending"
                            : "Rejected"}
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
      {/* UPLOAD MODAL - MOBILE FIXED */}
      {/* ====================================================== */}

      {showUploadModal &&
        selectedTask && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-0 pt-4 pb-0 sm:items-center sm:p-4"
            onClick={(event) => {
              /*
               * Do not close modal by clicking overlay.
               *
               * This is especially important on mobile because
               * accidental touches should not close the upload form.
               */
              if (
                event.target ===
                event.currentTarget
              ) {
                return;
              }
            }}
          >
            <div
              className="
                flex
                w-full
                max-w-lg
                flex-col
                overflow-hidden
                rounded-t-3xl
                border
                border-slate-800
                bg-slate-900
                shadow-2xl
                sm:max-h-[90dvh]
                sm:rounded-3xl
              "
              style={{
                maxHeight:
                  "calc(100dvh - 12px)",
              }}
            >
              {/* ================================================= */}
              {/* MODAL HEADER */}
              {/* ================================================= */}

              <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold">
                      প্রুফ আপলোড করুন
                    </h2>

                    <p className="mt-1 truncate text-sm text-slate-400">
                      {
                        selectedTask.title
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeUploadModal
                    }
                    disabled={
                      uploading
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="বন্ধ করুন"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* ================================================= */}
              {/* MODAL SCROLLABLE CONTENT */}
              {/* ================================================= */}

              <div
                className="
                  min-h-0
                  flex-1
                  overflow-y-auto
                  overscroll-contain
                  px-5
                  py-5
                "
                style={{
                  WebkitOverflowScrolling:
                    "touch",
                }}
              >
                {/* =============================================== */}
                {/* REWARD / PACKAGE */}
                {/* =============================================== */}

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-400">
                      Reward
                    </span>

                    <span className="font-bold text-emerald-400">
                      ৳
                      {formatMoney(
                        selectedTask.reward_amount
                      )}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-400">
                      Package
                    </span>

                    <span className="font-semibold">
                      ৳
                      {formatMoney(
                        selectedTask.package_amount
                      )}
                    </span>
                  </div>
                </div>

                {/* =============================================== */}
                {/* SCREENSHOT REQUIRED */}
                {/* =============================================== */}

                {selectedTask.screenshot_required && (
                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Screenshot
                    </label>

                    <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-5 py-7 text-center transition hover:border-emerald-500/50 hover:bg-slate-950 active:bg-slate-950">
                      <div className="text-3xl">
                        📷
                      </div>

                      <p className="mt-2 text-sm font-semibold">
                        Screenshot নির্বাচন করুন
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        JPG, PNG অথবা WebP
                      </p>

                      {selectedFile && (
                        <div className="mt-3 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                          <p className="truncate text-xs font-semibold text-emerald-400">
                            {selectedFile.name}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            Screenshot নির্বাচন করা হয়েছে
                          </p>
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/*"
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

                {/* =============================================== */}
                {/* NO SCREENSHOT */}
                {/* =============================================== */}

                {!selectedTask.screenshot_required && (
                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                    এই কাজের জন্য Screenshot প্রয়োজন নেই।
                  </div>
                )}

                {/* =============================================== */}
                {/* ERROR */}
                {/* =============================================== */}

                {errorMessage && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
                    {
                      errorMessage
                    }
                  </div>
                )}

                {/* Extra bottom spacing so content never touches
                    the fixed/sticky action area. */}
                <div className="h-2" />
              </div>

              {/* ================================================= */}
              {/* FIXED/STICKY ACTION AREA */}
              {/* ================================================= */}

              <div
                className="
                  shrink-0
                  border-t
                  border-slate-800
                  bg-slate-900
                  px-5
                  pt-3
                "
                style={{
                  paddingBottom:
                    "max(12px, env(safe-area-inset-bottom))",
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  {/* CANCEL */}
                  <button
                    type="button"
                    onClick={
                      closeUploadModal
                    }
                    disabled={
                      uploading
                    }
                    className="min-h-[48px] rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    বাতিল
                  </button>

                  {/* SUBMIT */}
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
                    className="min-h-[48px] rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 active:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading
                      ? "জমা হচ্ছে..."
                      : "Submit"}
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