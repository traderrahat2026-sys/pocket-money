"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
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
};

type Submission = {
  id: string;
  task_id: string;
  screenshot_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

function taka(amount: number | null | undefined) {
  return `৳${Number(amount ?? 0).toLocaleString("en-BD")}`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRemaining(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>(
    []
  );

  const [selectedTask, setSelectedTask] =
    useState<Task | null>(null);

  const [screenshot, setScreenshot] = useState<File | null>(
    null
  );

  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
   * =====================================================
   * LOAD TASKS
   * =====================================================
   */

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoggedIn(false);
        setTasks([]);
        setSubmissions([]);
        return;
      }

      setLoggedIn(true);

      /*
       * Load available package tasks.
       */

      const {
        data: taskData,
        error: taskError,
      } = await supabase.rpc("get_my_tasks");

      if (taskError) {
        console.error(
          "Task loading error:",
          taskError
        );

        throw new Error(
          taskError.message ||
            "টাস্ক লোড করা যাচ্ছে না।"
        );
      }

      /*
       * Load user's package task submissions.
       */

      const {
        data: submissionData,
        error: submissionError,
      } = await supabase.rpc(
        "get_my_task_submissions"
      );

      if (submissionError) {
        console.error(
          "Submission history error:",
          submissionError
        );
      }

      const loadedSubmissions =
        (submissionData ?? []) as Submission[];

      const loadedTasks =
        (taskData ?? []) as Task[];

      /*
       * ---------------------------------------------------
       * IMPORTANT
       *
       * Merge submission history into task status.
       *
       * This prevents the UI from showing
       * Start Task / Upload Proof again after submission.
       * ---------------------------------------------------
       */

      const mergedTasks = loadedTasks.map((task) => {
        const latestSubmission =
          loadedSubmissions.find(
            (submission) =>
              submission.task_id === task.id
          );

        return {
          ...task,
          submission_status:
            latestSubmission?.status ??
            task.submission_status ??
            null,
        };
      });

      setTasks(mergedTasks);
      setSubmissions(loadedSubmissions);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "টাস্ক লোড করা যাচ্ছে না।"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * =====================================================
   * AUTH + INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;

      await loadTasks();
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event) => {
        if (!mounted) return;

        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          loadTasks();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadTasks]);

  /*
   * =====================================================
   * COUNTDOWN
   * =====================================================
   */

  useEffect(() => {
    if (tasks.length === 0) return;

    const interval = window.setInterval(() => {
      const now = Date.now();

      setTasks((currentTasks) =>
        currentTasks
          .map((task) => {
            const expiresAt = new Date(
              task.expires_at
            ).getTime();

            const remainingSeconds = Math.max(
              0,
              Math.floor(
                (expiresAt - now) / 1000
              )
            );

            return {
              ...task,
              remaining_seconds:
                remainingSeconds,
            };
          })
          .filter(
            (task) =>
              task.remaining_seconds > 0
          )
      );
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [tasks.length]);

  /*
   * =====================================================
   * GET SUBMISSION
   * =====================================================
   */

  const getSubmission = (task: Task) => {
    const historySubmission =
      submissions.find(
        (submission) =>
          submission.task_id === task.id
      );

    if (historySubmission) {
      return historySubmission;
    }

    /*
     * Fallback to task.submission_status.
     *
     * This is important because get_my_tasks()
     * already returns submission_status.
     */

    if (task.submission_status) {
      return {
        id: `task-status-${task.id}`,
        task_id: task.id,
        screenshot_url: null,
        status: task.submission_status,
        admin_note: null,
        submitted_at: "",
        reviewed_at: null,
      } as Submission;
    }

    return null;
  };

  /*
   * =====================================================
   * START TASK
   * =====================================================
   */

  const handleStartTask = (task: Task) => {
    setMessage("");
    setError("");

    /*
     * Safety:
     * Submitted/approved/pending task cannot
     * be started again.
     */

    const submission = getSubmission(task);

    if (
      submission?.status === "pending" ||
      submission?.status === "approved"
    ) {
      setMessage(
        "এই টাস্ক ইতিমধ্যে সম্পন্ন হয়েছে।"
      );
      return;
    }

    if (!loggedIn) {
      window.location.href = "/register";
      return;
    }

    if (!task.task_url) {
      setError(
        "এই টাস্কের লিংক পাওয়া যাচ্ছে না।"
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
   * =====================================================
   * OPEN SUBMISSION
   * =====================================================
   */

  const openSubmission = (task: Task) => {
    const submission = getSubmission(task);

    /*
     * Pending / approved task cannot open
     * submission modal.
     */

    if (
      submission?.status === "pending" ||
      submission?.status === "approved"
    ) {
      setMessage(
        "এই টাস্কের প্রুফ ইতিমধ্যে জমা হয়েছে।"
      );
      return;
    }

    setMessage("");
    setError("");
    setScreenshot(null);
    setSelectedTask(task);
  };

  /*
   * =====================================================
   * CLOSE SUBMISSION
   * =====================================================
   */

  const closeSubmission = () => {
    if (uploading) return;

    setSelectedTask(null);
    setScreenshot(null);
    setError("");
  };

  /*
   * =====================================================
   * SCREENSHOT CHANGE
   * =====================================================
   */

  const handleScreenshotChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setMessage("");
    setError("");

    const file = event.target.files?.[0];

    if (!file) {
      setScreenshot(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "শুধু ছবি ফাইল নির্বাচন করুন।"
      );

      event.target.value = "";
      setScreenshot(null);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError(
        "স্ক্রিনশট ৮ MB-এর মধ্যে হতে হবে।"
      );

      event.target.value = "";
      setScreenshot(null);
      return;
    }

    setScreenshot(file);
  };

  /*
   * =====================================================
   * SUBMIT TASK
   * =====================================================
   */

  const handleSubmit = async () => {
    if (!selectedTask) return;

    if (!loggedIn) {
      window.location.href = "/register";
      return;
    }

    /*
     * Extra frontend protection:
     * already submitted task cannot submit again.
     */

    const currentSubmission =
      getSubmission(selectedTask);

    if (
      currentSubmission?.status ===
        "pending" ||
      currentSubmission?.status === "approved"
    ) {
      setSelectedTask(null);
      setScreenshot(null);

      setMessage(
        "এই টাস্কের প্রুফ ইতিমধ্যে জমা হয়েছে।"
      );

      return;
    }

    if (
      selectedTask.screenshot_required &&
      !screenshot
    ) {
      setError(
        "সাবমিট করার আগে স্ক্রিনশট আপলোড করুন।"
      );
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "আপনার সেশন শেষ হয়ে গেছে। আবার Login করুন।"
        );
      }

      let screenshotUrl = "";

      /*
       * =================================================
       * UPLOAD SCREENSHOT
       * =================================================
       */

      if (screenshot) {
        const extension =
          screenshot.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const fileName =
          `${user.id}/${selectedTask.id}-${Date.now()}.${extension}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("task-screenshots")
          .upload(
            fileName,
            screenshot,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                screenshot.type,
            }
          );

        if (uploadError) {
          console.error(
            "Screenshot upload error:",
            uploadError
          );

          throw new Error(
            "স্ক্রিনশট আপলোড করা যায়নি। আবার চেষ্টা করুন।"
          );
        }

        const { data } =
          supabase.storage
            .from("task-screenshots")
            .getPublicUrl(
              fileName
            );

        screenshotUrl =
          data.publicUrl;
      }

      /*
       * =================================================
       * SUBMIT PACKAGE TASK
       * =================================================
       */

      const {
        data: submissionId,
        error: submitError,
      } = await supabase.rpc(
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
          "Task submission error:",
          submitError
        );

        throw new Error(
          submitError.message ||
            "টাস্ক সাবমিট করা যায়নি।"
        );
      }

      /*
       * =================================================
       * IMMEDIATE LOCAL UI UPDATE
       *
       * This is the important fix.
       *
       * The moment RPC succeeds, task becomes
       * pending locally.
       * =================================================
       */

      const nowIso =
        new Date().toISOString();

      const newSubmission: Submission = {
        id:
          String(
            submissionId ??
              `local-${Date.now()}`
          ),

        task_id:
          selectedTask.id,

        screenshot_url:
          screenshotUrl || null,

        status: "pending",

        admin_note: null,

        submitted_at:
          nowIso,

        reviewed_at: null,
      };

      /*
       * Add submission history immediately.
       */

      setSubmissions((current) => {
        const filtered =
          current.filter(
            (item) =>
              item.task_id !==
              selectedTask.id
          );

        return [
          newSubmission,
          ...filtered,
        ];
      });

      /*
       * Update task status immediately.
       */

      setTasks((currentTasks) =>
        currentTasks.map(
          (task) =>
            task.id ===
            selectedTask.id
              ? {
                  ...task,
                  submission_status:
                    "pending",
                }
              : task
        )
      );

      /*
       * Close modal.
       */

      setScreenshot(null);
      setSelectedTask(null);

      /*
       * Show success message.
       */

      setMessage(
        "টাস্ক সাবমিট হয়েছে। এখন অ্যাডমিন রিভিউ করবে।"
      );

      /*
       * Reload from database as a final sync.
       *
       * Local state is already updated, so the UI
       * will not temporarily show old buttons.
       */

      const {
        data: refreshedTasks,
        error: refreshedTaskError,
      } = await supabase.rpc(
        "get_my_tasks"
      );

      const {
        data: refreshedSubmissions,
        error:
          refreshedSubmissionError,
      } = await supabase.rpc(
        "get_my_task_submissions"
      );

      if (!refreshedTaskError) {
        const freshTasks =
          (refreshedTasks ??
            []) as Task[];

        const freshSubmissions =
          refreshedSubmissionError
            ? [newSubmission]
            : ((refreshedSubmissions ??
                []) as Submission[]);

        const finalTasks =
          freshTasks.map(
            (task) => {
              const latest =
                freshSubmissions.find(
                  (submission) =>
                    submission.task_id ===
                    task.id
                );

              return {
                ...task,
                submission_status:
                  latest?.status ??
                  task.submission_status ??
                  null,
              };
            }
          );

        setTasks(finalTasks);
        setSubmissions(
          freshSubmissions
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "টাস্ক সাবমিট করা যায়নি।"
      );
    } finally {
      setUploading(false);
    }
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7faf7] pb-28">
        <Header />

        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />

          <div className="mt-3 h-8 w-52 animate-pulse rounded-lg bg-gray-200" />

          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-gray-200" />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-3xl bg-white shadow-sm"
                />
              )
            )}
          </div>
        </div>

        <BottomNav />
      </main>
    );
  }

  /*
   * =====================================================
   * LOGGED OUT
   * =====================================================
   */

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-[#f7faf7] pb-28">
        <Header />

        <div className="mx-auto max-w-md px-4 py-10">
          <section className="rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
              <span className="text-2xl">
                ✓
              </span>
            </div>

            <h1 className="mt-5 text-2xl font-black text-gray-900">
              Login Required
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Login করুন অথবা নতুন
              অ্যাকাউন্ট তৈরি করুন এবং
              আপনার প্যাকেজের টাস্ক দেখুন।
            </p>

            <Link
              href="/login"
              className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-[#7ed957] text-sm font-black text-white shadow-lg shadow-green-100"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="mt-3 flex h-12 items-center justify-center rounded-2xl border border-gray-200 text-sm font-bold text-gray-700"
            >
              Registration
            </Link>
          </section>
        </div>

        <BottomNav />
      </main>
    );
  }

  /*
   * =====================================================
   * LOGGED IN
   * =====================================================
   */

  return (
    <main className="min-h-screen bg-[#f7faf7] pb-28">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-6">

        {/* HEADER */}

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4f9d32]">
            কাজ ও আয়
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900">
            আপনার টাস্ক
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            আপনার সক্রিয় প্যাকেজের জন্য
            নির্ধারিত টাস্ক সম্পন্ন করে
            প্রুফ জমা দিন।
          </p>
        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-semibold leading-6 text-green-700">
            {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-600">
            {error}
          </div>
        )}

        {/* NO TASK */}

        {tasks.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-2xl">
              📋
            </div>

            <h2 className="mt-4 text-lg font-black text-gray-900">
              কোনো টাস্ক নেই
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              বর্তমানে আপনার প্যাকেজের জন্য
              কোনো সক্রিয় টাস্ক নেই।
              নতুন টাস্ক পরে যোগ হতে পারে।
            </p>

            <Link
              href="/packages"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-green-200 bg-green-50 px-5 text-sm font-black text-[#4f9d32]"
            >
              প্যাকেজ দেখুন
            </Link>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {tasks.map((task) => {
              const submission =
                getSubmission(task);

              const isPending =
                submission?.status ===
                "pending";

              const isApproved =
                submission?.status ===
                "approved";

              const isRejected =
                submission?.status ===
                "rejected";

              const isCompleted =
                isPending ||
                isApproved;

              return (
                <article
                  key={task.id}
                  className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
                >
                  <div className="p-5">

                    {/* TASK HEADER */}

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#4f9d32]">
                          প্যাকেজ{" "}
                          {taka(
                            task.package_amount
                          )}
                        </span>

                        <h2 className="mt-3 text-lg font-black leading-6 text-gray-900">
                          {task.title}
                        </h2>
                      </div>

                      <div className="shrink-0 rounded-2xl bg-[#eef9e9] px-3 py-2 text-right">
                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                          পুরস্কার
                        </p>

                        <p className="mt-0.5 text-lg font-black text-[#4f9d32]">
                          {taka(
                            task.reward_amount
                          )}
                        </p>
                      </div>
                    </div>

                    {/* DESCRIPTION */}

                    {task.description && (
                      <p className="mt-4 text-sm leading-6 text-gray-500">
                        {task.description}
                      </p>
                    )}

                    {/* EXPIRY */}

                    <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-orange-500">
                            সময় বাকি
                          </p>

                          <p className="mt-1 font-mono text-lg font-black tracking-wider text-orange-700">
                            {formatRemaining(
                              task.remaining_seconds
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-bold text-orange-400">
                            তৈরি
                          </p>

                          <p className="mt-1 text-xs font-bold text-orange-700">
                            {formatDate(
                              task.created_at
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TASK LINK */}

                    <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                          🔗
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-black text-gray-800">
                            টাস্ক লিংক
                          </p>

                          <p className="mt-0.5 text-[11px] text-gray-400">
                            লিংকে গিয়ে প্রয়োজনীয়
                            কাজ সম্পন্ন করুন।
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SUBMISSION STATUS */}

                    {submission && (
                      <div
                        className={`mt-4 rounded-2xl border p-4 ${
                          isApproved
                            ? "border-green-100 bg-green-50"
                            : isRejected
                              ? "border-red-100 bg-red-50"
                              : "border-yellow-100 bg-yellow-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p
                              className={`text-xs font-black ${
                                isApproved
                                  ? "text-green-700"
                                  : isRejected
                                    ? "text-red-700"
                                    : "text-yellow-700"
                              }`}
                            >
                              {isApproved &&
                                "টাস্ক সম্পন্ন ✓"}

                              {isRejected &&
                                "প্রুফ বাতিল হয়েছে"}

                              {isPending &&
                                "টাস্ক সাবমিট হয়েছে"}
                            </p>

                            {submission.submitted_at && (
                              <p className="mt-1 text-[11px] text-gray-500">
                                জমা দেওয়া হয়েছে{" "}
                                {formatDate(
                                  submission.submitted_at
                                )}
                              </p>
                            )}
                          </div>

                          <span className="text-lg">
                            {isApproved &&
                              "✓"}

                            {isRejected &&
                              "×"}

                            {isPending &&
                              "⏳"}
                          </span>
                        </div>

                        {isPending && (
                          <p className="mt-2 text-xs font-semibold leading-5 text-yellow-700">
                            আপনার প্রুফ অ্যাডমিন
                            রিভিউ করছে। রিভিউ শেষ
                            না হওয়া পর্যন্ত আবার
                            সাবমিট করা যাবে না।
                          </p>
                        )}

                        {isApproved && (
                          <p className="mt-2 text-xs font-semibold leading-5 text-green-700">
                            আপনার টাস্ক সম্পন্ন হয়েছে।
                            অনুমোদিত রিওয়ার্ড আপনার
                            ওয়ালেটে যোগ হয়েছে।
                          </p>
                        )}

                        {isRejected &&
                          submission.admin_note && (
                            <p className="mt-2 text-xs leading-5 text-red-600">
                              কারণ:{" "}
                              {
                                submission.admin_note
                              }
                            </p>
                          )}
                      </div>
                    )}

                    {/* =================================================
                        ACTIONS

                        IMPORTANT:
                        Pending / Approved:
                        Start Task + Upload Proof HIDDEN

                        Rejected:
                        Start Task + Resubmit

                        No submission:
                        Start Task + Upload Proof
                    ================================================= */}

                    {isCompleted ? (
                      <div className="mt-5">
                        <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-green-50 text-sm font-black text-green-700">
                          {isApproved
                            ? "টাস্ক সম্পন্ন ✓"
                            : "টাস্ক সম্পন্ন • রিভিউ চলছে"}
                        </div>
                      </div>
                    ) : isRejected ? (
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleStartTask(
                              task
                            )
                          }
                          className="flex h-12 items-center justify-center rounded-2xl border border-green-200 bg-green-50 text-sm font-black text-[#4f9d32] transition hover:bg-green-100 active:scale-[0.98]"
                        >
                          টাস্ক শুরু করুন
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openSubmission(
                              task
                            )
                          }
                          className="flex h-12 items-center justify-center rounded-2xl bg-[#7ed957] text-sm font-black text-white shadow-lg shadow-green-100 transition hover:bg-[#6fca4b] active:scale-[0.98]"
                        >
                          আবার প্রুফ দিন
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleStartTask(
                              task
                            )
                          }
                          className="flex h-12 items-center justify-center rounded-2xl border border-green-200 bg-green-50 text-sm font-black text-[#4f9d32] transition hover:bg-green-100 active:scale-[0.98]"
                        >
                          টাস্ক শুরু করুন
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openSubmission(
                              task
                            )
                          }
                          className="flex h-12 items-center justify-center rounded-2xl bg-[#7ed957] text-sm font-black text-white shadow-lg shadow-green-100 transition hover:bg-[#6fca4b] active:scale-[0.98]"
                        >
                          প্রুফ আপলোড
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* ===================================================
            HISTORY
        ==================================================== */}

        {submissions.length > 0 && (
          <section className="mt-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                আপনার কার্যক্রম
              </p>

              <h2 className="mt-1 text-xl font-black text-gray-900">
                জমা দেওয়ার ইতিহাস
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              {submissions.map(
                (submission) => (
                  <div
                    key={submission.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-800">
                          টাস্ক প্রুফ
                        </p>

                        <p className="mt-1 text-[11px] text-gray-400">
                          {formatDate(
                            submission.submitted_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black ${
                          submission.status ===
                          "approved"
                            ? "bg-green-50 text-green-700"
                            : submission.status ===
                                "rejected"
                              ? "bg-red-50 text-red-600"
                              : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {submission.status ===
                          "approved" &&
                          "অনুমোদিত"}

                        {submission.status ===
                          "rejected" &&
                          "বাতিল"}

                        {submission.status ===
                          "pending" &&
                          "রিভিউ চলছে"}
                      </span>
                    </div>

                    {submission.admin_note && (
                      <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">
                        কারণ:{" "}
                        {
                          submission.admin_note
                        }
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        )}
      </div>

      {/* ===================================================
          SUBMISSION MODAL
      ==================================================== */}

      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="p-5">

              {/* HEADER */}

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#4f9d32]">
                    প্রুফ জমা দিন
                  </span>

                  <h2 className="mt-1 text-xl font-black text-gray-900">
                    {selectedTask.title}
                  </h2>

                  <p className="mt-1 text-xs font-bold text-gray-400">
                    পুরস্কার:{" "}
                    {taka(
                      selectedTask.reward_amount
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeSubmission}
                  disabled={uploading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg font-black text-gray-600 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              {/* INSTRUCTIONS */}

              <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-black text-green-800">
                  স্ক্রিনশট জমা দেওয়ার নিয়ম
                </p>

                <p className="mt-2 text-xs leading-5 text-green-700">
                  প্রথমে টাস্ক শুরু করুন এবং
                  টাস্কের লিংকে প্রয়োজনীয় কাজ
                  সম্পন্ন করুন। কাজ শেষ হলে
                  স্ক্রিনশট আপলোড করে প্রুফ
                  জমা দিন।
                </p>
              </div>

              {/* SCREENSHOT */}

              <div className="mt-5">
                <label
                  htmlFor="task-screenshot"
                  className="block text-sm font-black text-gray-800"
                >
                  স্ক্রিনশট আপলোড
                  {selectedTask.screenshot_required && (
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  )}
                </label>

                <p className="mt-1 text-xs leading-5 text-gray-400">
                  JPG, PNG বা WEBP • সর্বোচ্চ
                  ৮ MB
                </p>

                <label
                  htmlFor="task-screenshot"
                  className="mt-3 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-5 py-6 text-center transition hover:border-green-300 hover:bg-green-50"
                >
                  <span className="text-3xl">
                    📸
                  </span>

                  <span className="mt-2 max-w-full truncate px-3 text-sm font-bold text-gray-700">
                    {screenshot
                      ? screenshot.name
                      : "স্ক্রিনশট নির্বাচন করুন"}
                  </span>

                  <span className="mt-1 text-[11px] text-gray-400">
                    ছবি নির্বাচন করতে চাপ দিন
                  </span>

                  <input
                    id="task-screenshot"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={
                      handleScreenshotChange
                    }
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-600">
                  {error}
                </div>
              )}

              {/* SUBMIT */}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  uploading ||
                  (selectedTask.screenshot_required &&
                    !screenshot)
                }
                className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[#7ed957] text-sm font-black text-white shadow-lg shadow-green-100 transition hover:bg-[#6fca4b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading
                  ? "জমা দেওয়া হচ্ছে..."
                  : "প্রুফ জমা দিন"}
              </button>

              <button
                type="button"
                onClick={closeSubmission}
                disabled={uploading}
                className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl text-sm font-bold text-gray-500 disabled:opacity-50"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}