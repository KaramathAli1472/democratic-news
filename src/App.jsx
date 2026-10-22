import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Home = lazy(() => import("./pages/Home"));
const Latest = lazy(() => import("./pages/LatestNews"));
const Category = lazy(() => import("./pages/Category"));
const NewsDetails = lazy(() => import("./pages/NewsDetails"));
const Search = lazy(() => import("./pages/Search"));
const Epaper = lazy(() => import("./pages/Epaper"));
const EpaperArchive = lazy(() => import("./pages/EpaperArchive"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ProtectedAdminRoute = lazy(() =>
  import("./components/ProtectedAdminRoute")
);

// ================= TEMP TEST =================

// ================= GLOBAL STYLES =================
import "./styles/global.css";

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div role="status">Loading page...</div>}>
        <Routes>

        {/* ================= HOME ================= */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* ================= LATEST NEWS ================= */}
        <Route
          path="/latest"
          element={<Latest />}
        />

        {/* ================= CATEGORY ================= */}
        <Route
          path="/category/:category"
          element={<Category />}
        />

        {/* ================= NEWS DETAILS ================= */}
        <Route
          path="/news/:id"
          element={<NewsDetails />}
        />

        {/* ================= SEARCH ================= */}
        <Route
          path="/search"
          element={<Search />}
        />

        {/* ================= E-PAPER ================= */}
        <Route
          path="/epaper"
          element={<Epaper />}
        />

        {/* ================= E-PAPER ARCHIVE ================= */}
        <Route
          path="/epaper/archive"
          element={<EpaperArchive />}
        />

        {/* ================= ABOUT ================= */}
        <Route
          path="/about"
          element={<About />}
        />

        {/* ================= CONTACT ================= */}
        <Route
          path="/contact"
          element={<Contact />}
        />

        {/* ================================================= */}
        {/* ================= ADMIN LOGIN =================== */}
        {/* ================================================= */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        {/* ================================================= */}
        {/* ================ PROTECTED ADMIN ================= */}
        {/* ================================================= */}

        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />

        {/* ================= TEMP NEWS TEST ================= */}
        {/* Baad mein remove kar denge */}
        

        {/* ================= 404 ================= */}
        <Route
          path="*"
          element={<NotFound />}
        />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;