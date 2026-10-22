import { Link } from "react-router-dom";

import "../styles/contact.css";

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
   CONTACT PAGE
========================================================= */

function Contact() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="contact-page">

      {/* ===================================================
          TOP BAR
      =================================================== */}

      <div className="contact-top-bar">

        <div className="contact-container contact-top-inner">

          <div className="contact-trending">

            <strong>Trending:</strong>

            <span>
              Latest news and important updates from
              Hyderabad, Telangana, India and the world
            </span>

          </div>

          <div className="contact-date">

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

      <header className="contact-header">

        <div className="contact-container contact-main-header">

          <Link
            to="/"
            className="contact-brand"
          >

            <div className="contact-brand-mark">

              <img
                src="/logo.png"
                alt="Democratic News Logo"
              />

            </div>

            <div className="contact-brand-copy">

              <div className="contact-brand-name">
                DEMOCRATIC NEWS
              </div>

              <div className="contact-brand-tagline">
                India • Telangana • Hyderabad • World
              </div>

            </div>

          </Link>

          <div className="contact-header-actions">

            <Link
              to="/search"
              className="contact-search-button"
            >
              <span>⌕</span>
              Search
            </Link>

            <Link
              to="/epaper"
              className="contact-epaper-button"
            >
              E-Paper
            </Link>

          </div>

        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="contact-nav">

          <div className="contact-container contact-nav-scroll">

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

      <section className="contact-breaking">

        <div className="contact-container contact-breaking-inner">

          <div className="contact-breaking-label">

            <span></span>

            BREAKING NEWS

          </div>

          <div className="contact-breaking-text">

            Latest developments from Hyderabad,
            Telangana, India and around the world

          </div>

          <Link
            to="/latest"
            className="contact-breaking-link"
          >
            View Latest →
          </Link>

        </div>

      </section>

      {/* ===================================================
          PAGE HERO
      =================================================== */}

      <main>

        <section className="contact-container contact-hero">

          <div className="contact-hero-content">

            <span className="contact-kicker">
              GET IN TOUCH
            </span>

            <h1>
              Contact
              <span> Democratic News</span>
            </h1>

            <p>
              Have a question, suggestion, feedback or
              information to share? We would like to
              hear from you.
            </p>

            <p>
              Use the contact options below to reach
              Democratic News.
            </p>

          </div>

          <div className="contact-hero-card">

            <div className="contact-hero-icon">
              DN
            </div>

            <h2>
              Democratic News
            </h2>

            <p>
              India • Telangana • Hyderabad • World
            </p>

            <div className="contact-hero-line"></div>

            <span>
              News • Information • Public Voice
            </span>

          </div>

        </section>

        {/* =================================================
            CONTACT OPTIONS
        ================================================= */}

        <section className="contact-container contact-options">

          <div className="contact-section-heading">

            <span>
              CONTACT INFORMATION
            </span>

            <h2>
              How can we help?
            </h2>

          </div>

          <div className="contact-options-grid">

            <article className="contact-info-card">

              <div className="contact-info-number">
                01
              </div>

              <div className="contact-info-icon">
                ✉
              </div>

              <h3>
                General Enquiries
              </h3>

              <p>
                For general questions, website feedback
                and other enquiries, contact the
                Democratic News team.
              </p>

              <div className="contact-info-detail">
                Email us through your official newsroom
                contact address.
              </div>

            </article>

            <article className="contact-info-card">

              <div className="contact-info-number">
                02
              </div>

              <div className="contact-info-icon">
                ✎
              </div>

              <h3>
                News &amp; Story Tips
              </h3>

              <p>
                Have information about a local event,
                development or story that may be useful
                to readers?
              </p>

              <div className="contact-info-detail">
                Send the relevant details to the
                Democratic News team.
              </div>

            </article>

            <article className="contact-info-card">

              <div className="contact-info-number">
                03
              </div>

              <div className="contact-info-icon">
                ?
              </div>

              <h3>
                Feedback
              </h3>

              <p>
                Tell us about your experience using
                Democratic News or suggest improvements
                for the website.
              </p>

              <div className="contact-info-detail">
                Reader feedback helps us improve the
                platform.
              </div>

            </article>

          </div>

        </section>

        {/* =================================================
            CONTACT FORM
        ================================================= */}

        <section className="contact-form-section">

          <div className="contact-container contact-form-layout">

            <div className="contact-form-intro">

              <span className="contact-kicker">
                SEND A MESSAGE
              </span>

              <h2>
                Write to us
              </h2>

              <p>
                Fill in the form and provide your message.
                This form is currently prepared for the
                Democratic News contact workflow.
              </p>

              <div className="contact-form-note">

                <strong>
                  Important
                </strong>

                <span>
                  Please provide accurate contact details
                  so the team can respond when required.
                </span>

              </div>

            </div>

            <form
              className="contact-form"
              onSubmit={(event) => {
                event.preventDefault();

                alert(
                  "Thank you for contacting Democratic News. The contact form will be connected to the backend in the next integration step."
                );
              }}
            >

              <div className="contact-form-row">

                <div className="contact-field">

                  <label htmlFor="contact-name">
                    Your Name
                  </label>

                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                    required
                  />

                </div>

                <div className="contact-field">

                  <label htmlFor="contact-email">
                    Email Address
                  </label>

                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                  />

                </div>

              </div>

              <div className="contact-field">

                <label htmlFor="contact-subject">
                  Subject
                </label>

                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  placeholder="What would you like to discuss?"
                  required
                />

              </div>

              <div className="contact-field">

                <label htmlFor="contact-message">
                  Message
                </label>

                <textarea
                  id="contact-message"
                  name="message"
                  rows="7"
                  placeholder="Write your message here..."
                  required
                ></textarea>

              </div>

              <button
                type="submit"
                className="contact-submit-button"
              >
                Send Message →
              </button>

            </form>

          </div>

        </section>

        {/* =================================================
            COVERAGE
        ================================================= */}

        <section className="contact-container contact-coverage">

          <div className="contact-section-heading centered">

            <span>
              OUR COVERAGE
            </span>

            <h2>
              From local stories to
              global developments
            </h2>

            <p>
              Explore the sections of Democratic News.
            </p>

          </div>

          <div className="contact-coverage-grid">

            {categories.map((category, index) => (

              <Link
                key={category}
                to={getCategoryPath(category)}
                className="contact-coverage-card"
              >

                <span>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <strong>
                  {category}
                </strong>

                <small>
                  Explore →
                </small>

              </Link>

            ))}

          </div>

        </section>

        {/* =================================================
            QUICK LINKS CTA
        ================================================= */}

        <section className="contact-cta">

          <div className="contact-container contact-cta-inner">

            <div>

              <span>
                DEMOCRATIC NEWS
              </span>

              <h2>
                Looking for the latest
                news?
              </h2>

              <p>
                Browse the latest stories from Hyderabad,
                Telangana, India and around the world.
              </p>

            </div>

            <div className="contact-cta-buttons">

              <Link
                to="/latest"
                className="contact-primary-button"
              >
                Latest News →
              </Link>

              <Link
                to="/search"
                className="contact-secondary-button"
              >
                Search News
              </Link>

            </div>

          </div>

        </section>

      </main>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="contact-footer">

        <div className="contact-container contact-footer-grid">

          <div className="contact-footer-brand">

            <div className="contact-footer-logo-row">

              <div className="contact-footer-logo">
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

            <div className="contact-footer-tagline">
              Truth • Information • Public Voice
            </div>

          </div>

          <div className="contact-footer-column">

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
              About Us
            </Link>

            <Link to="/epaper">
              E-Paper
            </Link>

          </div>

          <div className="contact-footer-column">

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

          <div className="contact-footer-column">

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

        <div className="contact-footer-bottom">

          <div className="contact-container contact-footer-bottom-inner">

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

export default Contact;