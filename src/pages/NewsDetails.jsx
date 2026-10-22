import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getLatestNews,
  getNewsById,
  getRelatedNews,
} from "../services/newsService";

import "../styles/newsDetails.css";

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
  "Health",
];

const NEWS_REFRESH_INTERVAL = 15 * 60 * 1000;

/* ---------------------------------
   CATEGORY HELPERS
---------------------------------- */

function normalizeCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function formatCategoryName(category) {
  if (!category) return "News";

  const decoded = String(category)
    .replace(/-/g, " ")
    .trim();

  const knownCategory = categories.find(
    (item) =>
      item.toLowerCase() === decoded.toLowerCase()
  );

  if (knownCategory) {
    return knownCategory;
  }

  return decoded
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}

/* ---------------------------------
   DATE / TIME HELPERS

   Supports:
   - Firebase Timestamp
   - Timestamp-like seconds object
   - Date
   - string
   - number

   Priority:
   createdAt
   publishedAt
   updatedAt
---------------------------------- */

function timestampToMillis(value) {
  if (!value) {
    return 0;
  }

  if (
    typeof value === "object" &&
    typeof value.toMillis === "function"
  ) {
    const millis = value.toMillis();

    return Number.isFinite(millis)
      ? millis
      : 0;
  }

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    if (
      date instanceof Date &&
      !Number.isNaN(date.getTime())
    ) {
      return date.getTime();
    }
  }

  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    const nanoseconds =
      typeof value.nanoseconds === "number"
        ? value.nanoseconds / 1000000
        : 0;

    return (
      value.seconds * 1000 +
      nanoseconds
    );
  }

  if (value instanceof Date) {
    const millis = value.getTime();

    return Number.isFinite(millis)
      ? millis
      : 0;
  }

  if (typeof value === "number") {
    /*
      Handle both Unix seconds and milliseconds.
    */
    if (
      value > 0 &&
      value < 100000000000
    ) {
      return value * 1000;
    }

    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }

    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      if (
        numericValue > 0 &&
        numericValue < 100000000000
      ) {
        return numericValue * 1000;
      }

      return numericValue;
    }
  }

  return 0;
}

function getNewsTime(news) {
  const createdAt = timestampToMillis(
    news?.createdAt
  );

  if (createdAt) {
    return createdAt;
  }

  const publishedAt = timestampToMillis(
    news?.publishedAt
  );

  if (publishedAt) {
    return publishedAt;
  }

  const updatedAt = timestampToMillis(
    news?.updatedAt
  );

  if (updatedAt) {
    return updatedAt;
  }

  return 0;
}

function formatNewsDate(news) {
  const timestamp = getNewsTime(news);

  if (!timestamp) {
    return "Recently";
  }

  return new Date(timestamp).toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

/* ---------------------------------
   TEXT HELPERS
---------------------------------- */

function cleanHtmlText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getExcerpt(news) {
  const text =
    news?.excerpt ||
    news?.description ||
    news?.content ||
    "";

  return cleanHtmlText(text);
}

function getArticleContent(news) {
  const content =
    news?.content ||
    news?.description ||
    news?.excerpt ||
    "No detailed content is available for this news story.";

  return String(content)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function getSource(news) {
  const source =
    typeof news?.source === "string"
      ? news.source.trim()
      : "";

  if (source) {
    return source;
  }

  const author =
    typeof news?.author === "string"
      ? news.author.trim()
      : "";

  if (author) {
    return author;
  }

  const publisher =
    typeof news?.publisher === "string"
      ? news.publisher.trim()
      : "";

  if (publisher) {
    return publisher;
  }

  return "Democratic News";
}

function getImage(news) {
  const possibleImages = [
    news?.image,
    news?.imageUrl,
    news?.thumbnail,
    news?.thumbnailUrl,
  ];

  const validImage = possibleImages.find(
    (image) =>
      typeof image === "string" &&
      image.trim()
  );

  return validImage
    ? validImage.trim()
    : "";
}

/* ---------------------------------
   IMAGE
---------------------------------- */

function NewsImage({
  news,
  className = "",
  alt = "Democratic News",
}) {
  const [failed, setFailed] = useState(false);

  const image = getImage(news);

  if (!image || failed) {
    return (
      <div
        className={`news-details-image-fallback ${className}`}
      >
        <div className="news-details-fallback-logo">
          <span>DN</span>
        </div>

        <strong>DEMOCRATIC NEWS</strong>

        <small>
          {formatCategoryName(
            news?.category || "News"
          )}
        </small>
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/* ---------------------------------
   SHARE
---------------------------------- */

function ShareButtons({ title }) {
  const currentUrl =
    typeof window !== "undefined"
      ? window.location.href
      : "";

  const encodedUrl =
    encodeURIComponent(currentUrl);

  const encodedTitle = encodeURIComponent(
    title || "Democratic News"
  );

  const shareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        currentUrl
      );

      alert("News link copied.");
    } catch (error) {
      console.error(
        "Copy failed:",
        error
      );

      alert("Unable to copy link.");
    }
  };

  return (
    <div className="news-details-share">
      <span>Share</span>

      <button
        type="button"
        onClick={shareFacebook}
        className="share-facebook"
        aria-label="Share on Facebook"
      >
        f
      </button>

      <button
        type="button"
        onClick={shareX}
        className="share-x"
        aria-label="Share on X"
      >
        X
      </button>

      <button
        type="button"
        onClick={shareWhatsApp}
        className="share-whatsapp"
        aria-label="Share on WhatsApp"
      >
        W
      </button>

      <button
        type="button"
        onClick={copyLink}
        className="share-copy"
        aria-label="Copy news link"
      >
        🔗
      </button>
    </div>
  );
}

/* ---------------------------------
   RELATED CARD
---------------------------------- */

function RelatedNewsCard({ news }) {
  return (
    <article className="news-details-related-card">

      <Link
        to={`/news/${news.id}`}
        className="news-details-related-image"
      >
        <NewsImage
          news={news}
          alt={
            news.title ||
            "News"
          }
        />
      </Link>

      <div className="news-details-related-content">

        <span className="news-details-category-label">
          {formatCategoryName(
            news.category
          )}
        </span>

        <Link
          to={`/news/${news.id}`}
        >
          <h3>
            {news.title ||
              "Untitled News"}
          </h3>
        </Link>

        <div className="news-details-related-date">
          {formatNewsDate(news)}
        </div>

      </div>

    </article>
  );
}

/* ---------------------------------
   NEWS DETAILS
---------------------------------- */

function NewsDetails() {
  const { id } = useParams();

  const [news, setNews] =
    useState(null);

  /*
    IMPORTANT:
    allNews is removed.

    We now keep only:
    - relatedNews
    - latestNews
  */

  const [relatedNews, setRelatedNews] =
    useState([]);

  const [latestNews, setLatestNews] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ---------------------------------
     LOAD ARTICLE
  ---------------------------------- */

  async function loadNews() {
    if (!id) {
      setNews(null);
      setRelatedNews([]);
      setLatestNews([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      /*
        IMPORTANT:

        1. Requested article = one document
        2. Latest = limited query
      */

      const [article, latest] =
        await Promise.all([
          getNewsById(id),
          getLatestNews(8),
        ]);

      if (!article) {
        setNews(null);
        setRelatedNews([]);
        setLatestNews([]);

        setError(
          "News article not found."
        );

        return;
      }

      setNews(article);

      /*
        Related news uses only the
        current article's category.
      */

      let related = [];

      if (article.category) {
        related =
          await getRelatedNews(
            article.category,
            article.id,
            4
          );
      }

      setRelatedNews(
        Array.isArray(related)
          ? related
          : []
      );

      /*
        Remove current article from
        top stories.
      */

      const topStories =
        Array.isArray(latest)
          ? latest
              .filter(
                (item) =>
                  item.id !== article.id
              )
              .slice(0, 5)
          : [];

      setLatestNews(topStories);
    } catch (err) {
      console.error(
        "Error loading news:",
        err
      );

      setError(
        "News load nahi ho paayi. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------
     INITIAL LOAD + ARTICLE CHANGE
     + 15 MIN AUTO REFRESH
  ---------------------------------- */

  useEffect(() => {
    /*
      Clear old article immediately
      when URL changes so old article
      doesn't briefly appear.
    */

    setNews(null);
    setRelatedNews([]);
    setLatestNews([]);
    setError("");

    loadNews();

    const refreshTimer =
      window.setInterval(() => {
        loadNews();
      }, NEWS_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(
        refreshTimer
      );
    };
  }, [id]);

  /* ---------------------------------
     CATEGORY
  ---------------------------------- */

  const categoryName =
    formatCategoryName(
      news?.category
    );

  /* ---------------------------------
     LOADING
  ---------------------------------- */

  if (loading) {
    return (
      <div className="news-details-page">

        <div className="news-details-loading">

          <div className="news-details-spinner" />

          <h2>
            Loading News...
          </h2>

          <p>
            Please wait while we load the full story.
          </p>

        </div>

      </div>
    );
  }

  /* ---------------------------------
     ERROR
  ---------------------------------- */

  if (error) {
    return (
      <div className="news-details-page">

        <div className="news-details-message">

          <div className="news-details-message-icon">
            ⚠️
          </div>

          <h1>
            Unable to Load News
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={loadNews}
          >
            Try Again
          </button>

        </div>

      </div>
    );
  }

  /* ---------------------------------
     NOT FOUND
  ---------------------------------- */

  if (!news) {
    return (
      <div className="news-details-page">

        <div className="news-details-message">

          <div className="news-details-message-icon">
            📰
          </div>

          <h1>
            News Not Found
          </h1>

          <p>
            The news article you are looking for is
            unavailable or may have been removed.
          </p>

          <Link to="/latest">
            Go to Latest News →
          </Link>

        </div>

      </div>
    );
  }

  /* ---------------------------------
     ARTICLE CONTENT
  ---------------------------------- */

  const content =
    getArticleContent(news);

  const contentParagraphs =
    content
      .split(/\n+/)
      .map((paragraph) =>
        paragraph.trim()
      )
      .filter(Boolean);

  /* ---------------------------------
     PAGE
  ---------------------------------- */

  return (
    <div className="news-details-page">

      {/* =================================
          TRENDING BAR
      ================================== */}

      <div className="news-details-topbar">

        <div className="news-details-container news-details-topbar-inner">

          <div>

            <strong>
              Trending:
            </strong>

            <span>
              Latest updates from Hyderabad, Telangana,
              India and around the world
            </span>

          </div>

          <div className="news-details-top-date">

            {new Date().toLocaleDateString(
              "en-IN",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            )}

          </div>

        </div>

      </div>

      {/* =================================
          HEADER
      ================================== */}

      <header className="news-details-header">

        <div className="news-details-container news-details-header-inner">

          <Link
            to="/"
            className="news-details-brand"
          >

            <div className="news-details-logo-box">

              <img
                src="/logo.png"
                alt="Democratic News"
              />

            </div>

            <div>

              <div className="news-details-brand-name">
                DEMOCRATIC NEWS
              </div>

              <div className="news-details-brand-tagline">
                India • Telangana • Hyderabad • World
              </div>

            </div>

          </Link>

          <div className="news-details-header-actions">

            <Link
              to="/search"
              className="news-details-search-button"
            >
              Search
            </Link>

            <Link
              to="/epaper"
              className="news-details-epaper-button"
            >
              E-Paper
            </Link>

          </div>

        </div>

      </header>

      {/* =================================
          NAVIGATION
      ================================== */}

      <nav className="news-details-nav">

        <div className="news-details-container news-details-nav-inner">

          <Link to="/">
            Home
          </Link>

          <Link to="/latest">
            Latest
          </Link>

          {categories.map(
            (item) => {

              const path =
                normalizeCategory(
                  item
                );

              const active =
                normalizeCategory(
                  news.category
                ) === path;

              return (
                <Link
                  key={item}
                  to={`/category/${path}`}
                  className={
                    active
                      ? "active"
                      : ""
                  }
                >
                  {item}
                </Link>
              );
            }
          )}

        </div>

      </nav>

      {/* =================================
          BREAKING BAR
      ================================== */}

      <div className="news-details-breaking">

        <div className="news-details-container news-details-breaking-inner">

          <span className="news-details-breaking-label">
            BREAKING NEWS
          </span>

          <span className="news-details-breaking-text">
            Latest developments and important updates
            from Democratic News
          </span>

        </div>

      </div>

      {/* =================================
          MAIN
      ================================== */}

      <main className="news-details-container news-details-main">

        {/* BREADCRUMB */}

        <div className="news-details-breadcrumb">

          <Link to="/">
            Home
          </Link>

          <span>
            ›
          </span>

          <Link
            to={`/category/${normalizeCategory(
              news.category
            )}`}
          >
            {categoryName}
          </Link>

          <span>
            ›
          </span>

          <span>
            Article
          </span>

        </div>

        <div className="news-details-layout">

          {/* =================================
              ARTICLE
          ================================== */}

          <article className="news-details-article">

            <div className="news-details-article-category">
              {categoryName}
            </div>

            <h1 className="news-details-title">
              {news.title ||
                "Untitled News"}
            </h1>

            <div className="news-details-meta">

              <span>
                {formatNewsDate(news)}
              </span>

              <span className="meta-divider">
                •
              </span>

              <span>
                {getSource(news)}
              </span>

              {news.author &&
                news.author !==
                  getSource(news) && (
                  <>
                    <span className="meta-divider">
                      •
                    </span>

                    <span>
                      By {news.author}
                    </span>
                  </>
                )}

            </div>

            <ShareButtons
              title={news.title}
            />

            <div className="news-details-hero-image">

              <NewsImage
                news={news}
                alt={
                  news.title ||
                  "Democratic News"
                }
              />

            </div>

            {getExcerpt(news) && (
              <div className="news-details-excerpt">
                {getExcerpt(news)}
              </div>
            )}

            <div className="news-details-content">

              {contentParagraphs.map(
                (
                  paragraph,
                  index
                ) => (
                  <p key={index}>
                    {paragraph}
                  </p>
                )
              )}

            </div>

            <ShareButtons
              title={news.title}
            />

            {/* RELATED */}

            {relatedNews.length >
              0 && (
              <section className="news-details-related-section">

                <div className="news-details-section-heading">

                  <div>

                    <span>
                      MORE FROM
                    </span>

                    <h2>
                      {categoryName}
                    </h2>

                  </div>

                  <Link
                    to={`/category/${normalizeCategory(
                      news.category
                    )}`}
                  >
                    View All →
                  </Link>

                </div>

                <div className="news-details-related-grid">

                  {relatedNews.map(
                    (item) => (
                      <RelatedNewsCard
                        key={item.id}
                        news={item}
                      />
                    )
                  )}

                </div>

              </section>
            )}

          </article>

          {/* =================================
              SIDEBAR
          ================================== */}

          <aside className="news-details-sidebar">

            {/* TOP STORIES */}

            <section className="news-details-sidebar-box">

              <div className="news-details-sidebar-heading">

                <h2>
                  Top Stories
                </h2>

                <Link to="/latest">
                  View All
                </Link>

              </div>

              <div className="news-details-top-stories">

                {latestNews.map(
                  (
                    item,
                    index
                  ) => (
                    <article
                      key={item.id}
                      className="news-details-top-story"
                    >

                      <Link
                        to={`/news/${item.id}`}
                        className="news-details-top-story-image"
                      >

                        <NewsImage
                          news={item}
                          alt={
                            item.title ||
                            "News"
                          }
                        />

                      </Link>

                      <div>

                        <span className="news-details-story-number">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <Link
                          to={`/news/${item.id}`}
                        >
                          <h3>
                            {item.title ||
                              "Untitled News"}
                          </h3>
                        </Link>

                        <small>
                          {formatNewsDate(
                            item
                          )}
                        </small>

                      </div>

                    </article>
                  )
                )}

              </div>

            </section>

            {/* CATEGORIES */}

            <section className="news-details-sidebar-box">

              <div className="news-details-sidebar-heading">

                <h2>
                  Categories
                </h2>

              </div>

              <div className="news-details-sidebar-categories">

                {categories.map(
                  (item) => (
                    <Link
                      key={item}
                      to={`/category/${normalizeCategory(
                        item
                      )}`}
                    >

                      <span>
                        {item}
                      </span>

                      <span>
                        →
                      </span>

                    </Link>
                  )
                )}

              </div>

            </section>

            {/* ABOUT */}

            <section className="news-details-sidebar-about">

              <span>
                DEMOCRATIC NEWS
              </span>

              <h2>
                Independent News.
                <br />
                Trusted Information.
              </h2>

              <p>
                Democratic News brings you news and
                information from Hyderabad, Telangana,
                India and the world.
              </p>

              <Link to="/about">
                About Us →
              </Link>

            </section>

          </aside>

        </div>

      </main>

      {/* =================================
          FOOTER
      ================================== */}

      <footer className="news-details-footer">

        <div className="news-details-container news-details-footer-grid">

          <div>

            <div className="news-details-footer-logo">
              DEMOCRATIC NEWS
            </div>

            <p>
              Independent news and information from
              Hyderabad, Telangana, India and the world.
            </p>

          </div>

          <div>

            <h3>
              Categories
            </h3>

            {categories
              .slice(0, 6)
              .map(
                (item) => (
                  <Link
                    key={item}
                    to={`/category/${normalizeCategory(
                      item
                    )}`}
                  >
                    {item}
                  </Link>
                )
              )}

          </div>

          <div>

            <h3>
              Quick Links
            </h3>

            <Link to="/">
              Home
            </Link>

            <Link to="/latest">
              Latest News
            </Link>

            <Link to="/search">
              Search
            </Link>

            <Link to="/epaper">
              E-Paper
            </Link>

            <Link to="/about">
              About Us
            </Link>

            <Link to="/contact">
              Contact
            </Link>

          </div>

        </div>

        <div className="news-details-footer-bottom">
          © 2026 Democratic News. All rights reserved.
        </div>

      </footer>

    </div>
  );
}

export default NewsDetails;