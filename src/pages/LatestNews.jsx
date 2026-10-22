import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getLatestNews } from "../services/newsService";
import "../styles/latest.css";

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

function timestampToMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  if (typeof value === "number") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();

    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function getTimestamp(news) {
  if (!news) {
    return 0;
  }

  return Math.max(
    timestampToMillis(news.createdAt),
    timestampToMillis(news.publishedAt),
    timestampToMillis(news.updatedAt)
  );
}

function formatDate(news) {
  const timestamp = getTimestamp(news);

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
  const timestamp = getTimestamp(news);

  if (!timestamp) {
    return "Recently";
  }

  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getExcerpt(news, length = 150) {
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

function getCategory(news) {
  const category = String(news?.category || "").trim();

  return category || "News";
}

function getSource(news) {
  return (
    String(news?.source || "").trim() ||
    String(news?.author || "").trim() ||
    "Democratic News"
  );
}

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

function NewsImage({
  news,
  className = "",
  size = "large",
}) {
  const [imageError, setImageError] = useState(false);

  const image = getImage(news);
  const category = getCategory(news);

  return (
    <div
      className={`latest-news-image latest-news-image-${size} ${className}`}
    >
      {image && !imageError ? (
        <img
          src={image}
          alt={news?.title || "Democratic News"}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="latest-image-fallback">
          <span className="latest-fallback-logo">
            DEMOCRATIC
          </span>

          <strong>NEWS</strong>

          <small>{category.toUpperCase()}</small>
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  children,
  link = "/latest",
}) {
  return (
    <div className="latest-section-heading">
      <div className="latest-heading-left">
        <span className="latest-heading-line" />

        <h2>{children}</h2>
      </div>

      <Link
        to={link}
        className="latest-view-all"
      >
        View All →
      </Link>
    </div>
  );
}

function Latest() {
  const [latestNews, setLatestNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNews() {
    try {
      setLoading(true);
      setError("");

      const data = await getLatestNews(20);

      const sortedNews = Array.isArray(data)
        ? [...data]
            .filter(Boolean)
            .sort(
              (a, b) =>
                getTimestamp(b) -
                getTimestamp(a)
            )
        : [];

      setLatestNews(sortedNews);
    } catch (err) {
      console.error(
        "Error loading latest news:",
        err
      );

      setError(
        "News load nahi ho paayi. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initialLoad() {
      try {
        setLoading(true);
        setError("");

        const data = await getLatestNews(20);

        const sortedNews = Array.isArray(data)
          ? [...data]
              .filter(Boolean)
              .sort(
                (a, b) =>
                  getTimestamp(b) -
                  getTimestamp(a)
              )
          : [];

        if (mounted) {
          setLatestNews(sortedNews);
        }
      } catch (err) {
        console.error(
          "Error loading latest news:",
          err
        );

        if (mounted) {
          setError(
            "News load nahi ho paayi. Please try again."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialLoad();

    // RSS system 15-minute cycle ke saath page ko
    // automatically refresh karne ke liye.
    const refreshInterval = setInterval(() => {
      loadNews();
    }, 15 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  const featuredNews = latestNews[0] || null;

  const secondaryNews = useMemo(() => {
    return latestNews.slice(1, 4);
  }, [latestNews]);

  const remainingNews = useMemo(() => {
    return latestNews.slice(4);
  }, [latestNews]);

  const topStories = useMemo(() => {
    return latestNews.slice(0, 5);
  }, [latestNews]);

  const categoryCounts = useMemo(() => {
    const counts = {};

    latestNews.forEach((news) => {
      const category = getCategory(news);

      counts[category] =
        (counts[category] || 0) + 1;
    });

    return counts;
  }, [latestNews]);

  return (
    <div className="latest-page">
      {/* TOP TRENDING BAR */}
      <div className="latest-trending-bar">
        <div className="latest-container latest-trending-inner">
          <div className="latest-trending-label">
            TRENDING
          </div>

          <div className="latest-trending-text">
            Latest News • India • Telangana • Hyderabad • World
          </div>

          <Link
            to="/search"
            className="latest-search-link"
          >
            Search News
          </Link>
        </div>
      </div>

      {/* HEADER */}
      <header className="latest-header">
        <div className="latest-container latest-header-inner">
          <Link
            to="/"
            className="latest-brand"
          >
            <div className="latest-logo">
              <img
                src="/logo.png"
                alt="Democratic News"
              />
            </div>

            <div className="latest-brand-copy">
              <div className="latest-brand-name">
                DEMOCRATIC NEWS
              </div>

              <div className="latest-brand-tagline">
                India • Telangana • Hyderabad • World
              </div>
            </div>
          </Link>

          <div className="latest-header-date">
            <span>NEWS PORTAL</span>
            <strong>Latest Updates</strong>
          </div>
        </div>
      </header>

      {/* NAVIGATION */}
      <nav className="latest-navigation">
        <div className="latest-container latest-navigation-inner">
          <Link
            to="/"
            className="latest-nav-home"
          >
            HOME
          </Link>

          <Link
            to="/latest"
            className="active"
          >
            LATEST
          </Link>

          {categories.map((category) => (
            <Link
              key={category}
              to={`/category/${encodeURIComponent(
                category
              )}`}
            >
              {category.toUpperCase()}
            </Link>
          ))}
        </div>
      </nav>

      {/* BREAKING BAR */}
      <div className="latest-breaking-wrap">
        <div className="latest-container">
          <div className="latest-breaking">
            <span className="latest-breaking-label">
              BREAKING NEWS
            </span>

            <div className="latest-breaking-scroll">
              {latestNews.length > 0
                ? latestNews
                    .slice(0, 5)
                    .map((news) => (
                      <Link
                        key={news.id}
                        to={`/news/${news.id}`}
                      >
                        {news.title}
                      </Link>
                    ))
                : "Latest news and important developments from India and around the world"}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="latest-container latest-main">
        {/* PAGE INTRO */}
        <section className="latest-page-intro">
          <span className="latest-kicker">
            DEMOCRATIC NEWS DESK
          </span>

          <h1>Latest News</h1>

          <p>
            Stay updated with the latest news and important
            developments from Hyderabad, Telangana, India,
            the Middle East and around the world.
          </p>
        </section>

        {/* LOADING */}
        {loading && (
          <section className="latest-loading-grid">
            {Array.from({ length: 8 }).map(
              (_, index) => (
                <div
                  className="latest-skeleton-card"
                  key={index}
                >
                  <div className="latest-skeleton-image" />

                  <div className="latest-skeleton-content">
                    <div className="latest-skeleton-line small" />
                    <div className="latest-skeleton-line" />
                    <div className="latest-skeleton-line" />
                    <div className="latest-skeleton-line short" />
                  </div>
                </div>
              )
            )}
          </section>
        )}

        {/* ERROR */}
        {!loading && error && (
          <section className="latest-status-box latest-error-box">
            <div className="latest-status-icon">
              !
            </div>

            <h2>Unable to load news</h2>

            <p>{error}</p>

            <button
              type="button"
              onClick={loadNews}
              className="latest-retry-button"
            >
              Try Again
            </button>
          </section>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          latestNews.length === 0 && (
            <section className="latest-status-box">
              <div className="latest-status-icon">
                N
              </div>

              <h2>No news available</h2>

              <p>
                There are currently no news articles
                available. New articles will appear here
                when they are published.
              </p>

              <Link
                to="/"
                className="latest-retry-button"
              >
                Back to Home
              </Link>
            </section>
          )}

        {/* NEWS */}
        {!loading &&
          !error &&
          latestNews.length > 0 && (
            <>
              {/* FEATURED AREA */}
              {featuredNews && (
                <section className="latest-featured-area">
                  <div className="latest-featured-main">
                    <Link
                      to={`/news/${featuredNews.id}`}
                      className="latest-featured-image-link"
                    >
                      <NewsImage
                        news={featuredNews}
                        size="featured"
                      />

                      {featuredNews.breaking && (
                        <span className="latest-breaking-badge">
                          BREAKING
                        </span>
                      )}
                    </Link>

                    <div className="latest-featured-content">
                      <div className="latest-meta-row">
                        <span className="latest-category-badge">
                          {getCategory(
                            featuredNews
                          )}
                        </span>

                        <span className="latest-date">
                          {formatDate(
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
                          240
                        )}
                      </p>

                      <div className="latest-featured-footer">
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
                  </div>

                  <div className="latest-secondary-featured">
                    {secondaryNews.map(
                      (news) => (
                        <article
                          className="latest-secondary-card"
                          key={news.id}
                        >
                          <Link
                            to={`/news/${news.id}`}
                          >
                            <NewsImage
                              news={news}
                              size="secondary"
                            />
                          </Link>

                          <div className="latest-secondary-content">
                            <span className="latest-small-category">
                              {getCategory(
                                news
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

                            <time>
                              {formatShortDate(
                                news
                              )}
                            </time>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </section>
              )}

              {/* CONTENT + SIDEBAR */}
              <div className="latest-content-layout">
                <section className="latest-content-column">
                  <SectionTitle>
                    Latest Updates
                  </SectionTitle>

                  <div className="latest-list">
                    {remainingNews.length > 0 ? (
                      remainingNews.map(
                        (news) => (
                          <article
                            className="latest-list-card"
                            key={news.id}
                          >
                            <Link
                              to={`/news/${news.id}`}
                              className="latest-list-image-link"
                            >
                              <NewsImage
                                news={news}
                                size="list"
                              />

                              {news.breaking && (
                                <span className="latest-list-breaking">
                                  BREAKING
                                </span>
                              )}
                            </Link>

                            <div className="latest-list-content">
                              <div className="latest-list-meta">
                                <span className="latest-category-badge">
                                  {getCategory(
                                    news
                                  )}
                                </span>

                                <span>
                                  {formatDate(
                                    news
                                  )}
                                </span>
                              </div>

                              <Link
                                to={`/news/${news.id}`}
                              >
                                <h2>
                                  {news.title ||
                                    "Untitled News"}
                                </h2>
                              </Link>

                              <p>
                                {getExcerpt(
                                  news,
                                  190
                                )}
                              </p>

                              <div className="latest-list-footer">
                                <span>
                                  {getSource(
                                    news
                                  )}
                                </span>

                                <Link
                                  to={`/news/${news.id}`}
                                >
                                  Read More →
                                </Link>
                              </div>
                            </div>
                          </article>
                        )
                      )
                    ) : (
                      <div className="latest-no-more">
                        <h3>
                          You are all caught up.
                        </h3>

                        <p>
                          These are the latest available
                          news articles.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* SIDEBAR */}
                <aside className="latest-sidebar">
                  <div className="latest-sidebar-widget">
                    <SectionTitle>
                      Top Stories
                    </SectionTitle>

                    <div className="latest-top-stories">
                      {topStories.map(
                        (news, index) => (
                          <article
                            className="latest-top-story"
                            key={news.id}
                          >
                            <Link
                              to={`/news/${news.id}`}
                              className="latest-top-story-image"
                            >
                              <NewsImage
                                news={news}
                                size="small"
                              />
                            </Link>

                            <div className="latest-top-story-content">
                              <span className="latest-story-number">
                                {String(
                                  index + 1
                                ).padStart(2, "0")}
                              </span>

                              <Link
                                to={`/news/${news.id}`}
                              >
                                <h3>
                                  {news.title ||
                                    "Untitled News"}
                                </h3>
                              </Link>

                              <time>
                                {formatShortDate(
                                  news
                                )}
                              </time>
                            </div>
                          </article>
                        )
                      )}
                    </div>
                  </div>

                  {/* CATEGORIES */}
                  <div className="latest-sidebar-widget">
                    <SectionTitle>
                      Categories
                    </SectionTitle>

                    <div className="latest-category-list">
                      {categories.map(
                        (category) => (
                          <Link
                            key={category}
                            to={`/category/${encodeURIComponent(
                              category
                            )}`}
                          >
                            <span>
                              {category}
                            </span>

                            <strong>
                              {categoryCounts[
                                category
                              ] || 0}
                            </strong>
                          </Link>
                        )
                      )}
                    </div>
                  </div>

                  {/* ABOUT BOX */}
                  <div className="latest-sidebar-about">
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
                      India and the world.
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

      {/* FOOTER */}
      <footer className="latest-footer">
        <div className="latest-container latest-footer-grid">
          <div className="latest-footer-brand">
            <Link to="/">
              DEMOCRATIC NEWS
            </Link>

            <p>
              India • Telangana • Hyderabad • World
            </p>

            <span>
              Truth • Information • Public Voice
            </span>
          </div>

          <div className="latest-footer-column">
            <h3>Quick Links</h3>

            <Link to="/">Home</Link>

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

          <div className="latest-footer-column">
            <h3>News</h3>

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

          <div className="latest-footer-column">
            <h3>More</h3>

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

        <div className="latest-footer-bottom">
          <div className="latest-container">
            © 2026 Democratic News. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Latest;