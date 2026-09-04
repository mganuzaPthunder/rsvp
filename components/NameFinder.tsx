"use client";

import { useEffect, useRef, useState } from "react";

type Match = { id: string; name: string; groupName: string; href: string };

/**
 * Home-page name search. It does not collect replies — it finds the guest and
 * sends them to their group's invite link, where the answering happens.
 */
export default function NameFinder() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);

  /** Latest request wins — a slow early response must not clobber a newer one. */
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setMatches(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/find?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (id !== requestId.current) return;
        setMatches(data.matches ?? []);
      } catch {
        if (id === requestId.current) setMatches([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="search">
      <div className="search__field">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your name to find your group…"
          aria-label="Search for your name"
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <span className="search__spinner" aria-hidden="true" />}
      </div>

      <p className="search__note" role="status">
        {query.trim().length < 2
          ? "Start typing at least two letters."
          : !loading && matches?.length === 0
            ? `We couldn't find "${query.trim()}" on the list. Try your first or last name, or reach out to the host.`
            : ""}
      </p>

      {matches && matches.length > 0 && (
        <div className="chips">
          {matches.map((match) => (
            <a key={match.id} className="chip" href={match.href}>
              {match.name}
              <small>{match.groupName}</small>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="#a9776a" strokeWidth="1.6" />
      <path d="M16.5 16.5L21 21" stroke="#a9776a" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
