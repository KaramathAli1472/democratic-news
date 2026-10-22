
import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth } from "../firebaseAuth";
import { db } from "../firebase";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAPPING_URL = import.meta.env.VITE_EPAPER_MAPPING_URL;

const MAX_PDF_SIZE = 10 * 1024 * 1024;
const JPEG_QUALITY = 0.82;
const RENDER_SCALE = 1.35;

function detectEditionDate(filename) {
  let match = filename.match(/(20\d{2})[-_](\d{2})[-_](\d{2})/);

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  match = filename.match(
    /(?:^|[^\d])(\d{2})[-_](\d{2})[-_](20\d{2})(?:[^\d]|$)/
  );

  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return "";
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("PDF page ko JPG mein convert nahi kiya ja saka."));
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

async function uploadJpgToCloudinary(blob, date, pageNumber, batchId) {
  const formData = new FormData();

  formData.append("file", blob, `page-${pageNumber}.jpg`);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "epapers");
  formData.append(
    "public_id",
    `democratic-news-${date}-${batchId}-page-${pageNumber}`
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error(`Cloudinary page ${pageNumber} error:`, result);

    throw new Error(
      result.error?.message ||
        `Page ${pageNumber} upload nahi hui (HTTP ${response.status}).`
    );
  }

  if (!result.secure_url || !result.public_id) {
    throw new Error(`Cloudinary ne page ${pageNumber} ki URL nahi di.`);
  }

  return {
    pageNumber,
    imageUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width || null,
    height: result.height || null,
  };
}

export default function EpaperManagement() {
  const [title, setTitle] = useState("Democratic News");
  const [editionDate, setEditionDate] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [mappingId, setMappingId] = useState("");
  const [mappingProgress, setMappingProgress] = useState("");
  const [mappingError, setMappingError] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadEditions();
  }, []);

  async function loadEditions() {
    setLoading(true);
    setError("");

    try {
      const snapshot = await getDocs(collection(db, "epapers"));

      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      items.sort((a, b) =>
        String(b.editionDate || "").localeCompare(
          String(a.editionDate || "")
        )
      );

      setEditions(items);
    } catch (err) {
      console.error("E-Paper list error:", err);
      setError(`List load nahi hui: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setError("");
    setMessage("");
    setProgress("");

    if (!file) {
      setPdfFile(null);
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setPdfFile(null);
      setError("Sirf PDF file select karein.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      setPdfFile(null);
      setError("PDF maximum 10 MB ki honi chahiye.");
      event.target.value = "";
      return;
    }

    setPdfFile(file);

    const detectedDate = detectEditionDate(file.name);

    if (detectedDate && isValidDate(detectedDate)) {
      setEditionDate(detectedDate);
      setMessage(
        `Filename se date mili: ${formatDate(detectedDate)}. Date confirm karein.`
      );
    } else {
      setEditionDate("");
      setMessage("Edition date khud select karein.");
    }
  }

  async function convertPdfToJpgPages(file, date) {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error(
        ".env mein VITE_CLOUDINARY_CLOUD_NAME aur VITE_CLOUDINARY_UPLOAD_PRESET set karein."
      );
    }

    setProgress("PDF kholi ja rahi hai...");

    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    const pages = [];
    const batchId = `${Date.now()}`;

    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setProgress(
          `Page ${pageNumber}/${pdf.numPages}: JPG ban rahi hai...`
        );

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas available nahi hai.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const jpegBlob = await canvasToJpeg(canvas);

        // Canvas ki memory release karein.
        canvas.width = 0;
        canvas.height = 0;

        if (jpegBlob.size > MAX_PDF_SIZE) {
          throw new Error(
            `Page ${pageNumber} ki JPG 10 MB se badi hai. PDF ko lower quality mein export karein.`
          );
        }

        setProgress(
          `Page ${pageNumber}/${pdf.numPages}: Cloudinary par JPG upload ho rahi hai...`
        );

        const uploadedPage = await uploadJpgToCloudinary(
          jpegBlob,
          date,
          pageNumber,
          batchId
        );

        pages.push(uploadedPage);
        page.cleanup();
      }

      return pages;
     } finally {
    await loadingTask.destroy();
  }
  }

  async function handleUpload(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setProgress("");

    if (!pdfFile) {
      setError("Pehle newspaper ki PDF select karein.");
      return;
    }

    if (!title.trim()) {
      setError("Edition title likhein.");
      return;
    }

    if (!isValidDate(editionDate)) {
      setError("Sahi edition date select karein.");
      return;
    }

    setUploading(true);

    try {
      const duplicateQuery = query(
        collection(db, "epapers"),
        where("editionDate", "==", editionDate)
      );

      const duplicateSnapshot = await getDocs(duplicateQuery);

      if (!duplicateSnapshot.empty) {
        setError(`${formatDate(editionDate)} ka edition pehle se maujood hai.`);
        return;
      }

      const pages = await convertPdfToJpgPages(pdfFile, editionDate);

      if (!pages.length) {
        throw new Error("PDF mein koi page nahi mila.");
      }

      pages.sort((a, b) => a.pageNumber - b.pageNumber);

      setProgress("JPG pages Firestore mein save ho rahe hain...");

      await addDoc(collection(db, "epapers"), {
        title: title.trim(),
        editionDate,
        pages,
        pageCount: pages.length,
        originalFileName: pdfFile.name,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setPdfFile(null);
      setTitle("Democratic News");
      setEditionDate("");

      const input = document.getElementById("epaper-pdf-file");
      if (input) input.value = "";

      setMessage(
        `Kamyaab! ${pages.length} pages JPG mein convert aur upload ho gaye. Edition Draft mein save hai.`
      );
      setProgress("");

      await loadEditions();
    } catch (err) {
      console.error("E-Paper conversion/upload failed:", err);
      setError(
        `${err.message || "Upload fail hui."} Agar kuch JPG pehle upload ho chuki hain, woh Cloudinary mein reh sakti hain.`
      );
      setProgress("");
    } finally {
      setUploading(false);
    }
  }

  async function changeStatus(edition, newStatus) {
    const action =
      newStatus === "published" ? "publish" : "draft mein bhejein";

    if (
      !window.confirm(
        `"${edition.title || "Democratic News"}" (${formatDate(
          edition.editionDate
        )}) ko ${action}?`
      )
    ) {
      return;
    }

    setSavingId(edition.id);
    setError("");
    setMessage("");

    try {
      await updateDoc(doc(db, "epapers", edition.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      setMessage(
        newStatus === "published"
          ? "E-Paper publish ho gaya."
          : "E-Paper draft mein aa gaya."
      );

      await loadEditions();
    } catch (err) {
      console.error("E-Paper status error:", err);
      setError(`Status update nahi hua: ${err.message}`);
    } finally {
      setSavingId("");
    }
  }

  async function autoMapEdition(edition) {
    setMappingError(null);

    if (!MAPPING_URL) {
      setMappingError({
        editionId: edition.id,
        message:
          "Auto-mapping abhi configure nahi hai. Cloudflare Worker deploy karke VITE_EPAPER_MAPPING_URL set karein, phir frontend restart/redeploy karein.",
      });
      return;
    }

    if (!Array.isArray(edition.pages) || edition.pages.length === 0) {
      setMappingError({
        editionId: edition.id,
        message: "Is edition mein map karne ke liye JPG pages nahi hain.",
      });
      return;
    }

    setMappingId(edition.id);
    setMappingProgress("Existing news headlines load ho rahi hain...");
    setError("");
    setMessage("");

    try {
      const newsSnapshot = await getDocs(collection(db, "news"));
      const newsCandidates = newsSnapshot.docs
        .map((item) => {
          const news = item.data();
          return {
            id: item.id,
            title: String(news.title || "").trim(),
            category: String(news.category || "").trim(),
          };
        })
        .filter((news) => news.title)
        .slice(0, 100);

      if (newsCandidates.length === 0) {
        throw new Error("Existing News collection mein koi headline nahi mili.");
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error("Admin login expire ho gaya. Dobara login karein.");
      }
      const idToken = await user.getIdToken();
      const pages = edition.pages.map((page) => ({ ...page })).sort(
        (a, b) => a.pageNumber - b.pageNumber
      );
      let totalStories = 0;

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        setMappingProgress(
          `Page ${index + 1}/${pages.length}: news detect aur match ho rahi hain...`
        );
        const response = await fetch(MAPPING_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: page.imageUrl,
            news: newsCandidates,
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || `Page ${page.pageNumber} mapping fail hui.`
          );
        }
        if (!Array.isArray(result.stories)) {
          throw new Error(`Page ${page.pageNumber} ka mapping result invalid hai.`);
        }

        page.newsAreas = result.stories;
        totalStories += result.stories.length;
      }

      await updateDoc(doc(db, "epapers", edition.id), {
        pages,
        updatedAt: serverTimestamp(),
      });
      setEditions((previous) =>
        previous.map((item) =>
          item.id === edition.id ? { ...item, pages } : item
        )
      );
      setMessage(
        `Auto-mapping complete: ${pages.length} pages par ${totalStories} news areas map hue.`
      );
    } catch (err) {
      console.error("E-Paper automatic news mapping failed:", err);
      setMappingError({
        editionId: edition.id,
        message: `Auto-mapping complete nahi hui: ${err.message}`,
      });
    } finally {
      setMappingId("");
      setMappingProgress("");
    }
  }

  async function deleteEdition(edition) {
    const confirmed = window.confirm(
      `"${edition.title || "Democratic News"}" (${formatDate(
        edition.editionDate
      )}) ka Firestore record delete karein?\n\nCloudinary ki JPG images is action se delete nahi hongi.`
    );

    if (!confirmed) return;

    setDeletingId(edition.id);
    setError("");
    setMessage("");

    try {
      await deleteDoc(doc(db, "epapers", edition.id));

      setEditions((previous) =>
        previous.filter((item) => item.id !== edition.id)
      );

      setMessage(
        "E-Paper record delete ho gaya. Cloudinary images alag se delete karni hongi."
      );
    } catch (err) {
      console.error("E-Paper deletion failed:", err);
      setError(`Record delete nahi hua: ${err.message}`);
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section style={styles.section}>
      <h2 style={{ marginTop: 0 }}>E-Paper Management</h2>

      <p style={styles.muted}>
        Complete newspaper PDF upload karein. Har page JPG mein convert
        hoga aur Cloudinary par upload hoga. Edition pehle Draft mein save hoga.
      </p>

      {message && <p role="status" style={styles.success}>{message}</p>}
      {error && <p role="alert" style={styles.error}>{error}</p>}
      {progress && <p role="status" style={styles.progress}>{progress}</p>}
      {mappingProgress && (
        <p role="status" style={styles.progress}>{mappingProgress}</p>
      )}
      {!MAPPING_URL && (
        <p role="status" style={styles.warning}>
          Auto-mapping service abhi connected nahi hai. Button click par
          edition ke neeche setup status dikhega. Worker setup ke steps
          README ke “E-Paper uploads” section mein hain.
        </p>
      )}

      <form onSubmit={handleUpload}>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label htmlFor="epaper-title" style={styles.label}>
              Edition title
            </label>
            <input
              id="epaper-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={uploading}
              style={styles.input}
            />
          </div>

          <div>
            <label htmlFor="epaper-date" style={styles.label}>
              Edition date
            </label>
            <input
              id="epaper-date"
              type="date"
              value={editionDate}
              onChange={(e) => setEditionDate(e.target.value)}
              required
              disabled={uploading}
              style={styles.input}
            />
          </div>

          <div>
            <label htmlFor="epaper-pdf-file" style={styles.label}>
              Newspaper PDF (maximum 10 MB)
            </label>
            <input
              id="epaper-pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              required
              disabled={uploading}
              style={styles.input}
            />
            {pdfFile && (
              <p style={styles.muted}>
                {pdfFile.name} — {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading}
            style={{
              ...styles.primary,
              opacity: uploading ? 0.65 : 1,
            }}
          >
            {uploading ? "Converting and uploading..." : "Convert PDF to JPG & Upload"}
          </button>
        </div>
      </form>

      <hr
        style={{
          margin: "28px 0",
          border: 0,
          borderTop: "1px solid #e3e7eb",
        }}
      />

      <div style={styles.listHeader}>
        <h3 style={{ margin: 0 }}>Uploaded Editions</h3>
        <button
          type="button"
          onClick={loadEditions}
          disabled={loading}
          style={styles.secondary}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <p>Loading editions...</p>
      ) : editions.length === 0 ? (
        <p style={styles.muted}>Abhi koi E-Paper record nahi hai.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {editions.map((edition) => (
            <article key={edition.id} style={styles.card}>
              <div style={{ flex: "1 1 240px" }}>
                <strong>{edition.title || "Democratic News"}</strong>
                <p style={styles.muted}>
                  Date: {formatDate(edition.editionDate)}
                </p>
                <p style={styles.muted}>
                  Pages: {edition.pageCount || edition.pages?.length || "Old PDF record"}
                </p>

                <span
                  style={{
                    ...styles.status,
                    background:
                      edition.status === "published" ? "#ecfdf3" : "#fff4d6",
                    color:
                      edition.status === "published" ? "#067647" : "#8a5b00",
                  }}
                >
                  {edition.status || "draft"}
                </span>
              </div>

              <div style={styles.actions}>
                {edition.pages?.[0]?.imageUrl && (
                  <a
                    href={edition.pages[0].imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    Preview JPG
                  </a>
                )}

                {edition.pdfUrl && (
                  <a
                    href={edition.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    Preview old PDF
                  </a>
                )}

                {edition.pages?.length > 0 && (
                  <button
                    type="button"
                    disabled={
                      mappingId === edition.id ||
                      Boolean(mappingId) ||
                      savingId === edition.id ||
                      deletingId === edition.id
                    }
                    onClick={() => autoMapEdition(edition)}
                    style={styles.secondary}
                  >
                    {mappingId === edition.id
                      ? "Mapping..."
                      : `Auto-map news (${edition.pages.reduce(
                        (total, page) => total + (page.newsAreas?.length || 0),
                        0
                      )} mapped)`}
                  </button>
                )}
                {mappingError?.editionId === edition.id && (
                  <p
                    role="alert"
                    style={{ ...styles.error, flex: "1 1 100%", margin: 0 }}
                  >
                    {mappingError.message}
                  </p>
                )}

                {edition.status !== "published" ? (
                  <button
                    type="button"
                    disabled={savingId === edition.id || deletingId === edition.id || Boolean(mappingId)}
                    onClick={() => changeStatus(edition, "published")}
                    style={styles.primary}
                  >
                    {savingId === edition.id ? "Saving..." : "Publish"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={savingId === edition.id || deletingId === edition.id || Boolean(mappingId)}
                    onClick={() => changeStatus(edition, "draft")}
                    style={styles.secondary}
                  >
                    Unpublish
                  </button>
                )}

                <button
                  type="button"
                  disabled={deletingId === edition.id || savingId === edition.id}
                  onClick={() => deleteEdition(edition)}
                  style={styles.danger}
                >
                  {deletingId === edition.id ? "Deleting..." : "Delete record"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    background: "#fff",
    borderRadius: 14,
    padding: 24,
    marginBottom: 40,
    boxShadow: "0 5px 20px rgba(15,23,42,0.07)",
  },
  muted: { color: "#687789", lineHeight: 1.6 },
  label: { display: "block", fontWeight: 700, marginBottom: 7 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #d6dce3",
    borderRadius: 7,
    fontSize: 15,
  },
  primary: {
    border: 0,
    background: "#0b1f33",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 6,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondary: {
    border: "1px solid #ccd3dc",
    background: "#fff",
    color: "#0b1f33",
    padding: "10px 14px",
    borderRadius: 6,
    fontWeight: 700,
    cursor: "pointer",
  },
  danger: {
    border: 0,
    background: "#b42318",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 6,
    fontWeight: 700,
    cursor: "pointer",
  },
  link: {
    border: "1px solid #ccd3dc",
    background: "#fff",
    color: "#0b1f33",
    padding: "10px 14px",
    borderRadius: 6,
    textDecoration: "none",
    display: "inline-block",
  },
  success: {
    background: "#ecfdf3",
    color: "#067647",
    padding: 12,
    borderRadius: 7,
  },
  error: {
    background: "#fff1f0",
    color: "#b42318",
    padding: 12,
    borderRadius: 7,
    overflowWrap: "anywhere",
  },
  progress: {
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: 12,
    borderRadius: 7,
    overflowWrap: "anywhere",
  },
  warning: {
    background: "#fffaeb",
    color: "#93370d",
    padding: 12,
    border: "1px solid #fedf89",
    borderRadius: 7,
    lineHeight: 1.5,
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  card: {
    border: "1px solid #e1e5ea",
    borderRadius: 9,
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  status: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 800,
  },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
};
