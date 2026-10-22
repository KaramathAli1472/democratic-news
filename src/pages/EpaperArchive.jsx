import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";

const PAGE_SIZE = 10;

function EpaperArchive() {
  const [editions, setEditions] = useState([]);
  const [lastDocument, setLastDocument] = useState(null);
  const [pageCursors, setPageCursors] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEditions() {
      setLoading(true);
      setError("");

      try {
        let epaperQuery = query(
          collection(db, "epapers"),
          where("status", "==", "published"),
          orderBy("editionDate", "desc"),
          limit(PAGE_SIZE + 1)
        );

        const cursor = pageCursors[page - 1];

        if (cursor) {
          epaperQuery = query(
            collection(db, "epapers"),
            where("status", "==", "published"),
            orderBy("editionDate", "desc"),
            startAfter(cursor),
            limit(PAGE_SIZE + 1)
          );
        }

        const snapshot = await getDocs(epaperQuery);

        if (cancelled) return;

        const docs = snapshot.docs;
        const moreAvailable = docs.length > PAGE_SIZE;
        const visibleDocs = docs.slice(0, PAGE_SIZE);

        setEditions(
          visibleDocs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );

        setHasMore(moreAvailable);
        setLastDocument(
          visibleDocs.length > 0
            ? visibleDocs[visibleDocs.length - 1]
            : null
        );
      } catch (err) {
        console.error("E-Paper archive load failed:", err);

        if (!cancelled) {
          setError(
            "Archive load nahi ho saka. Internet connection check karein aur dobara koshish karein."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEditions();

    return () => {
      cancelled = true;
    };
  }, [page, pageCursors]);

  function goToNextPage() {
    if (!hasMore || !lastDocument) return;

    setPageCursors((previous) => {
      const next = [...previous];
      next[page] = lastDocument;
      return next;
    });

    setPage((current) => current + 1);
  }

  function goToPreviousPage() {
    if (page > 1) {
      setPage((current) => current - 1);
    }
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    // YYYY-MM-DD format ko local timezone ke baghair display karein.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);

    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }

    return dateValue;
  }

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 48px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header style={{ marginBottom: "28px" }}>
        <h1 style={{ marginBottom: "8px" }}>E-Paper Archive</h1>

        <p style={{ color: "#666", margin: 0, lineHeight: 1.6 }}>
          Democratic News ke purane published editions yahan dekhein
          aur PDF open ya download karein.
        </p>

        <p style={{ marginTop: "16px" }}>
          <Link
            to="/epaper"
            style={{
              color: "#b91c1c",
              fontWeight: "bold",
              textDecoration: "none",
            }}
          >
            ← Latest E-Paper par wapas jaayein
          </Link>
        </p>
      </header>

      {loading && (
        <p role="status">E-Paper archive load ho raha hai...</p>
      )}

      {!loading && error && (
        <section
          role="alert"
          style={{
            padding: "20px",
            border: "1px solid #f0b4b4",
            borderRadius: "8px",
            color: "#b42318",
          }}
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() => {
              setPageCursors((previous) => [...previous]);
            }}
            style={{
              padding: "10px 16px",
              border: 0,
              borderRadius: "5px",
              background: "#b91c1c",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Dobara koshish karein
          </button>
        </section>
      )}

      {!loading && !error && editions.length === 0 && (
        <section
          style={{
            padding: "36px 20px",
            border: "1px solid #ddd",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h2>Abhi archive available nahi hai</h2>
          <p>
            Jab admin E-Paper editions publish karega, woh yahan
            dikhai denge.
          </p>
        </section>
      )}

      {!loading && !error && editions.length > 0 && (
        <>
          <p style={{ color: "#666", marginBottom: "18px" }}>
            Page {page} — har page par maximum {PAGE_SIZE} editions
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "18px",
            }}
          >
            {editions.map((edition) => (
              <article
                key={edition.id}
                style={{
                  padding: "22px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  background: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    margin: "0 0 12px",
                    overflowWrap: "anywhere",
                  }}
                >
                  {edition.title || "Democratic News"}
                </h2>

                <p style={{ color: "#666", margin: "0 0 18px" }}>
                  <strong>Edition Date:</strong>{" "}
                  {formatDate(edition.editionDate)}
                </p>

                {edition.pdfUrl ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <a
                      href={edition.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "10px 14px",
                        borderRadius: "5px",
                        background: "#b91c1c",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: "bold",
                      }}
                    >
                      Open PDF
                    </a>

                    <a
                      href={edition.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "10px 14px",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                        color: "#333",
                        textDecoration: "none",
                      }}
                    >
                      Download / View
                    </a>
                  </div>
                ) : (
                  <p role="alert" style={{ color: "#b42318" }}>
                    Is edition ki PDF URL available nahi hai.
                  </p>
                )}
              </article>
            ))}
          </div>

          <nav
            aria-label="E-Paper archive pagination"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "16px",
              marginTop: "30px",
            }}
          >
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={page === 1 || loading}
              style={{
                padding: "10px 16px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                background: page === 1 ? "#eee" : "#fff",
                cursor: page === 1 ? "not-allowed" : "pointer",
              }}
            >
              ← Previous
            </button>

            <span>Page {page}</span>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={!hasMore || loading}
              style={{
                padding: "10px 16px",
                border: 0,
                borderRadius: "5px",
                background: !hasMore ? "#eee" : "#b91c1c",
                color: !hasMore ? "#777" : "#fff",
                cursor: !hasMore ? "not-allowed" : "pointer",
              }}
            >
              Next →
            </button>
          </nav>
        </>
      )}
    </main>
  );
}

export default EpaperArchive;