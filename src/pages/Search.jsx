import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDocs, collection } from "firebase/firestore";

import { db } from "../firebase";
import "../styles/search.css";

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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function getNewsTime(news) {
  if (news?.createdAt?.toMillis) {
    return news.createdAt.toMillis();
  }

  if (news?.createdAt?.toDate) {
    return news.createdAt.toDate().getTime();
  }

  if (news?.createdAt?.seconds) {
    return news.createdAt.seconds * 1000;
  }

  if (news?.publishedAt) {
    const date = new Date(news.publishedAt);

    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return 0;
}

function formatDate(news) {
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

function formatCategory(category) {
  if (!category) return "News";

  return String(category)
    .replace(/-/g, " ")
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}

function getExcerpt(news) {
  const text =
    news?.excerpt ||
    news?.description ||
    news?.content ||
    "Read the latest news from Democratic News.";

  return String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getImage(news) {
  return (
    news?.image ||
    news?.imageUrl ||
    news?.thumbnail ||
    news?.thumbnailUrl ||
    ""
  );
}

/* =================================
   IMAGE
================================= */

function SearchImage({ news }) {
  const [failed, setFailed] = useState(false);

  const image = getImage(news);

  if (!image || failed) {
    return (
      <div className="search-image-fallback">
        <div className="search-fallback-mark">
          DN
        </div>

        <strong>DEMOCRATIC NEWS</strong>

        <small>
          {formatCategory(news?.category)}
        </small>
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={news?.title || "Democratic News"}
      onError={() => setFailed(true)}
    />
  );
}

/* =================================
   SEARCH
================================= */

function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [newsData, setNewsData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  /* =================================
     LOAD FIREBASE NEWS
  ================================== */

  useEffect(() => {
    async function loadNews() {
      try {
        setLoading(true);
        setLoadError("");

        const snapshot = await getDocs(
          collection(db, "news")
        );

        const news = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort(
            (a, b) =>
              getNewsTime(b) - getNewsTime(a)
          );

        setNewsData(news);
      } catch (error) {
        console.error(
          "Error loading search news:",
          error
        );

        setLoadError(
          "News load nahi ho paayi. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadNews();
  }, []);

  /* =================================
     SEARCH RESULTS
  ================================== */

  const results = useMemo(() => {
    const query = normalizeText(searchTerm);

    if (!query) {
      return [];
    }

    const uniqueNews = new Map();

    newsData.forEach((news) => {
      const title = normalizeText(news.title);
      const category = normalizeText(news.category);
      const excerpt = normalizeText(news.excerpt);
      const description = normalizeText(
        news.description
      );
      const content = normalizeText(news.content);
      const author = normalizeText(news.author);
      const source = normalizeText(news.source);

      const searchableText = [
        title,
        category,
        excerpt,
        description,
        content,
        author,
        source,
      ].join(" ");

      if (searchableText.includes(query)) {
        const duplicateKey =
          news.externalId ||
          news.guid ||
          news.link ||
          news.id;

        if (!uniqueNews.has(duplicateKey)) {
          uniqueNews.set(duplicateKey, news);
        }
      }
    });

    return Array.from(uniqueNews.values()).sort(
      (a, b) =>
        getNewsTime(b) - getNewsTime(a)
    );
  }, [searchTerm, newsData]);

  /* =================================
     TOP STORIES
  ================================== */

  const topStories = useMemo(() => {
    return newsData.slice(0, 5);
  }, [newsData]);

  /* =================================
     SEARCH SUBMIT
  ================================== */

  const handleSubmit = (event) => {
    event.preventDefault();

    setSearchTerm(
      searchTerm.trim()
    );
  };

  return (
    <div className="search-page">

      {/* =================================
          TOP BAR
      ================================== */}

      <div className="search-topbar">
        <div className="search-container search-topbar-inner">

          <span>
            Trending: Latest News & Updates
          </span>

          <span>
            Hyderabad • Telangana • India
          </span>

        </div>
      </div>

      {/* =================================
          HEADER
      ================================== */}

      <header className="search-header">
        <div className="search-container search-header-inner">

          <Link
            to="/"
            className="search-brand"
          >
            <div className="search-logo-box">
              <img
                src="/logo.png"
                alt="Democratic News Logo"
              />
            </div>

            <div>
              <div className="search-brand-name">
                DEMOCRATIC NEWS
              </div>

              <div className="search-brand-tagline">
                India • Telangana • Hyderabad • World
              </div>
            </div>
          </Link>

          <div className="search-header-actions">

            <Link
              to="/"
              className="search-home-button"
            >
              Home
            </Link>

            <Link
              to="/epaper"
              className="search-epaper-button"
            >
              E-Paper
            </Link>

          </div>

        </div>
      </header>

      {/* =================================
          NAVIGATION
      ================================== */}

      <nav className="search-nav">
        <div className="search-container search-nav-inner">

          <Link to="/">
            Home
          </Link>

          <Link to="/latest">
            Latest
          </Link>

          {categories.map((category) => (
            <Link
              key={category}
              to={`/category/${category
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {category}
            </Link>
          ))}

        </div>
      </nav>

      {/* =================================
          BREAKING NEWS
      ================================== */}

      <div className="search-breaking">
        <div className="search-container search-breaking-inner">

          <span className="search-breaking-label">
            BREAKING NEWS
          </span>

          <span>
            Latest developments from Hyderabad,
            Telangana, India and the world
          </span>

        </div>
      </div>

      {/* =================================
          MAIN
      ================================== */}

      <main className="search-container search-main">

        {/* PAGE TITLE */}

        <div className="search-title-area">

          <div className="search-kicker">
            DEMOCRATIC NEWS
          </div>

          <h1>
            Search News
          </h1>

          <p>
            Find the latest stories, reports and
            updates from Democratic News.
          </p>

        </div>

        <div className="search-layout">

          {/* =================================
              LEFT CONTENT
          ================================== */}

          <section className="search-content">

            {/* SEARCH FORM */}

            <form
              className="search-box-wrapper"
              onSubmit={handleSubmit}
            >
              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search news, topics, categories..."
                aria-label="Search Democratic News"
              />

              <button type="submit">
                Search
              </button>
            </form>

            {/* LOADING */}

            {loading && (
              <section className="search-empty">

                <div className="search-empty-icon">
                  🔄
                </div>

                <h2>
                  Loading News...
                </h2>

                <p>
                  Please wait while we load
                  the latest news.
                </p>

              </section>
            )}

            {/* ERROR */}

            {!loading && loadError && (
              <section className="search-empty">

                <div className="search-empty-icon">
                  ⚠️
                </div>

                <h2>
                  Unable to Load News
                </h2>

                <p>
                  {loadError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
                >
                  Try Again
                </button>

              </section>
            )}

            {/* NO SEARCH */}

            {!loading &&
              !loadError &&
              searchTerm.trim() === "" && (
                <section className="search-empty">

                  <div className="search-empty-icon">
                    🔎
                  </div>

                  <h2>
                    Search Democratic News
                  </h2>

                  <p>
                    Enter a keyword above to
                    search our news database.
                  </p>

                </section>
              )}

            {/* RESULTS */}

            {!loading &&
              !loadError &&
              searchTerm.trim() !== "" &&
              results.length > 0 && (
                <section className="search-results">

                  <div className="search-results-heading">

                    <div>
                      <span>
                        SEARCH RESULTS
                      </span>

                      <h2>
                        Stories matching your search
                      </h2>
                    </div>

                    <strong>
                      {results.length}{" "}
                      {results.length === 1
                        ? "story"
                        : "stories"}
                    </strong>

                  </div>

                  <div className="search-results-list">

                    {results.map((news) => (
                      <article
                        className="search-result-card"
                        key={news.id}
                      >

                        <Link
                          to={`/news/${news.id}`}
                          className="search-result-image"
                        >
                          <SearchImage
                            news={news}
                          />
                        </Link>

                        <div className="search-result-content">

                          <span className="search-category">
                            {formatCategory(
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

                          <div className="search-result-meta">
                            {formatDate(news)}

                            {news.source && (
                              <>
                                <span>•</span>
                                <span>
                                  {news.source}
                                </span>
                              </>
                            )}
                          </div>

                          <p>
                            {getExcerpt(news)}
                          </p>

                          <Link
                            to={`/news/${news.id}`}
                            className="search-read-more"
                          >
                            Read Full Story →
                          </Link>

                        </div>

                      </article>
                    ))}

                  </div>

                </section>
              )}

            {/* NO RESULTS */}

            {!loading &&
              !loadError &&
              searchTerm.trim() !== "" &&
              results.length === 0 && (
                <section className="search-empty">

                  <div className="search-empty-icon">
                    📰
                  </div>

                  <h2>
                    No Results Found
                  </h2>

                  <p>
                    We couldn't find any news
                    matching{" "}
                    <strong>
                      "{searchTerm}"
                    </strong>
                    .
                  </p>

                  <div className="search-no-result-actions">

                    <button
                      type="button"
                      onClick={() =>
                        setSearchTerm("")
                      }
                    >
                      Clear Search
                    </button>

                    <Link to="/latest">
                      Browse Latest News
                    </Link>

                  </div>

                </section>
              )}

          </section>

          {/* =================================
              SIDEBAR
          ================================== */}

          <aside className="search-sidebar">

            {/* TOP STORIES */}

            <section className="search-sidebar-box">

              <div className="search-sidebar-heading">

                <h2>
                  Top Stories
                </h2>

                <Link to="/latest">
                  View All
                </Link>

              </div>

              <div className="search-top-stories">

                {topStories.map(
                  (news, index) => (
                    <article
                      className="search-top-story"
                      key={news.id}
                    >

                      <Link
                        to={`/news/${news.id}`}
                        className="search-top-story-image"
                      >
                        <SearchImage
                          news={news}
                        />
                      </Link>

                      <div>

                        <span className="search-story-number">
                          {String(index + 1).padStart(
                            2,
                            "0"
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

                        <small>
                          {formatDate(news)}
                        </small>

                      </div>

                    </article>
                  )
                )}

                {topStories.length === 0 && (
                  <p className="search-sidebar-muted">
                    No stories available yet.
                  </p>
                )}

              </div>

            </section>

            {/* CATEGORIES */}

            <section className="search-sidebar-box">

              <div className="search-sidebar-heading">
                <h2>
                  Categories
                </h2>
              </div>

              <div className="search-categories">

                {categories.map(
                  (category) => (
                    <Link
                      key={category}
                      to={`/category/${category
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      <span>
                        {category}
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

            <section className="search-about-box">

              <span>
                DEMOCRATIC NEWS
              </span>

              <h2>
                Independent News.
                <br />
                Trusted Information.
              </h2>

              <p>
                Democratic News brings you
                news and information from
                Hyderabad, Telangana, India
                and around the world.
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

      <footer className="search-footer">

        <div className="search-container search-footer-grid">

          <div>

            <div className="search-footer-brand">
              DEMOCRATIC NEWS
            </div>

            <p>
              Independent news and information
              from Hyderabad, Telangana, India
              and the world.
            </p>

          </div>

          <div>

            <h3>
              Categories
            </h3>

            {categories.slice(0, 6).map(
              (category) => (
                <Link
                  key={category}
                  to={`/category/${category
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  {category}
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

        <div className="search-footer-bottom">
          © 2026 Democratic News. All rights reserved.
        </div>

      </footer>

    </div>
  );
}

export default Search;