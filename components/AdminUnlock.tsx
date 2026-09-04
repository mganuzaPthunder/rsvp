"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Host-side unlock / re-lock. The key travels in the request body and is
 * checked server-side; this button only decides what to ask for.
 */
export default function AdminUnlock({
  adminKey,
  memberId,
  action,
  label,
  solid = false,
}: {
  adminKey: string;
  memberId: string;
  action: "unlock" | "relock" | "dismiss";
  label: string;
  solid?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className={`admin-button${solid ? " admin-button--solid" : ""}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: adminKey, action, memberId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? "Failed.");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "…" : label}
      </button>
      {error && <span className="status-line status-line--error">{error}</span>}
    </>
  );
}
