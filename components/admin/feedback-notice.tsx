"use client";

type FeedbackTone = "success" | "error" | "warning" | "info";

const styles: Record<FeedbackTone, { container: string; icon: string; label: string }> = {
  success: { container: "border-green-200 bg-green-50 text-green-950", icon: "text-green-700", label: "نجاح" },
  error: { container: "border-red-200 bg-red-50 text-red-950", icon: "text-red-700", label: "خطأ" },
  warning: { container: "border-amber-200 bg-amber-50 text-amber-950", icon: "text-amber-700", label: "تنبيه" },
  info: { container: "border-blue-200 bg-blue-50 text-blue-950", icon: "text-blue-700", label: "معلومة" },
};

export function FeedbackNotice({
  tone,
  message,
  onDismiss,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  className = "",
}: {
  tone: FeedbackTone;
  message: string;
  onDismiss?: () => void;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  className?: string;
}) {
  const style = styles[tone];
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${style.container} ${className}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`}>
        {tone === "success" ? <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {tone === "error" ? <><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="M10 6.5v4.25m0 2.75h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></> : null}
        {tone === "warning" ? <><path d="M10 2.8 18 17H2L10 2.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M10 7v4m0 2.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></> : null}
        {tone === "info" ? <><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="M10 9v4m0-6h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></> : null}
      </svg>
      <div className="min-w-0 flex-1">
        <span className="me-1 font-semibold">{style.label}:</span>
        <span>{message}</span>
      </div>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="إغلاق الإشعار" className="-me-1 -mt-1 rounded-lg p-1 text-current/70 transition hover:bg-black/5 hover:text-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </button>
      ) : null}
    </div>
  );
}
