import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getLatestNews } from "../services/newsService";
import "../styles/home.css";

/* =========================================================
   NAVIGATION
========================================================= */

const categories = [
  "Home",
  "Latest",
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

const newsCategories = categories.slice(2);

/* =========================================================
   CONSTANTS
========================================================= */

const HOME_NEWS_LIMIT = 100;
const NEWS_REFRESH_INTERVAL = 15 * 60 * 1000;

/* =========================================================
   HELPERS
========================================================= */

const getCategoryPath = (category) => {
  if (category === "Home") return "/";
  if (category === "Latest") return "/latest";

  return `/category/${encodeURIComponent(category.toLowerCase())}`;
};

const normalizeText = (value) => {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const getTimestampValue = (value) => {
  if (!value) return 0;

  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime())
      ? 0
      : date.getTime();
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const timestamp = new Date(value).getTime();

    return Number.isNaN(timestamp)
      ? 0
      : timestamp;
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  return 0;
};

const getTimestamp = (news) => {
  if (!news) return 0;

  return Math.max(
    getTimestampValue(news.publishedAt),
    getTimestampValue(news.createdAt),
    getTimestampValue(news.updatedAt)
  );
};

const formatDate = (value) => {
  if (!value) return "Recently";

  let date;

  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getExcerpt = (news, length = 150) => {
  const text = normalizeText(
    news?.excerpt || news?.content || ""
  );

  if (!text) return "";

  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trim()}...`;
};

const getDeskLabel = (category) => {
  switch (category) {
    case "Hyderabad":
      return "CITY DESK";

    case "Telangana":
      return "STATE DESK";

    case "India":
      return "NATIONAL DESK";

    case "World":
      return "WORLD DESK";

    case "Middle East":
      return "MIDDLE EAST DESK";

    case "Politics":
      return "POLITICS DESK";

    case "Business":
      return "BUSINESS DESK";

    case "Education":
      return "EDUCATION DESK";

    case "Sports":
      return "SPORTS DESK";

    case "Technology":
      return "TECH DESK";

    case "Health":
      return "HEALTH DESK";

    case "Lifestyle":
      return "LIFESTYLE DESK";

    default:
      return "NEWS DESK";
  }
};

/* =========================================================
   IMAGE COMPONENT
========================================================= */

function NewsImage({
  news,
  className = "",
  priority = false,
}) {
  const [failed, setFailed] = useState(false);

  const image =
    typeof news?.image === "string"
      ? news.image.trim()
      : "";

  useEffect(() => {
    setFailed(false);
  }, [image]);

  if (!image || failed) {
    return (
      <div
        className={`news-image-fallback ${className}`}
        aria-label="Democratic News"
      >
        <div className="fallback-dn">DN</div>
        <span>DEMOCRATIC NEWS</span>
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={news?.title || "Democratic News"}
      className={`news-image ${className}`}
      loading={priority ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  category,
  label,
  link,
}) {
  const finalLink =
    link || getCategoryPath(category);

  return (
    <div className="news-section-header">
      <div className="section-title-area">
        <span className="section-kicker">
          {label || getDeskLabel(category)}
        </span>

        <h2>
          {category === "Latest"
            ? "Latest News"
            : `${category} News`}
        </h2>
      </div>

      <Link
        to={finalLink}
        className="section-link"
      >
        View All
        <span>→</span>
      </Link>
    </div>
  );
}

/* =========================================================
   SMALL NEWS CARD
========================================================= */

function SmallNewsCard({
  news,
  number,
}) {
  return (
    <article className="small-news-card">
      <Link
        to={`/news/${news.id}`}
        className="small-news-image-link"
      >
        <div className="small-news-image">
          <NewsImage news={news} />
        </div>
      </Link>

      <div className="small-news-content">
        <span className="category-label">
          {news.category || "News"}
        </span>

        <Link to={`/news/${news.id}`}>
          <h3>{news.title}</h3>
        </Link>

        <div className="small-news-meta">
          {number && (
            <span className="small-number">
              {String(number).padStart(2, "0")}
            </span>
          )}

          <span>
            {formatDate(
              news.publishedAt ||
                news.createdAt ||
                news.updatedAt
            )}
          </span>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   CATEGORY SECTION
========================================================= */

function CategorySection({
  category,
  news,
}) {
  const categoryNews = news
    .filter(
      (item) =>
        String(item.category || "")
          .trim()
          .toLowerCase() ===
        category.toLowerCase()
    )
    .slice(0, 3);

  return (
    <section className="category-news-block">
      <SectionHeader
        category={category}
        label={getDeskLabel(category)}
      />

      {categoryNews.length > 0 ? (
        <div className="category-three-grid">
          {categoryNews.map((item, index) => (
            <article
              className="category-news-card"
              key={item.id}
            >
              <Link
                to={`/news/${item.id}`}
                className="category-news-image-link"
              >
                <div className="category-news-image">
                  <NewsImage news={item} />

                  <span className="story-number">
                    {String(index + 1).padStart(
                      2,
                      "0"
                    )}
                  </span>
                </div>
              </Link>

              <div className="category-news-content">
                <span className="category-label">
                  {item.category || category}
                </span>

                <Link to={`/news/${item.id}`}>
                  <h3>{item.title}</h3>
                </Link>

                {getExcerpt(item, 130) && (
                  <p>
                    {getExcerpt(item, 130)}
                  </p>
                )}

                <div className="category-news-meta">
                  <span>
                    {item.source ||
                      item.author ||
                      "Democratic News"}
                  </span>

                  <span>
                    {formatDate(
                      item.publishedAt ||
                        item.createdAt ||
                        item.updatedAt
                    )}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="category-empty">
          <div className="category-empty-icon">
            DN
          </div>

          <div>
            <strong>
              No {category} stories yet
            </strong>

            <p>
              News for this section will appear
              automatically when available.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   HOME
========================================================= */

function Home() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD NEWS
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadHomeNews() {
      try {
        setError("");

        const isInitialLoad =
          mounted && news.length === 0;

        if (isInitialLoad) {
          setLoading(true);
        }

        /*
          IMPORTANT:
          Previously this page used getAllNews(), which could
          read the complete Firestore news collection.

          Home page only needs a bounded recent dataset.
        */

        const data = await getLatestNews(
          HOME_NEWS_LIMIT
        );

        const sorted = [...(data || [])].sort(
          (a, b) =>
            getTimestamp(b) - getTimestamp(a)
        );

        if (mounted) {
          setNews(sorted);
          setLoading(false);
        }
      } catch (err) {
        console.error(
          "Home news loading failed:",
          err
        );

        if (mounted) {
          setError(
            "News load nahi ho paayi. Please refresh the page."
          );
          setLoading(false);
        }
      }
    }

    loadHomeNews();

    /*
      Refresh homepage data every 15 minutes.
      This refreshes Firestore data without continuously
      querying the database every minute.
    */
    const refreshTimer = window.setInterval(
      loadHomeNews,
      NEWS_REFRESH_INTERVAL
    );

    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  /* =======================================================
     MEMOIZED DATA
  ======================================================= */

  const latestNews = useMemo(() => {
    return news.slice(0, 8);
  }, [news]);

  const featuredNews = news[0] || null;

  const secondaryFeatured = useMemo(() => {
    return news.slice(1, 4);
  }, [news]);

  const editorPicks = useMemo(() => {
    return news.slice(1, 5);
  }, [news]);

  const topStories = useMemo(() => {
    return news.slice(0, 5);
  }, [news]);

  const breakingNews = useMemo(() => {
    const markedBreaking = news.filter(
      (item) =>
        item?.breaking === true ||
        item?.isBreaking === true ||
        item?.breakingNews === true
    );

    if (markedBreaking.length > 0) {
      return markedBreaking.slice(0, 5);
    }

    return news.slice(0, 5);
  }, [news]);

  /* =======================================================
     CURRENT DATE
  ======================================================= */

  const currentDate = new Date().toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <div className="news-site">

      {/* ===================================================
          TOP TRENDING BAR
      =================================================== */}

      <div className="top-bar">
        <div className="container top-bar-inner">

          <div className="top-trending">
            <strong>Trending:</strong>

            {breakingNews.length > 0 ? (
              <Link
                to={`/news/${breakingNews[0].id}`}
              >
                {breakingNews[0].title}
              </Link>
            ) : (
              <span>
                Latest news and updates from Democratic
                News
              </span>
            )}
          </div>

          <div className="top-date">
            {currentDate}
          </div>

        </div>
      </div>

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="site-header">

        <div className="container main-header">

          <Link
            to="/"
            className="brand"
          >
            <div className="brand-mark">
              <img
                src="/logo.png"
                alt="Democratic News Logo"
              />
            </div>

            <div className="brand-copy">

              <div className="brand-name">
                DEMOCRATIC NEWS
              </div>

              <div className="brand-tagline">
                India • Telangana • Hyderabad • World
              </div>

            </div>
          </Link>

          <div className="header-actions">

            <Link
              to="/search"
              className="search-button"
            >
              <span className="search-icon">
                ⌕
              </span>

              <span>Search</span>
            </Link>

            <Link
              to="/epaper"
              className="epaper-button"
            >
              E-Paper
            </Link>

          </div>

        </div>

        {/* =================================================
            MAIN NAVIGATION
        ================================================= */}

        <nav className="main-nav">
          <div className="container nav-scroll">

            {categories.map((category) => (
              <Link
                to={getCategoryPath(category)}
                key={category}
                className={
                  category === "Home"
                    ? "active"
                    : ""
                }
              >
                {category}
              </Link>
            ))}

          </div>
        </nav>

      </header>

      {/* ===================================================
          BREAKING NEWS
      =================================================== */}

      <section className="breaking-bar">

        <div className="container breaking-inner">

          <div className="breaking-label">
            <span className="breaking-dot"></span>
            BREAKING NEWS
          </div>

          <div className="breaking-scroll">

            {breakingNews.length > 0 ? (
              breakingNews.map((item) => (
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

          <Link
            to="/latest"
            className="breaking-arrow"
          >
            →
          </Link>

        </div>

      </section>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main>

        {error && (
          <div className="container home-error">
            {error}
          </div>
        )}

        {/* =================================================
            FEATURED NEWS AREA
        ================================================= */}

        <section className="container featured-section">

          <div className="featured-main">

            {loading ? (
              <div className="hero-skeleton">
                Loading featured news...
              </div>
            ) : featuredNews ? (
              <>
                <Link
                  to={`/news/${featuredNews.id}`}
                  className="featured-main-image-link"
                >
                  <div className="featured-main-image">
                    <NewsImage
                      news={featuredNews}
                      priority
                    />

                    <div className="featured-overlay">
                      <span className="featured-badge">
                        {featuredNews.category ||
                          "TOP STORY"}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="featured-main-content">

                  <span className="category-label">
                    {featuredNews.category ||
                      "TOP STORY"}
                  </span>

                  <Link
                    to={`/news/${featuredNews.id}`}
                  >
                    <h1>
                      {featuredNews.title}
                    </h1>
                  </Link>

                  {getExcerpt(
                    featuredNews,
                    220
                  ) && (
                    <p>
                      {getExcerpt(
                        featuredNews,
                        220
                      )}
                    </p>
                  )}

                  <div className="hero-meta">

                    <span>
                      {featuredNews.source ||
                        featuredNews.author ||
                        "Democratic News"}
                    </span>

                    <span>•</span>

                    <span>
                      {formatDate(
                        featuredNews.publishedAt ||
                          featuredNews.createdAt ||
                          featuredNews.updatedAt
                      )}
                    </span>

                  </div>

                </div>
              </>
            ) : (
              <div className="hero-empty">

                <span className="empty-logo">
                  DN
                </span>

                <h1>
                  Latest news from Hyderabad,
                  Telangana, India and the world
                </h1>

                <p>
                  News stories will appear here
                  automatically.
                </p>

              </div>
            )}

          </div>

          {/* =================================================
              SECONDARY FEATURED STORIES
          ================================================= */}

          <div className="featured-secondary">

            {secondaryFeatured.length > 0 ? (
              secondaryFeatured.map(
                (item, index) => (
                  <article
                    className="secondary-featured-card"
                    key={item.id}
                  >

                    <Link
                      to={`/news/${item.id}`}
                    >
                      <div className="secondary-featured-image">
                        <NewsImage
                          news={item}
                        />

                        <span className="secondary-number">
                          {String(index + 2).padStart(
                            2,
                            "0"
                          )}
                        </span>
                      </div>
                    </Link>

                    <div className="secondary-featured-content">

                      <span className="category-label">
                        {item.category ||
                          "NEWS"}
                      </span>

                      <Link
                        to={`/news/${item.id}`}
                      >
                        <h3>
                          {item.title}
                        </h3>
                      </Link>

                      <small>
                        {formatDate(
                          item.publishedAt ||
                            item.createdAt ||
                            item.updatedAt
                        )}
                      </small>

                    </div>

                  </article>
                )
              )
            ) : (
              <div className="secondary-empty">
                More featured stories will appear
                here.
              </div>
            )}

          </div>

        </section>

        {/* =================================================
            EDITOR'S PICK
        ================================================= */}

        <section className="container editor-pick-section">

          <SectionHeader
            category="Editor's Pick"
            label="CURATED STORIES"
            link="/latest"
          />

          {editorPicks.length > 0 ? (
            <div className="editor-pick-grid">

              {editorPicks.map(
                (item, index) => (
                  <SmallNewsCard
                    key={item.id}
                    news={item}
                    number={index + 1}
                  />
                )
              )}

            </div>
          ) : (
            <div className="section-empty">
              Editor's Pick stories will appear
              automatically.
            </div>
          )}

        </section>

        {/* =================================================
            LATEST + SIDEBAR
        ================================================= */}

        <section className="container content-with-sidebar">

          <div className="main-column">

            <SectionHeader
              category="Latest"
              label="NEWSROOM"
              link="/latest"
            />

            {loading ? (
              <div className="loading-block">
                Loading latest stories...
              </div>
            ) : latestNews.length > 0 ? (
              <div className="latest-news-grid">

                {latestNews.slice(0, 6).map(
                  (item) => (
                    <article
                      className="latest-news-card"
                      key={item.id}
                    >

                      <Link
                        to={`/news/${item.id}`}
                        className="latest-news-image-link"
                      >
                        <div className="latest-news-image">
                          <NewsImage
                            news={item}
                          />
                        </div>
                      </Link>

                      <div className="latest-news-content">

                        <span className="category-label">
                          {item.category ||
                            "News"}
                        </span>

                        <Link
                          to={`/news/${item.id}`}
                        >
                          <h3>
                            {item.title}
                          </h3>
                        </Link>

                        {getExcerpt(
                          item,
                          120
                        ) && (
                          <p>
                            {getExcerpt(
                              item,
                              120
                            )}
                          </p>
                        )}

                        <div className="card-meta">

                          <span>
                            {formatDate(
                              item.publishedAt ||
                                item.createdAt ||
                                item.updatedAt
                            )}
                          </span>

                          <Link
                            to={`/news/${item.id}`}
                          >
                            Read →
                          </Link>

                        </div>

                      </div>

                    </article>
                  )
                )}

              </div>
            ) : (
              <div className="section-empty">
                No news available yet.
              </div>
            )}

          </div>

          {/* =================================================
              SIDEBAR
          ================================================= */}

          <aside className="home-sidebar">

            <div className="sidebar-widget">

              <div className="sidebar-widget-title">
                <span>TOP STORIES</span>

                <Link to="/latest">
                  View All →
                </Link>
              </div>

              <div className="sidebar-story-list">

                {topStories.length > 0 ? (
                  topStories.map(
                    (item, index) => (
                      <SmallNewsCard
                        key={item.id}
                        news={item}
                        number={index + 1}
                      />
                    )
                  )
                ) : (
                  <div className="sidebar-empty">
                    No top stories available.
                  </div>
                )}

              </div>

            </div>

            <div className="sidebar-widget newsletter-widget">

              <span className="sidebar-kicker">
                DEMOCRATIC NEWS
              </span>

              <h3>
                Never Miss Any Updates
              </h3>

              <p>
                Latest news and important updates
                from Hyderabad, Telangana, India
                and around the world.
              </p>

              <Link
                to="/latest"
                className="newsletter-button"
              >
                Explore Latest News
              </Link>

            </div>

          </aside>

        </section>

        {/* =================================================
            CATEGORY SECTIONS
        ================================================= */}

        <div className="category-sections">

          {newsCategories.map(
            (category) => (
              <CategorySection
                key={category}
                category={category}
                news={news}
              />
            )
          )}

        </div>

      </main>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="site-footer">

        <div className="container footer-content">

          <div className="footer-brand">

            <div className="footer-logo-row">

              <div className="footer-logo-box">
                DN
              </div>

              <div>
                <h2>
                  Democratic News
                </h2>

                <span>
                  Independent News &amp;
                  Information
                </span>
              </div>

            </div>

            <p>
              Your source for news, information
              and updates from Hyderabad,
              Telangana, India and around the
              world.
            </p>

            <div className="footer-tagline">
              Truth • Information • Public Voice
            </div>

          </div>

          <div className="footer-column">

            <h3>Quick Links</h3>

            <Link to="/latest">
              Latest News
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

          <div className="footer-column">

            <h3>Categories</h3>

            <Link to="/category/hyderabad">
              Hyderabad
            </Link>

            <Link to="/category/telangana">
              Telangana
            </Link>

            <Link to="/category/india">
              India
            </Link>

            <Link to="/category/world">
              World
            </Link>

          </div>

          <div className="footer-column">

            <h3>More News</h3>

            <Link to="/category/business">
              Business
            </Link>

            <Link to="/category/sports">
              Sports
            </Link>

            <Link to="/category/technology">
              Technology
            </Link>

          </div>

        </div>

        <div className="footer-bottom">

          <div className="container footer-bottom-inner">

            <span>
              © 2026 Democratic News.
              All rights reserved.
            </span>

            <span>
              Independent News &amp;
              Information
            </span>

          </div>

        </div>

      </footer>

    </div>
  );
}

export default Home;