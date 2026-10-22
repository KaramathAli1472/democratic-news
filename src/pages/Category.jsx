import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getDocs,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";

import { db } from "../firebase";
import "../styles/category.css";

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

const CATEGORY_REFRESH_INTERVAL = 15 * 60 * 1000;
const CATEGORY_NEWS_LIMIT = 50;

function normalizeCategory(value) {
  try {
    return decodeURIComponent(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  } catch {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }
}

function formatCategoryName(category) {
  if (!category) return "News";

  let decoded = "";

  try {
    decoded = decodeURIComponent(category)
      .trim()
      .replace(/\s+/g, " ");
  } catch {
    decoded = String(category)
      .trim()
      .replace(/\s+/g, " ");
  }

  const knownCategory = categories.find(
    (item) => item.toLowerCase() === decoded.toLowerCase()
  );

  if (knownCategory) {
    return knownCategory;
  }

  return decoded
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

/* =========================================================
   DATE / TIME HELPERS
   Supports:
   - Firebase Timestamp
   - Timestamp-like seconds object
   - Date
   - string
   - number
   - createdAt
   - publishedAt
   - updatedAt
========================================================= */

function timestampToMillis(value) {
  if (!value) {
    return 0;
  }

  if (
    typeof value === "object" &&
    typeof value.toMillis === "function"
  ) {
    const millis = value.toMillis();

    return Number.isFinite(millis) ? millis : 0;
  }

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    const nanos =
      typeof value.nanoseconds === "number"
        ? value.nanoseconds / 1000000
        : 0;

    return value.seconds * 1000 + nanos;
  }

  if (value instanceof Date) {
    const millis = value.getTime();

    return Number.isFinite(millis) ? millis : 0;
  }

  if (typeof value === "number") {
    /*
      Some systems store Unix timestamp in seconds,
      while others store milliseconds.
    */
    if (value > 0 && value < 100000000000) {
      return value * 1000;
    }

    return Number.isFinite(value) ? value : 0;
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
  const createdAt = timestampToMillis(news?.createdAt);

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

function formatNewsTime(news) {
  const timestamp = getNewsTime(news);

  if (!timestamp) {
    return "Recently";
  }

  return new Date(timestamp).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(news) {
  const timestamp = getNewsTime(news);

  if (!timestamp) {
    return "Recently";
  }

  return new Date(timestamp).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   IMAGE HELPERS
========================================================= */

function getImage(news) {
  if (
    typeof news?.image === "string" &&
    news.image.trim()
  ) {
    return news.image.trim();
  }

  if (
    typeof news?.imageUrl === "string" &&
    news.imageUrl.trim()
  ) {
    return news.imageUrl.trim();
  }

  return "";
}

/* =========================================================
   TEXT HELPERS
========================================================= */

function getExcerpt(news, length = 180) {
  const text =
    news?.excerpt ||
    news?.description ||
    news?.content ||
    "Read the latest updates and important developments from Democratic News.";

  const cleanText = String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanText.length <= length) {
    return cleanText;
  }

  return `${cleanText.slice(0, length).trim()}...`;
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

  return "Democratic News";
}

/* =========================================================
   NEWS IMAGE
========================================================= */

function NewsImage({
  news,
  size = "large",
}) {
  const [imageError, setImageError] = useState(false);

  const image = getImage(news);
  const category = news?.category || "News";

  return (
    <div
      className={`category-news-image category-news-image-${size}`}
    >
      {image && !imageError ? (
        <img
          src={image}
          alt={news?.title || "Democratic News"}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="category-image-fallback">
          <span>DEMOCRATIC</span>
          <strong>NEWS</strong>
          <small>
            {category.toUpperCase()}
          </small>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  children,
  link = "/latest",
}) {
  return (
    <div className="category-section-heading">
      <div className="category-section-heading-left">
        <span />
        <h2>{children}</h2>
      </div>

      <Link
        to={link}
        className="category-view-all"
      >
        View All →
      </Link>
    </div>
  );
}

/* =========================================================
   CATEGORY PAGE
========================================================= */

function Category() {
  const { category } = useParams();

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categoryName = formatCategoryName(category);
  const requestedCategory = normalizeCategory(category);

  /* =======================================================
     LOAD CATEGORY NEWS
  ======================================================= */

  async function loadCategoryNews() {
    try {
      setLoading(true);
      setError("");

      /*
        We use the canonical category name for Firestore.

        Example:
        /category/middle%20east
        becomes:
        Middle East
      */
      const firestoreCategory = categoryName;

      const newsQuery = query(
        collection(db, "news"),
        where("category", "==", firestoreCategory),
        limit(CATEGORY_NEWS_LIMIT)
      );

      const snapshot = await getDocs(newsQuery);

      const categoryNews = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((item) => {
          /*
            Extra client-side check keeps the page safe
            if category formatting/case differs.
          */
          return (
            normalizeCategory(item?.category) ===
            requestedCategory
          );
        })
        .sort(
          (a, b) =>
            getNewsTime(b) - getNewsTime(a)
        );

      setNews(categoryNews);
    } catch (err) {
      console.error(
        "Error loading category news:",
        err
      );

      setError(
        "News load nahi ho paayi. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     INITIAL LOAD + CATEGORY CHANGE + 15 MIN AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function initialLoad() {
      if (!mounted) return;

      await loadCategoryNews();
    }

    initialLoad();

    const refreshTimer = window.setInterval(() => {
      if (mounted) {
        loadCategoryNews();
      }
    }, CATEGORY_REFRESH_INTERVAL);

    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [category]);

  /* =======================================================
     DERIVED NEWS
  ======================================================= */

  const featuredNews = news[0] || null;

  const secondaryNews = useMemo(() => {
    return news.slice(1, 4);
  }, [news]);

  const remainingNews = useMemo(() => {
    return news.slice(4);
  }, [news]);

  const topStories = useMemo(() => {
    return news.slice(0, 5);
  }, [news]);

  const categoryPath = `/category/${encodeURIComponent(
    categoryName
  )}`;

  return (
    <div className="category-page">

      {/* =========================
          TOP TRENDING BAR
      ========================= */}

      <div className="category-trending">
        <div className="category-container category-trending-inner">

          <div className="category-trending-label">
            TRENDING
          </div>

          <div className="category-trending-text">
            Latest News • Hyderabad • Telangana • India •
            Middle East • World
          </div>

          <Link
            to="/search"
            className="category-trending-search"
          >
            Search News
          </Link>

        </div>
      </div>

      {/* =========================
          HEADER
      ========================= */}

      <header className="category-header">
        <div className="category-container category-header-inner">

          <Link
            to="/"
            className="category-brand"
          >
            <div className="category-logo-box">
              <img
                src="/logo.png"
                alt="Democratic News"
              />
            </div>

            <div>
              <div className="category-brand-name">
                DEMOCRATIC NEWS
              </div>

              <div className="category-brand-tagline">
                India • Telangana • Hyderabad • World
              </div>
            </div>
          </Link>

          <div className="category-header-actions">

            <Link
              to="/search"
              className="category-search-link"
            >
              Search
            </Link>

            <Link
              to="/epaper"
              className="category-epaper-button"
            >
              E-Paper
            </Link>

          </div>

        </div>
      </header>

      {/* =========================
          NAVIGATION
      ========================= */}

      <nav className="category-nav">
        <div className="category-container category-nav-inner">

          <Link
            to="/"
            className="category-home-link"
          >
            HOME
          </Link>

          <Link to="/latest">
            LATEST
          </Link>

          {categories.map((item) => (
            <Link
              key={item}
              to={`/category/${encodeURIComponent(
                item
              )}`}
              className={
                item.toLowerCase() ===
                categoryName.toLowerCase()
                  ? "active"
                  : ""
              }
            >
              {item.toUpperCase()}
            </Link>
          ))}

        </div>
      </nav>

      {/* =========================
          BREAKING NEWS
      ========================= */}

      <div className="category-breaking">
        <div className="category-container category-breaking-inner">

          <span className="category-breaking-label">
            BREAKING NEWS
          </span>

          <div className="category-breaking-scroll">

            {news.length > 0 ? (
              news.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  to={`/news/${item.id}`}
                >
                  {item.title}
                </Link>
              ))
            ) : (
              <span>
                Latest developments from Hyderabad,
                Telangana, India and around the world
              </span>
            )}

          </div>

        </div>
      </div>

      {/* =========================
          MAIN
      ========================= */}

      <main className="category-container category-main">

        {/* PAGE TITLE */}

        <section className="category-page-intro">

          <div>
            <span className="category-kicker">
              DEMOCRATIC NEWS DESK
            </span>

            <h1>{categoryName}</h1>

            <p>
              Latest {categoryName} news,
              important developments and
              updates from Democratic News.
            </p>
          </div>

          <Link
            to="/latest"
            className="category-all-news"
          >
            View Latest News →
          </Link>

        </section>

        {/* =========================
            LOADING
        ========================= */}

        {loading && (
          <section className="category-loading-grid">

            {Array.from({ length: 6 }).map(
              (_, index) => (
                <div
                  className="category-skeleton-card"
                  key={index}
                >
                  <div className="category-skeleton-image" />

                  <div className="category-skeleton-content">
                    <div className="category-skeleton-line small" />
                    <div className="category-skeleton-line" />
                    <div className="category-skeleton-line" />
                    <div className="category-skeleton-line short" />
                  </div>
                </div>
              )
            )}

          </section>
        )}

        {/* =========================
            ERROR
        ========================= */}

        {!loading && error && (
          <section className="category-status">

            <div className="category-status-icon error">
              !
            </div>

            <h2>
              Unable to Load News
            </h2>

            <p>{error}</p>

            <button
              type="button"
              onClick={loadCategoryNews}
              className="category-retry"
            >
              Try Again
            </button>

          </section>
        )}

        {/* =========================
            NO NEWS
        ========================= */}

        {!loading &&
          !error &&
          news.length === 0 && (
            <section className="category-status">

              <div className="category-status-icon">
                N
              </div>

              <h2>
                No {categoryName} News Found
              </h2>

              <p>
                There are currently no news
                stories available for this
                category.
              </p>

              <Link
                to="/latest"
                className="category-retry"
              >
                Go to Latest News
              </Link>

            </section>
          )}

        {/* =========================
            NEWS CONTENT
        ========================= */}

        {!loading &&
          !error &&
          news.length > 0 && (
            <>

              {/* FEATURED STORY */}

              {featuredNews && (
                <section className="category-featured">

                  <Link
                    to={`/news/${featuredNews.id}`}
                    className="category-featured-image"
                  >
                    <NewsImage
                      news={featuredNews}
                      size="featured"
                    />

                    {featuredNews.breaking && (
                      <span className="category-breaking-badge">
                        BREAKING
                      </span>
                    )}
                  </Link>

                  <div className="category-featured-content">

                    <div className="category-meta-row">

                      <span className="category-label">
                        {featuredNews.category ||
                          categoryName}
                      </span>

                      <span className="category-date">
                        {formatNewsTime(
                          featuredNews
                        )}
                      </span>

                    </div>

                    <Link
                      to={`/news/${featuredNews.id}`}
                    >
                      <h2>
                        {featuredNews.title ||
                          "Untitled News"}
                      </h2>
                    </Link>

                    <p>
                      {getExcerpt(
                        featuredNews,
                        250
                      )}
                    </p>

                    <div className="category-featured-footer">

                      <span>
                        By{" "}
                        {getSource(
                          featuredNews
                        )}
                      </span>

                      <Link
                        to={`/news/${featuredNews.id}`}
                      >
                        Read Full Story →
                      </Link>

                    </div>

                  </div>

                </section>
              )}

              {/* =========================
                  SECONDARY STORIES
              ========================= */}

              {secondaryNews.length > 0 && (
                <section className="category-secondary-section">

                  <SectionHeading
                    link={categoryPath}
                  >
                    More {categoryName} News
                  </SectionHeading>

                  <div className="category-secondary-grid">

                    {secondaryNews.map(
                      (item) => (
                        <article
                          key={item.id}
                          className="category-secondary-card"
                        >

                          <Link
                            to={`/news/${item.id}`}
                          >
                            <NewsImage
                              news={item}
                              size="secondary"
                            />
                          </Link>

                          <div className="category-secondary-content">

                            <span className="category-small-label">
                              {item.category ||
                                categoryName}
                            </span>

                            <Link
                              to={`/news/${item.id}`}
                            >
                              <h3>
                                {item.title ||
                                  "Untitled News"}
                              </h3>
                            </Link>

                            <time>
                              {formatShortDate(
                                item
                              )}
                            </time>

                          </div>

                        </article>
                      )
                    )}

                  </div>

                </section>
              )}

              {/* =========================
                  MAIN + SIDEBAR
              ========================= */}

              <div className="category-content-layout">

                <section className="category-content-column">

                  <SectionHeading
                    link={categoryPath}
                  >
                    Latest {categoryName} News
                  </SectionHeading>

                  <div className="category-news-list">

                    {remainingNews.length >
                    0 ? (
                      remainingNews.map(
                        (item) => (
                          <article
                            className="category-list-card"
                            key={item.id}
                          >

                            <Link
                              to={`/news/${item.id}`}
                              className="category-list-image"
                            >

                              <NewsImage
                                news={item}
                                size="list"
                              />

                              {item.breaking && (
                                <span className="category-list-breaking">
                                  BREAKING
                                </span>
                              )}

                            </Link>

                            <div className="category-list-content">

                              <div className="category-list-meta">

                                <span className="category-label">
                                  {item.category ||
                                    categoryName}
                                </span>

                                <span>
                                  {formatNewsTime(
                                    item
                                  )}
                                </span>

                              </div>

                              <Link
                                to={`/news/${item.id}`}
                              >
                                <h2>
                                  {item.title ||
                                    "Untitled News"}
                                </h2>
                              </Link>

                              <p>
                                {getExcerpt(
                                  item,
                                  200
                                )}
                              </p>

                              <div className="category-list-footer">

                                <span>
                                  {getSource(
                                    item
                                  )}
                                </span>

                                <Link
                                  to={`/news/${item.id}`}
                                >
                                  Read More →
                                </Link>

                              </div>

                            </div>

                          </article>
                        )
                      )
                    ) : (
                      <div className="category-no-more">

                        <h3>
                          You are all caught up.
                        </h3>

                        <p>
                          These are the latest
                          available{" "}
                          {categoryName} news
                          stories.
                        </p>

                      </div>
                    )}

                  </div>

                </section>

                {/* =========================
                    SIDEBAR
                ========================= */}

                <aside className="category-sidebar">

                  <div className="category-sidebar-widget">

                    <SectionHeading>
                      Top Stories
                    </SectionHeading>

                    <div className="category-top-stories">

                      {topStories.map(
                        (item, index) => (
                          <article
                            className="category-top-story"
                            key={item.id}
                          >

                            <Link
                              to={`/news/${item.id}`}
                            >
                              <NewsImage
                                news={item}
                                size="small"
                              />
                            </Link>

                            <div>

                              <span className="category-story-number">
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

                              <time>
                                {formatShortDate(
                                  item
                                )}
                              </time>

                            </div>

                          </article>
                        )
                      )}

                    </div>

                  </div>

                  {/* CATEGORY NAVIGATION */}

                  <div className="category-sidebar-widget">

                    <SectionHeading>
                      News Categories
                    </SectionHeading>

                    <div className="category-sidebar-links">

                      {categories.map(
                        (item) => (
                          <Link
                            key={item}
                            to={`/category/${encodeURIComponent(
                              item
                            )}`}
                            className={
                              item.toLowerCase() ===
                              categoryName.toLowerCase()
                                ? "active"
                                : ""
                            }
                          >
                            {item}
                          </Link>
                        )
                      )}

                    </div>

                  </div>

                  {/* ABOUT */}

                  <div className="category-about-box">

                    <span>
                      DEMOCRATIC NEWS
                    </span>

                    <h3>
                      Independent news and
                      information for every
                      reader.
                    </h3>

                    <p>
                      Follow the latest
                      developments from
                      Hyderabad, Telangana,
                      India, Middle East and
                      around the world.
                    </p>

                    <Link to="/about">
                      About Democratic News →
                    </Link>

                  </div>

                </aside>

              </div>

            </>
          )}

      </main>

      {/* =========================
          FOOTER
      ========================= */}

      <footer className="category-footer">

        <div className="category-container category-footer-grid">

          <div className="category-footer-brand-box">

            <Link to="/">
              DEMOCRATIC NEWS
            </Link>

            <p>
              India • Telangana • Hyderabad •
              World
            </p>

            <span>
              Truth • Information • Public Voice
            </span>

          </div>

          <div className="category-footer-column">

            <h3>
              Quick Links
            </h3>

            <Link to="/">
              Home
            </Link>

            <Link to="/latest">
              Latest News
            </Link>

            <Link to="/about">
              About
            </Link>

            <Link to="/contact">
              Contact
            </Link>

          </div>

          <div className="category-footer-column">

            <h3>
              Categories
            </h3>

            <Link to="/category/Hyderabad">
              Hyderabad
            </Link>

            <Link to="/category/Telangana">
              Telangana
            </Link>

            <Link to="/category/India">
              India
            </Link>

            <Link to="/category/World">
              World
            </Link>

          </div>

          <div className="category-footer-column">

            <h3>
              More
            </h3>

            <Link to="/category/Middle%20East">
              Middle East
            </Link>

            <Link to="/category/Business">
              Business
            </Link>

            <Link to="/epaper">
              E-Paper
            </Link>

          </div>

        </div>

        <div className="category-footer-bottom">

          <div className="category-container">
            © 2026 Democratic News. All rights reserved.
          </div>

        </div>

      </footer>

    </div>
  );
}

export default Category;