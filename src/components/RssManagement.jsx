import { useEffect, useState } from "react";

import {
  getAllRssFeeds,
  addRssFeed,
  updateRssFeed,
  deleteRssFeed,
} from "../services/rssService";

const WORKER_URL =
  import.meta.env.VITE_RSS_WORKER_URL ||
  "https://democratic-news-rss.mgtechdigital14.workers.dev/";

const categories = [
  "Hyderabad",
  "Telangana",
  "India",
  "World",
  "Middle East",
  "Business",
  "Education",
  "Sports",
  "Technology",
  "Entertainment",
  "Health",
];

const defaultFeeds = [
  {
    name: "BBC World",
    category: "World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
  {
    name: "BBC India",
    category: "India",
    url: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml",
  },
  {
    name: "BBC Business",
    category: "Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
  },
  {
    name: "BBC Technology",
    category: "Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
  },
  {
    name: "BBC Education",
    category: "Education",
    url: "https://feeds.bbci.co.uk/news/education/rss.xml",
  },
];

const emptyForm = {
  name: "",
  category: "World",
  url: "",
  enabled: true,
};

function RssManagement() {
  const [feeds, setFeeds] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedFeedIds, setSelectedFeedIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    loadFeeds();
  }, []);

  async function loadFeeds() {
    try {
      setLoading(true);
      setError("");

      const data = await getAllRssFeeds();
      setFeeds(data);
    } catch (err) {
      console.error("RSS feeds loading failed:", err);

      setError(
        "RSS feeds load nahi ho paayi. Firestore rules mein rss_feeds ke liye admin access check karein."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function validateUrl(value) {
    try {
      const url = new URL(value);

      return (
        url.protocol === "http:" ||
        url.protocol === "https:"
      );
    } catch {
      return false;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const url = form.url.trim();

    if (!name) {
      setError("RSS feed name required hai.");
      return;
    }

    if (!url || !validateUrl(url)) {
      setError("Please ek valid http/https RSS URL enter karein.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const data = {
        name,
        category: form.category,
        url,
        enabled: Boolean(form.enabled),
      };

      if (editingId) {
        await updateRssFeed(editingId, data);
        setMessage("RSS feed successfully updated.");
      } else {
        await addRssFeed(data);
        setMessage("RSS feed successfully added.");
      }

      resetForm();
      await loadFeeds();
    } catch (err) {
      console.error("RSS feed save failed:", err);
      setError(err.message || "RSS feed save nahi ho paayi.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(feed) {
    setEditingId(feed.id);

    setForm({
      name: feed.name || "",
      category: feed.category || "World",
      url: feed.url || "",
      enabled: feed.enabled !== false,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: Math.max(
        document.querySelector("#rss-management")?.offsetTop - 20 || 0,
        0
      ),
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleFeedSelection(id) {
    setSelectedFeedIds((previous) =>
      previous.includes(id)
        ? previous.filter((feedId) => feedId !== id)
        : [...previous, id]
    );
  }

  function toggleSelectAllFeeds() {
    if (selectedFeedIds.length === feeds.length) {
      setSelectedFeedIds([]);
      return;
    }

    setSelectedFeedIds(feeds.map((feed) => feed.id));
  }

  async function handleDelete(feed) {
    const confirmed = window.confirm(
      `Delete RSS feed "${feed.name || "this feed"}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await deleteRssFeed(feed.id);

      setSelectedFeedIds((previous) =>
        previous.filter((feedId) => feedId !== feed.id)
      );

      if (editingId === feed.id) {
        resetForm();
      }

      setFeeds((previous) =>
        previous.filter((item) => item.id !== feed.id)
      );

      setMessage("RSS feed deleted successfully.");
    } catch (err) {
      console.error("RSS feed delete failed:", err);
      setError("RSS feed delete nahi ho paayi.");
    }
  }

  async function handleDeleteSelected() {
    if (selectedFeedIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedFeedIds.length} selected RSS feed(s)?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      setSaving(true);

      await Promise.all(
        selectedFeedIds.map((id) => deleteRssFeed(id))
      );

      setFeeds((previous) =>
        previous.filter((feed) => !selectedFeedIds.includes(feed.id))
      );
      setSelectedFeedIds([]);

      if (selectedFeedIds.includes(editingId)) {
        resetForm();
      }

      setMessage(
        `${selectedFeedIds.length} RSS feed(s) deleted successfully.`
      );
    } catch (err) {
      console.error("Bulk RSS delete failed:", err);
      setError("Selected RSS feeds delete nahi ho paayi.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFeed(feed) {
    try {
      setError("");
      setMessage("");

      const newStatus = feed.enabled === false;

      await updateRssFeed(feed.id, {
        enabled: newStatus,
      });

      setFeeds((previous) =>
        previous.map((item) =>
          item.id === feed.id
            ? {
                ...item,
                enabled: newStatus,
              }
            : item
        )
      );

      setMessage(
        newStatus
          ? "RSS feed enabled."
          : "RSS feed disabled."
      );
    } catch (err) {
      console.error("RSS feed toggle failed:", err);
      setError("RSS feed status update nahi ho paaya.");
    }
  }

  async function seedDefaultFeeds() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const existing = new Set(
        feeds.map((feed) =>
          String(feed.url || "").trim()
        )
      );

      let added = 0;

      for (const feed of defaultFeeds) {
        if (existing.has(feed.url)) continue;

        await addRssFeed({
          ...feed,
          enabled: true,
        });

        added += 1;
      }

      await loadFeeds();

      setMessage(
        added > 0
          ? `${added} default RSS feed${
              added === 1 ? "" : "s"
            } added.`
          : "Default RSS feeds already exist."
      );
    } catch (err) {
      console.error("Default RSS seed failed:", err);
      setError(
        err.message ||
          "Default RSS feeds add nahi ho paaye."
      );
    } finally {
      setSaving(false);
    }
  }

  async function importNow() {
    try {
      setImporting(true);
      setError("");
      setMessage("");
      setImportResult(null);

      const response = await fetch(WORKER_URL, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `RSS Worker failed with status ${response.status}.`
        );
      }

      if (!data || data.success !== true) {
        throw new Error(
          data?.error ||
            "RSS import Worker ne successful response nahi diya."
        );
      }

      setImportResult(data);

      setMessage(
        data.newArticles > 0
          ? `${data.newArticles} new article${
              data.newArticles === 1 ? "" : "s"
            } imported successfully.`
          : "Import complete. Koi new article nahi mila."
      );
    } catch (err) {
      console.error("RSS import failed:", err);

      setError(
        err.message ||
          "RSS Import start nahi ho paaya."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <section
      id="rss-management"
      style={{
        background: "#fff",
        borderRadius: "14px",
        padding: "28px",
        boxShadow:
          "0 5px 20px rgba(15, 23, 42, 0.07)",
        marginBottom: "40px",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "18px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "800",
              color: "#D4A72C",
              letterSpacing: "1.5px",
              marginBottom: "7px",
            }}
          >
            AUTOMATIC NEWS
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              color: "#0b1f33",
            }}
          >
            RSS Management
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: "#687789",
              lineHeight: 1.5,
            }}
          >
            Manage news sources that the Cloudflare RSS
            Worker imports into Firestore.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {feeds.length > 0 && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "700",
                color: "#0b1f33",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={
                  feeds.length > 0 &&
                  selectedFeedIds.length === feeds.length
                }
                onChange={toggleSelectAllFeeds}
              />
              Select all
            </label>
          )}

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedFeedIds.length === 0 || saving}
            style={{
              ...secondaryButtonStyle,
              background:
                selectedFeedIds.length === 0 ? "#e9edf2" : "#b42318",
              color:
                selectedFeedIds.length === 0 ? "#7b8794" : "#fff",
              border:
                selectedFeedIds.length === 0
                  ? "1px solid #dfe6ee"
                  : "none",
              cursor:
                selectedFeedIds.length === 0 || saving
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Delete Selected ({selectedFeedIds.length})
          </button>

          <button
            type="button"
            onClick={seedDefaultFeeds}
            disabled={saving || importing}
            style={secondaryButtonStyle}
          >
            {saving
              ? "Working..."
              : "Add Default Feeds"}
          </button>

          <button
            type="button"
            onClick={importNow}
            disabled={importing || saving}
            style={{
              ...primaryButtonStyle,
              opacity: importing ? 0.7 : 1,
            }}
          >
            {importing
              ? "Importing..."
              : "Import Now"}
          </button>

          <button
            type="button"
            onClick={loadFeeds}
            disabled={loading || importing}
            style={secondaryButtonStyle}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {message && (
        <div
          style={{
            background: "#ecfdf3",
            color: "#067647",
            padding: "13px 15px",
            borderRadius: "8px",
            marginBottom: "18px",
          }}
        >
          {message}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div
          style={{
            background: "#fff1f0",
            color: "#b42318",
            padding: "13px 15px",
            borderRadius: "8px",
            marginBottom: "18px",
          }}
        >
          {error}
        </div>
      )}

      {/* IMPORT RESULT */}
      {importResult && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "18px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "800",
              color: "#0b1f33",
              marginBottom: "14px",
            }}
          >
            RSS Import Result
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "10px",
            }}
          >
            <ResultBox
              label="Feeds Configured"
              value={importResult.feedsConfigured ?? 0}
            />

            <ResultBox
              label="Feeds Processed"
              value={importResult.feedsProcessed ?? 0}
            />

            <ResultBox
              label="Articles Found"
              value={importResult.articlesFound ?? 0}
            />

            <ResultBox
              label="New Articles"
              value={importResult.newArticles ?? 0}
            />

            <ResultBox
              label="Duplicates"
              value={importResult.duplicatesSkipped ?? 0}
            />

            <ResultBox
              label="Errors"
              value={importResult.errors?.length ?? 0}
            />
          </div>

          {Array.isArray(importResult.errors) &&
            importResult.errors.length > 0 && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "12px",
                  background: "#fff1f0",
                  color: "#b42318",
                  borderRadius: "7px",
                  fontSize: "13px",
                }}
              >
                <strong>Import Errors:</strong>

                <ul
                  style={{
                    margin:
                      "8px 0 0 18px",
                  }}
                >
                  {importResult.errors.map(
                    (item, index) => (
                      <li key={index}>
                        {item.feed || "RSS Feed"}
                        {item.title
                          ? ` — ${item.title}`
                          : ""}
                        {item.error
                          ? `: ${item.error}`
                          : ""}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            alignItems: "end",
          }}
        >
          <div>
            <label style={labelStyle}>
              Feed Name *
            </label>

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="BBC World"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Category *
            </label>

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              style={inputStyle}
            >
              {categories.map((category) => (
                <option key={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              gridColumn: "span 2",
            }}
          >
            <label style={labelStyle}>
              RSS URL *
            </label>

            <input
              name="url"
              value={form.url}
              onChange={handleChange}
              placeholder="https://example.com/rss.xml"
              required
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              minHeight: "46px",
            }}
          >
            <input
              type="checkbox"
              id="rss-enabled"
              name="enabled"
              checked={form.enabled}
              onChange={handleChange}
              style={{
                width: "18px",
                height: "18px",
              }}
            />

            <label
              htmlFor="rss-enabled"
              style={{
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Enabled
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: "9px",
              flexWrap: "wrap",
              minHeight: "46px",
              alignItems: "center",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={primaryButtonStyle}
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Feed"
                : "Add Feed"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div
        style={{
          height: "1px",
          background: "#e7ebef",
          margin: "28px 0 20px",
        }}
      />

      {/* FEEDS */}
      {loading ? (
        <div
          style={{
            padding: "30px",
            textAlign: "center",
            color: "#687789",
          }}
        >
          Loading RSS feeds...
        </div>
      ) : feeds.length === 0 ? (
        <div
          style={{
            padding: "30px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: "10px",
            color: "#687789",
          }}
        >
          No RSS feeds configured yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "12px",
          }}
        >
          {feeds.map((feed) => (
            <article
              key={feed.id}
              style={{
                border: "1px solid #e3e7ec",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                gap: "15px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "24px",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedFeedIds.includes(feed.id)}
                  onChange={() => toggleFeedSelection(feed.id)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                  }}
                />
              </label>

              <div
                style={{
                  minWidth: 0,
                  flex: "1 1 420px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginBottom: "5px",
                  }}
                >
                  <strong
                    style={{
                      color: "#0b1f33",
                    }}
                  >
                    {feed.name || "Unnamed Feed"}
                  </strong>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "4px 7px",
                      borderRadius: "4px",
                      background:
                        feed.enabled === false
                          ? "#eef1f4"
                          : "#ecfdf3",
                      color:
                        feed.enabled === false
                          ? "#687789"
                          : "#067647",
                    }}
                  >
                    {feed.enabled === false
                      ? "DISABLED"
                      : "ENABLED"}
                  </span>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "4px 7px",
                      borderRadius: "4px",
                      background: "#fff8df",
                      color: "#8a6800",
                    }}
                  >
                    {feed.category || "World"}
                  </span>
                </div>

                <div
                  style={{
                    color: "#687789",
                    fontSize: "13px",
                    wordBreak: "break-all",
                  }}
                >
                  {feed.url}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFeed(feed)}
                  style={smallButtonStyle}
                >
                  {feed.enabled === false
                    ? "Enable"
                    : "Disable"}
                </button>

                <button
                  type="button"
                  onClick={() => startEdit(feed)}
                  style={smallButtonStyle}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(feed)}
                  style={{
                    ...smallButtonStyle,
                    border: "none",
                    background: "#b42318",
                    color: "#fff",
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* INFO */}
      <div
        style={{
          marginTop: "18px",
          padding: "12px 14px",
          background: "#f8fafc",
          borderRadius: "8px",
          color: "#687789",
          fontSize: "12px",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "#0b1f33" }}>
          Automatic Import:
        </strong>{" "}
        Cloudflare Worker automatically processes enabled
        RSS feeds every 15 minutes. Duplicate articles are
        skipped automatically.
      </div>
    </section>
  );
}

function ResultBox({ label, value }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "12px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#687789",
          fontWeight: "700",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "22px",
          fontWeight: "800",
          color: "#0b1f33",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontWeight: "700",
  color: "#0b1f33",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid #d6dce3",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  background: "#fff",
};

const primaryButtonStyle = {
  border: "none",
  background: "#0b1f33",
  color: "#fff",
  padding: "11px 16px",
  borderRadius: "7px",
  fontWeight: "800",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "1px solid #ccd3dc",
  background: "#fff",
  color: "#0b1f33",
  padding: "10px 15px",
  borderRadius: "7px",
  fontWeight: "700",
  cursor: "pointer",
};

const smallButtonStyle = {
  border: "1px solid #ccd3dc",
  background: "#fff",
  color: "#0b1f33",
  padding: "8px 12px",
  borderRadius: "6px",
  fontWeight: "700",
  cursor: "pointer",
};

export default RssManagement;