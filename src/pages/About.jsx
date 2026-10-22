import { Link } from "react-router-dom";

import "../styles/about.css";

/* =========================================================
   CATEGORIES
========================================================= */

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

const getCategoryPath = (category) =>
  `/category/${category.toLowerCase()}`;

/* =========================================================
   ABOUT PAGE
========================================================= */

function About() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="about-page">

      {/* ===================================================
          TOP BAR
      =================================================== */}

      <div className="about-top-bar">
        <div className="about-container about-top-inner">

          <div className="about-trending">
            <strong>Trending:</strong>

            <span>
              Latest news and important updates from
              Hyderabad, Telangana, India and the world
            </span>
          </div>

          <div className="about-date">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>

        </div>
      </div>

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="about-header">

        <div className="about-container about-main-header">

          <Link
            to="/"
            className="about-brand"
          >
            <div className="about-brand-mark">
              <img
                src="/logo.png"
                alt="Democratic News Logo"
              />
            </div>

            <div className="about-brand-copy">

              <div className="about-brand-name">
                DEMOCRATIC NEWS
              </div>

              <div className="about-brand-tagline">
                India • Telangana • Hyderabad • World
              </div>

            </div>
          </Link>

          <div className="about-header-actions">

            <Link
              to="/search"
              className="about-search-button"
            >
              <span>⌕</span>
              Search
            </Link>

            <Link
              to="/epaper"
              className="about-epaper-button"
            >
              E-Paper
            </Link>

          </div>

        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="about-nav">

          <div className="about-container about-nav-scroll">

            <Link to="/">
              Home
            </Link>

            <Link to="/latest">
              Latest
            </Link>

            {categories.map((category) => (
              <Link
                key={category}
                to={getCategoryPath(category)}
              >
                {category}
              </Link>
            ))}

          </div>

        </nav>

      </header>

      {/* ===================================================
          BREAKING BAR
      =================================================== */}

      <section className="about-breaking">

        <div className="about-container about-breaking-inner">

          <div className="about-breaking-label">
            <span></span>
            BREAKING NEWS
          </div>

          <div className="about-breaking-text">
            Latest developments from Hyderabad,
            Telangana, India and around the world
          </div>

          <Link
            to="/latest"
            className="about-breaking-link"
          >
            View Latest →
          </Link>

        </div>

      </section>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="about-container about-hero">

          <div className="about-hero-content">

            <span className="about-kicker">
              ABOUT DEMOCRATIC NEWS
            </span>

            <h1>
              News that keeps you
              <span> informed.</span>
            </h1>

            <p className="about-hero-text">
              Democratic News is a digital news platform
              focused on bringing together important
              developments from Hyderabad, Telangana,
              India and around the world.
            </p>

            <p className="about-hero-text">
              Our website brings news, information and
              updates across multiple sections so readers
              can easily discover the stories that matter
              to them.
            </p>

            <div className="about-hero-actions">

              <Link
                to="/latest"
                className="about-primary-button"
              >
                Explore Latest News
              </Link>

              <Link
                to="/contact"
                className="about-secondary-button"
              >
                Contact Us
              </Link>

            </div>

          </div>

          <div className="about-hero-card">

            <div className="about-hero-logo">
              DN
            </div>

            <h2>
              DEMOCRATIC NEWS
            </h2>

            <p>
              India • Telangana • Hyderabad • World
            </p>

            <div className="about-hero-line"></div>

            <strong>
              Truth • Information • Public Voice
            </strong>

          </div>

        </section>

        {/* =================================================
            INTRODUCTION
        ================================================= */}

        <section className="about-container about-intro-section">

          <div className="about-section-heading">

            <span>
              OUR STORY
            </span>

            <h2>
              A digital destination for
              everyday news
            </h2>

          </div>

          <div className="about-intro-grid">

            <div className="about-intro-main">

              <p>
                Democratic News is designed as a modern
                digital news portal where readers can find
                local, national and international updates
                in one place.
              </p>

              <p>
                From Hyderabad and Telangana to India,
                the Middle East and the wider world, the
                platform is organized into clear news
                categories to make information easier to
                discover.
              </p>

              <p>
                The website also brings together business,
                education, sports, technology, health,
                lifestyle and other areas of public
                interest.
              </p>

            </div>

            <div className="about-intro-side">

              <div className="about-stat">
                <strong>12</strong>
                <span>News Categories</span>
              </div>

              <div className="about-stat">
                <strong>24/7</strong>
                <span>Digital News Access</span>
              </div>

              <div className="about-stat">
                <strong>1</strong>
                <span>News Platform</span>
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            WHAT WE COVER
        ================================================= */}

        <section className="about-cover-section">

          <div className="about-container">

            <div className="about-section-heading centered">

              <span>
                WHAT WE COVER
              </span>

              <h2>
                News across the sections
                that matter
              </h2>

              <p>
                Explore Democratic News through our
                dedicated coverage categories.
              </p>

            </div>

            <div className="about-category-grid">

              {categories.map((category, index) => (
                <Link
                  to={getCategoryPath(category)}
                  className="about-category-card"
                  key={category}
                >

                  <div className="about-category-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="about-category-content">

                    <h3>
                      {category}
                    </h3>

                    <span>
                      Explore stories →
                    </span>

                  </div>

                </Link>
              ))}

            </div>

          </div>

        </section>

        {/* =================================================
            OUR APPROACH
        ================================================= */}

        <section className="about-container about-approach-section">

          <div className="about-section-heading">

            <span>
              OUR APPROACH
            </span>

            <h2>
              Built around useful
              information
            </h2>

          </div>

          <div className="about-approach-grid">

            <article className="about-approach-card">

              <div className="approach-icon">
                01
              </div>

              <h3>
                Clear Information
              </h3>

              <p>
                News stories are presented in a clear
                format so readers can quickly understand
                what a story is about.
              </p>

            </article>

            <article className="about-approach-card">

              <div className="approach-icon">
                02
              </div>

              <h3>
                Local Focus
              </h3>

              <p>
                Hyderabad and Telangana remain important
                parts of the platform's coverage alongside
                national and international news.
              </p>

            </article>

            <article className="about-approach-card">

              <div className="approach-icon">
                03
              </div>

              <h3>
                Broad Coverage
              </h3>

              <p>
                Readers can move between politics,
                business, education, sports, technology,
                health, lifestyle and other categories.
              </p>

            </article>

            <article className="about-approach-card">

              <div className="approach-icon">
                04
              </div>

              <h3>
                Easy Access
              </h3>

              <p>
                The platform is designed for simple
                navigation across latest news, categories,
                individual stories and the digital E-Paper.
              </p>

            </article>

          </div>

        </section>

        {/* =================================================
            COVERAGE AREAS
        ================================================= */}

        <section className="about-container about-regions-section">

          <div className="about-region-card">

            <div className="about-region-content">

              <span className="about-kicker">
                OUR COVERAGE
              </span>

              <h2>
                From Hyderabad
                to the world
              </h2>

              <p>
                Democratic News brings together stories
                from local communities, Telangana,
                India, the Middle East and international
                developments.
              </p>

              <Link
                to="/latest"
                className="about-primary-button"
              >
                Read Latest Stories →
              </Link>

            </div>

            <div className="about-region-list">

              <div>
                <strong>01</strong>
                <span>Hyderabad</span>
              </div>

              <div>
                <strong>02</strong>
                <span>Telangana</span>
              </div>

              <div>
                <strong>03</strong>
                <span>India</span>
              </div>

              <div>
                <strong>04</strong>
                <span>World</span>
              </div>

              <div>
                <strong>05</strong>
                <span>Middle East</span>
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            CONTACT CTA
        ================================================= */}

        <section className="about-contact-section">

          <div className="about-container about-contact-inner">

            <div>

              <span>
                GET IN TOUCH
              </span>

              <h2>
                Have a question,
                suggestion or story?
              </h2>

              <p>
                We would like to hear from you.
                Contact Democratic News for general
                enquiries, feedback and information.
              </p>

            </div>

            <Link
              to="/contact"
              className="about-contact-button"
            >
              Contact Democratic News →
            </Link>

          </div>

        </section>

      </main>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="about-footer">

        <div className="about-container about-footer-grid">

          <div className="about-footer-brand">

            <div className="about-footer-logo-row">

              <div className="about-footer-logo">
                DN
              </div>

              <div>

                <h2>
                  Democratic News
                </h2>

                <span>
                  Independent News &amp; Information
                </span>

              </div>

            </div>

            <p>
              Your source for news, information and
              updates from Hyderabad, Telangana,
              India and around the world.
            </p>

            <div className="about-footer-tagline">
              Truth • Information • Public Voice
            </div>

          </div>

          <div className="about-footer-column">

            <h3>
              Quick Links
            </h3>

            <Link to="/">
              Home
            </Link>

            <Link to="/latest">
              Latest News
            </Link>

            <Link to="/epaper">
              E-Paper
            </Link>

            <Link to="/contact">
              Contact
            </Link>

          </div>

          <div className="about-footer-column">

            <h3>
              Categories
            </h3>

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

            <Link to="/category/middle%20east">
              Middle East
            </Link>

          </div>

          <div className="about-footer-column">

            <h3>
              More News
            </h3>

            <Link to="/category/business">
              Business
            </Link>

            <Link to="/category/sports">
              Sports
            </Link>

            <Link to="/category/technology">
              Technology
            </Link>

            <Link to="/category/health">
              Health
            </Link>

          </div>

        </div>

        <div className="about-footer-bottom">

          <div className="about-container about-footer-bottom-inner">

            <span>
              © {currentYear} Democratic News.
              All rights reserved.
            </span>

            <span>
              Independent News &amp; Information
            </span>

          </div>

        </div>

      </footer>

    </div>
  );
}

export default About;