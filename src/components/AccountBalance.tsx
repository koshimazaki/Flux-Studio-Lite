import { useEffect, useMemo, useRef, useState } from "react";
import { request } from "../useJobs";
import Icon from "./Icon";

type Balance = { credits: number; checkedAt: string };
export default function AccountBalance({
  apiKey,
  hasServerKey,
  revision,
  onVerified,
}: {
  apiKey: string;
  hasServerKey: boolean;
  revision: string;
  onVerified: (verified: boolean) => void;
}) {
  const connected = Boolean(apiKey || hasServerKey);
  const [refresh, setRefresh] = useState(0);
  const owner = useMemo(() => Symbol("connection"), [apiKey, hasServerKey]);
  const [result, setResult] = useState<{
    owner?: symbol;
    balance?: Balance;
    error?: string;
    loading: boolean;
  }>({ loading: false });
  const lastOwner = useRef<symbol | null>(null);
  useEffect(() => {
    // Only a changed connection is unverified. A re-check after a generation
    // keeps the last known balance on screen instead of flickering.
    const reconnected = lastOwner.current !== owner;
    lastOwner.current = owner;
    if (reconnected) onVerified(false);
    if (!connected) {
      setResult({ owner, loading: false });
      return;
    }
    const controller = new AbortController();
    if (reconnected) setResult({ owner, loading: true });
    request<Balance>("/api/credits", {
      headers: apiKey ? { "x-byo-key": apiKey } : {},
      signal: controller.signal,
    })
      .then((balance) => {
        if (!controller.signal.aborted) {
          setResult({ owner, balance, loading: false });
          onVerified(true);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({ owner, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [apiKey, connected, owner, refresh, revision, onVerified]);
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setRefresh((value) => value + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  if (!connected)
    return (
      <span className="local-label">
        <i />
        BFL ACCOUNT
      </span>
    );
  const current = result.owner === owner ? result : { loading: true };
  const balance = "balance" in current ? current.balance : undefined;
  const error = "error" in current ? current.error : undefined;
  return (
    <button
      className={`account-balance ${error ? "account-balance--error" : ""}`}
      onClick={() => setRefresh((value) => value + 1)}
      disabled={current.loading}
      aria-label={
        current.loading ? "Checking BFL balance" : "Refresh BFL balance"
      }
      title={
        error ||
        (balance
          ? `Key verified · ${balance.credits.toLocaleString()} BFL credits · checked ${new Date(balance.checkedAt).toLocaleTimeString()}. Click to refresh.`
          : "Check account balance")
      }
    >
      <span className="account-balance__readout" aria-live="polite">
        <span>
          {current.loading
            ? "CHECKING KEY"
            : error
              ? "BALANCE UNAVAILABLE"
              : "BFL BALANCE"}
        </span>
        <strong>
          {balance
            ? `$${(balance.credits / 100).toFixed(2)}`
            : current.loading
              ? "…"
              : "Retry"}
        </strong>
      </span>
      <Icon name="refresh" size={12} />
      {error && <span className="sr-only">{error}</span>}
    </button>
  );
}
