import { Link } from "react-router-dom";
import "../styles/notFound.css";

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
  `/category/${encodeURIComponent(category.toLowerCase())}`;

function NotFound() {
  return (
    <div className="notfound-page">
      {/* Top Trending Bar */}
      <div className="notfound-trending">
        <div className="notfound-container">
          <div className="notfound-trending-inner">
            <span className="notfound-trending-label">Trending :</span>

            <Link to="/latest">Latest News</Link>
            <Link to="/category/hyderabad">Hyderabad</Link>
            <Link to="/category/india">India</Link>
            <Link to="/category/world">World</Link>
            <Link to="/category/technology">Technology</Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="notfound-header">
        <div className="notfound-container">
          <div className="notfound-header-inner">
            <Link to="/" className="notfound-logo-link">
              <img
                src="/logo.png"
                alt="Democratic News"
                className="notfound-logo"
              />
            </Link>

            <div className="notfound-header-text">
              <div className="notfound-brand-name">DEMOCRATIC NEWS</div>
              <div className="notfound-tagline">
                India • Telangana • Hyderabad • World
              </div>
            </div>

            <div className="notfound-header-actions">
              <Link to="/search" className="notfound-header-link">
                Search
              </Link>

              <Link to="/epaper" className="notfound-epaper-button">
                E-Paper
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="notfound-nav">
        <div className="notfound-container">
          <div className="notfound-nav-inner">
            <Link to="/" className="notfound-nav-link active">
              Home
            </Link>

            <Link to="/latest" className="notfound-nav-link">
              Latest
            </Link>

            {categories.map((category) => (
              <Link
                key={category}
                to={getCategoryPath(category)}
                className="notfound-nav-link"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Breaking Bar */}
      <div className="notfound-breaking">
        <div className="notfound-container">
          <div className="notfound-breaking-inner">
            <span className="notfound-breaking-label">BREAKING</span>

            <div className="notfound-breaking-text">
              Stay updated with the latest news from Democratic News
            </div>
          </div>
        </div>
      </div>

      {/* Main 404 */}
      <main className="notfound-main">
        <div className="notfound-container">
          <section className="notfound-content">
            <div className="notfound-number">404</div>

            <div className="notfound-divider"></div>

            <h1>Page Not Found</h1>

            <p>
              The page you are looking for may have been moved, removed, or
              temporarily unavailable.
            </p>

            <div className="notfound-buttons">
              <Link to="/" className="notfound-primary-button">
                Go to Home
              </Link>

              <Link to="/latest" className="notfound-secondary-button">
                Latest News
              </Link>
            </div>
          </section>

          {/* Quick Links */}
          <section className="notfound-quick-links">
            <div className="notfound-section-heading">
              <span>Explore Democratic News</span>
            </div>

            <div className="notfound-category-grid">
              {categories.map((category) => (
                <Link
                  key={category}
                  to={getCategoryPath(category)}
                  className="notfound-category-card"
                >
                  <span>{category}</span>
                  <span className="notfound-arrow">→</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="notfound-footer">
        <div className="notfound-container">
          <div className="notfound-footer-grid">
            <div className="notfound-footer-about">
              <img
                src="/logo.png"
                alt="Democratic News"
                className="notfound-footer-logo"
              />

              <h3>DEMOCRATIC NEWS</h3>

              <p>
                Independent digital news coverage from Hyderabad, Telangana,
                India and around the world.
              </p>
            </div>

            <div>
              <h4>Quick Links</h4>

              <div className="notfound-footer-links">
                <Link to="/">Home</Link>
                <Link to="/latest">Latest News</Link>
                <Link to="/search">Search</Link>
                <Link to="/about">About</Link>
                <Link to="/contact">Contact</Link>
              </div>
            </div>

            <div>
              <h4>Categories</h4>

              <div className="notfound-footer-links">
                <Link to="/category/hyderabad">Hyderabad</Link>
                <Link to="/category/telangana">Telangana</Link>
                <Link to="/category/india">India</Link>
                <Link to="/category/world">World</Link>
                <Link to="/category/middle%20east">Middle East</Link>
              </div>
            </div>

            <div>
              <h4>More</h4>

              <div className="notfound-footer-links">
                <Link to="/category/business">Business</Link>
                <Link to="/category/technology">Technology</Link>
                <Link to="/category/sports">Sports</Link>
                <Link to="/epaper">E-Paper</Link>
              </div>
            </div>
          </div>

          <div className="notfound-footer-bottom">
            <span>
              © {new Date().getFullYear()} Democratic News. All rights
              reserved.
            </span>

            <span>India • Telangana • Hyderabad • World</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default NotFound;