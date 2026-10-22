import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { auth } from "../firebaseAuth";
import { storage } from "../firebaseStorage";

import {
  addNews,
  getAllNews,
  updateNews,
  deleteNews,
} from "../services/newsService";

import RssManagement from "../components/RssManagement";
import EpaperManagement from "../components/EpaperManagement";


function AdminDashboard() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [selectedNewsIds, setSelectedNewsIds] = useState([]);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const emptyForm = {
    title: "",
    slug: "",
    category: "Hyderabad",
    image: "",
    excerpt: "",
    content: "",
    author: "Democratic News",
    source: "Democratic News",
    breaking: false,
    publishedAt: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    try {
      setLoading(true);
      setError("");

      const data = await getAllNews();
      setNewsList(data);
    } catch (err) {
      console.error("News loading failed:", err);
      setError("News load nahi ho paayi.");
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

  function createSlug(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function handleTitleChange(event) {
    const title = event.target.value;

    setForm((previous) => ({
      ...previous,
      title,
      slug: editingId ? previous.slug : createSlug(title),
    }));
  }

  function handleImageSelect(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size 5MB se kam honi chahiye.");
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  async function uploadImage() {
    if (!imageFile) {
      return form.image;
    }

    try {
      setUploadingImage(true);
      setError("");

      const safeFileName = imageFile.name
        .replace(/[^a-zA-Z0-9.-]/g, "-")
        .toLowerCase();

      const fileName = `${Date.now()}-${safeFileName}`;

      const storageRef = ref(
        storage,
        `news/${fileName}`
      );

      await uploadBytes(storageRef, imageFile);

      const downloadURL = await getDownloadURL(storageRef);

      setForm((previous) => ({
        ...previous,
        image: downloadURL,
      }));

      return downloadURL;
    } catch (err) {
      console.error("Image upload failed:", err);
      throw new Error("Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!form.title.trim()) {
        setError("Title required hai.");
        return;
      }

      if (!form.content.trim()) {
        setError("Full content required hai.");
        return;
      }

      let imageURL = form.image;

      if (imageFile) {
        imageURL = await uploadImage();
      }

      const newsData = {
        title: form.title.trim(),
        slug: form.slug.trim() || createSlug(form.title),
        category: form.category,
        image: imageURL || "",
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        author: form.author.trim() || "Democratic News",
        source: form.source.trim() || "Democratic News",
        breaking: form.breaking,
        publishedAt:
          form.publishedAt || new Date().toISOString(),
      };

      if (editingId) {
        await updateNews(editingId, newsData);
        setMessage("News successfully updated.");
      } else {
        await addNews(newsData);
        setMessage("News successfully published.");
      }

      resetForm();
      await loadNews();
    } catch (err) {
      console.error("Saving news failed:", err);
      setError(
        err.message || "News save nahi ho paayi. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(news) {
    setEditingId(news.id);

    setForm({
      title: news.title || "",
      slug: news.slug || "",
      category: news.category || "Hyderabad",
      image: news.image || "",
      excerpt: news.excerpt || "",
      content: news.content || "",
      author: news.author || "Democratic News",
      source: news.source || "Democratic News",
      breaking: Boolean(news.breaking),
      publishedAt: news.publishedAt || "",
    });

    setImageFile(null);
    setImagePreview(news.image || "");

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
  }

  function cancelEdit() {
    resetForm();
    setMessage("");
    setError("");
  }

  function toggleNewsSelection(id) {
    setSelectedNewsIds((previous) =>
      previous.includes(id)
        ? previous.filter((newsId) => newsId !== id)
        : [...previous, id]
    );
  }

  function toggleSelectAllNews() {
    if (selectedNewsIds.length === newsList.length) {
      setSelectedNewsIds([]);
      return;
    }

    setSelectedNewsIds(newsList.map((news) => news.id));
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this news?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await deleteNews(id);

      setNewsList((previous) =>
        previous.filter((news) => news.id !== id)
      );
      setSelectedNewsIds((previous) =>
        previous.filter((newsId) => newsId !== id)
      );

      setMessage("News deleted successfully.");

      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setError("News delete nahi ho paayi.");
    }
  }

  async function handleDeleteSelected() {
    if (selectedNewsIds.length === 0) return;

    const confirmed = window.confirm(
      `Do you want to delete ${selectedNewsIds.length} selected news items?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      setSaving(true);

      await Promise.all(
        selectedNewsIds.map((id) => deleteNews(id))
      );

      setNewsList((previous) =>
        previous.filter((news) => !selectedNewsIds.includes(news.id))
      );
      setSelectedNewsIds([]);

      if (selectedNewsIds.includes(editingId)) {
        resetForm();
      }

      setMessage(
        `${selectedNewsIds.length} news successfully deleted.`
      );
    } catch (err) {
      console.error("Bulk delete failed:", err);
      setError("Selected news delete nahi ho paayi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await auth.signOut();
      window.location.href = "/admin/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  function formatDate(news) {
    if (news.createdAt?.toDate) {
      return news.createdAt.toDate().toLocaleString("en-IN");
    }

    if (news.publishedAt) {
      const date = new Date(news.publishedAt);

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString("en-IN");
      }
    }

    return "Recently";
  }

  const currentUser = auth.currentUser;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F7F2",
        fontFamily: "Arial, sans-serif",
        color: "#0b1f33",
      }}
    >
      {/* ================= HEADER ================= */}

      <header
        style={{
          background: "#0b1f33",
          color: "#fff",
          padding: "18px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1250px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <img
              src="/logo.png"
              alt="Democratic News"
              style={{
                width: "48px",
                height: "48px",
                objectFit: "contain",
                background: "#fff",
                borderRadius: "8px",
              }}
            />

            <div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "900",
                }}
              >
                DEMOCRATIC NEWS
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#d7dee7",
                  marginTop: "3px",
                }}
              >
                Admin Dashboard
              </div>
            </div>
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "#d7dee7",
              }}
            >
              {currentUser?.email || "Admin"}
            </span>

            <Link
              to="/"
              style={{
                color: "#fff",
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "9px 14px",
                borderRadius: "7px",
              }}
            >
              Website
            </Link>

            <button
              onClick={handleLogout}
              style={{
                border: "none",
                background: "#D4A72C",
                color: "#0b1f33",
                padding: "9px 14px",
                borderRadius: "7px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}

      <main
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
          padding: "35px 20px 60px",
        }}
      >
        <div style={{ marginBottom: "30px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "800",
              color: "#D4A72C",
              letterSpacing: "1.5px",
              marginBottom: "7px",
            }}
          >
            ADMINISTRATION
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
            }}
          >
            {editingId ? "Edit News" : "Publish News"}
          </h1>

          <p
            style={{
              color: "#687789",
              marginTop: "8px",
            }}
          >
            Manage Democratic News articles from one place.
          </p>
        </div>

        {/* ================= MESSAGES ================= */}

        {message && (
          <div
            style={{
              background: "#ecfdf3",
              color: "#067647",
              padding: "13px 15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fff1f0",
              color: "#b42318",
              padding: "13px 15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* ================= NEWS FORM ================= */}

        <EpaperManagement />

        <section
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "28px",
            boxShadow:
              "0 5px 20px rgba(15, 23, 42, 0.07)",
            marginBottom: "40px",
          }}
        >
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "20px",
              }}
            >
              {/* TITLE */}

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>
                  Title *
                </label>

                <input
                  name="title"
                  value={form.title}
                  onChange={handleTitleChange}
                  placeholder="Enter news headline"
                  required
                  style={inputStyle}
                />
              </div>

              {/* SLUG */}

              <div>
                <label style={labelStyle}>
                  Slug
                </label>

                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="news-headline-slug"
                  style={inputStyle}
                />
              </div>

              {/* CATEGORY */}

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
                  <option>Hyderabad</option>
                  <option>Telangana</option>
                  <option>India</option>
                  <option>World</option>
                  <option>Middle East</option>
                  <option>Business</option>
                  <option>Education</option>
                  <option>Sports</option>
                  <option>Technology</option>
                  <option>Entertainment</option>
                  <option>Health</option>
                </select>
              </div>

              {/* IMAGE UPLOAD */}

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>
                  News Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    border: "1px solid #d6dce3",
                    borderRadius: "8px",
                    background: "#fff",
                  }}
                />

                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#687789",
                    fontSize: "12px",
                  }}
                >
                  JPG, PNG, WEBP — maximum 5MB
                </p>

                {imagePreview && (
                  <div
                    style={{
                      marginTop: "15px",
                      position: "relative",
                      width: "260px",
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="News preview"
                      style={{
                        width: "260px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </div>
                )}

                {uploadingImage && (
                  <p
                    style={{
                      color: "#D4A72C",
                      fontWeight: "700",
                      marginTop: "8px",
                    }}
                  >
                    Uploading image...
                  </p>
                )}

                {/* Existing image URL fallback */}

                <details
                  style={{
                    marginTop: "12px",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      color: "#0b1f33",
                      fontWeight: "700",
                      fontSize: "13px",
                    }}
                  >
                    Or use Image URL
                  </summary>

                  <input
                    name="image"
                    value={form.image}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    style={{
                      ...inputStyle,
                      marginTop: "10px",
                    }}
                  />
                </details>
              </div>

              {/* EXCERPT */}

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>
                  Excerpt
                </label>

                <textarea
                  name="excerpt"
                  value={form.excerpt}
                  onChange={handleChange}
                  placeholder="Short summary of the news..."
                  rows="3"
                  style={textareaStyle}
                />
              </div>

              {/* CONTENT */}

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>
                  Full Content *
                </label>

                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="Write the complete news article here..."
                  rows="10"
                  required
                  style={textareaStyle}
                />
              </div>

              {/* AUTHOR */}

              <div>
                <label style={labelStyle}>
                  Author
                </label>

                <input
                  name="author"
                  value={form.author}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              {/* SOURCE */}

              <div>
                <label style={labelStyle}>
                  Source
                </label>

                <input
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              {/* BREAKING */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  paddingTop: "25px",
                }}
              >
                <input
                  type="checkbox"
                  name="breaking"
                  checked={form.breaking}
                  onChange={handleChange}
                  id="breaking"
                  style={{
                    width: "18px",
                    height: "18px",
                  }}
                />

                <label
                  htmlFor="breaking"
                  style={{
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  Breaking News
                </label>
              </div>
            </div>

            {/* BUTTONS */}

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "25px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={saving || uploadingImage}
                style={{
                  border: "none",
                  background: "#0b1f33",
                  color: "#fff",
                  padding: "13px 22px",
                  borderRadius: "8px",
                  fontWeight: "800",
                  cursor:
                    saving || uploadingImage
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    saving || uploadingImage ? 0.7 : 1,
                }}
              >
                {uploadingImage
                  ? "Uploading Image..."
                  : saving
                  ? "Saving..."
                  : editingId
                  ? "Update News"
                  : "Publish News"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{
                    border: "1px solid #ccd3dc",
                    background: "#fff",
                    color: "#0b1f33",
                    padding: "13px 22px",
                    borderRadius: "8px",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ================= RSS MANAGEMENT ================= */}

        <RssManagement />

        {/* ================= PUBLISHED NEWS ================= */}

        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "24px",
                }}
              >
                Published News
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#687789",
                }}
              >
                {newsList.length} article
                {newsList.length === 1 ? "" : "s"}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {newsList.length > 0 && (
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
                      newsList.length > 0 &&
                      selectedNewsIds.length === newsList.length
                    }
                    onChange={toggleSelectAllNews}
                  />
                  Select all
                </label>
              )}

              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedNewsIds.length === 0 || saving}
                style={{
                  border: "none",
                  background:
                    selectedNewsIds.length === 0 ? "#dfe6ee" : "#b42318",
                  color:
                    selectedNewsIds.length === 0 ? "#7b8794" : "#fff",
                  padding: "10px 16px",
                  borderRadius: "7px",
                  cursor:
                    selectedNewsIds.length === 0 || saving
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "700",
                }}
              >
                Delete Selected ({selectedNewsIds.length})
              </button>

              <button
                onClick={loadNews}
                style={{
                  border: "1px solid #ccd3dc",
                  background: "#fff",
                  padding: "10px 16px",
                  borderRadius: "7px",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                background: "#fff",
                padding: "40px",
                textAlign: "center",
                borderRadius: "12px",
              }}
            >
              Loading news...
            </div>
          ) : newsList.length === 0 ? (
            <div
              style={{
                background: "#fff",
                padding: "40px",
                textAlign: "center",
                borderRadius: "12px",
              }}
            >
              No news published yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "15px",
              }}
            >
              {newsList.map((news) => (
                <article
                  key={news.id}
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "20px",
                    boxShadow:
                      "0 4px 15px rgba(15, 23, 42, 0.06)",
                    display: "flex",
                    gap: "20px",
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
                      checked={selectedNewsIds.includes(news.id)}
                      onChange={() => toggleNewsSelection(news.id)}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                  </label>

                  {news.image ? (
                    <img
                      src={news.image}
                      alt={news.title}
                      style={{
                        width: "150px",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        background: "#eee",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "150px",
                        height: "100px",
                        borderRadius: "8px",
                        background: "#eef1f4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#687789",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      NO IMAGE
                    </div>
                  )}

                  <div
                    style={{
                      flex: "1 1 400px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: "7px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "800",
                          color: "#D4A72C",
                          textTransform: "uppercase",
                        }}
                      >
                        {news.category || "News"}
                      </span>

                      {news.breaking && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            background: "#b42318",
                            color: "#fff",
                            padding: "4px 7px",
                            borderRadius: "4px",
                          }}
                        >
                          BREAKING
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        margin: "0 0 7px",
                        fontSize: "20px",
                      }}
                    >
                      {news.title || "Untitled News"}
                    </h3>

                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "#687789",
                        lineHeight: 1.5,
                      }}
                    >
                      {news.excerpt ||
                        news.content?.slice(0, 180) ||
                        "No description available."}
                    </p>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#7b8794",
                      }}
                    >
                      {formatDate(news)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={() => handleEdit(news)}
                      style={{
                        border: "1px solid #0b1f33",
                        background: "#fff",
                        color: "#0b1f33",
                        padding: "9px 14px",
                        borderRadius: "7px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(news.id)}
                      style={{
                        border: "none",
                        background: "#b42318",
                        color: "#fff",
                        padding: "9px 14px",
                        borderRadius: "7px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
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
  fontSize: "15px",
  outline: "none",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical",
  lineHeight: 1.5,
};

export default AdminDashboard;