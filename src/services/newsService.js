import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

const NEWS_COLLECTION = "news";

const newsCollection = collection(db, NEWS_COLLECTION);

/* =========================================================
   HELPERS
========================================================= */

function timestampToMillis(value) {
  if (!value) return 0;

  // Firebase Timestamp
  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  // JavaScript Date
  if (value instanceof Date) {
    return value.getTime();
  }

  // Number timestamp
  if (typeof value === "number") {
    // Support seconds and milliseconds
    return value < 10000000000
      ? value * 1000
      : value;
  }

  // Date string
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();

    return Number.isNaN(parsed) ? 0 : parsed;
  }

  // Firestore timestamp-style object
  if (
    typeof value === "object" &&
    value !== null &&
    value.seconds !== undefined
  ) {
    return Number(value.seconds) * 1000;
  }

  return 0;
}

/* =========================================================
   GET NEWS TIMESTAMP
========================================================= */

export function getNewsTimestamp(news) {
  if (!news) return 0;

  /*
    Priority:
    createdAt
    publishedAt
    updatedAt

    If multiple fields exist, newest valid timestamp wins.
  */

  return Math.max(
    timestampToMillis(news.createdAt),
    timestampToMillis(news.publishedAt),
    timestampToMillis(news.updatedAt)
  );
}

/* =========================================================
   NORMALIZE FIRESTORE DOCUMENT
========================================================= */

function normalizeNewsDocument(documentSnapshot) {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    ...data,
  };
}

/* =========================================================
   NORMALIZE CATEGORY
========================================================= */

function normalizeCategory(category) {
  return String(category || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/* =========================================================
   SORT NEWS
========================================================= */

function sortNewsNewestFirst(news) {
  return [...news].sort((a, b) => {
    return getNewsTimestamp(b) - getNewsTimestamp(a);
  });
}

/* =========================================================
   SAFE LIMIT
========================================================= */

function getSafeLimit(value, fallback = 20) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

/* =========================================================
   ADD NEWS
========================================================= */

export async function addNews(newsData) {
  if (!newsData || typeof newsData !== "object") {
    throw new Error("Invalid news data.");
  }

  const cleanData = {
    ...newsData,

    title: String(newsData.title || "").trim(),

    category: String(
      newsData.category || "India"
    ).trim(),

    author: String(
      newsData.author || "Democratic News Desk"
    ).trim(),

    source: String(
      newsData.source || "Democratic News"
    ).trim(),

    excerpt: String(
      newsData.excerpt || ""
    ).trim(),

    content: String(
      newsData.content || ""
    ).trim(),

    description: String(
      newsData.description || ""
    ).trim(),

    image: String(
      newsData.image || ""
    ).trim(),

    breaking: Boolean(newsData.breaking),

    createdAt: serverTimestamp(),
  };

  if (!cleanData.title) {
    throw new Error("News title is required.");
  }

  const docRef = await addDoc(
    newsCollection,
    cleanData
  );

  return docRef.id;
}

/* =========================================================
   GET ALL NEWS
   ---------------------------------------------------------
   Kept for compatibility with existing pages/admin.
========================================================= */

export async function getAllNews() {
  const snapshot = await getDocs(newsCollection);

  const news = snapshot.docs.map(
    normalizeNewsDocument
  );

  return sortNewsNewestFirst(news);
}

/* =========================================================
   GET LATEST NEWS
   ---------------------------------------------------------
   Primary query uses createdAt.

   If old documents do not have createdAt, fallback
   safely loads all news and sorts client-side.
========================================================= */

export async function getLatestNews(limitCount = 20) {
  const safeLimit = getSafeLimit(
    limitCount,
    20
  );

  try {
    const newsQuery = query(
      newsCollection,
      orderBy("createdAt", "desc"),
      limit(safeLimit)
    );

    const snapshot = await getDocs(newsQuery);

    const news = snapshot.docs.map(
      normalizeNewsDocument
    );

    /*
      Even though Firestore orders by createdAt,
      client sorting also considers publishedAt
      and updatedAt.
    */

    return sortNewsNewestFirst(news);
  } catch (error) {
    console.warn(
      "Latest news query failed. Using fallback.",
      error
    );

    const allNews = await getAllNews();

    return allNews.slice(0, safeLimit);
  }
}

/* =========================================================
   GET SINGLE NEWS
========================================================= */

export async function getNewsById(id) {
  if (!id) {
    return null;
  }

  const newsRef = doc(
    db,
    NEWS_COLLECTION,
    id
  );

  const newsDoc = await getDoc(newsRef);

  if (!newsDoc.exists()) {
    return null;
  }

  return normalizeNewsDocument(newsDoc);
}

/* =========================================================
   GET NEWS BY CATEGORY
   ---------------------------------------------------------
   Uses Firestore category query instead of downloading
   the entire news collection.
========================================================= */

export async function getNewsByCategory(
  category,
  limitCount = 50
) {
  if (!category) {
    return [];
  }

  const normalizedCategory =
    normalizeCategory(category);

  if (!normalizedCategory) {
    return [];
  }

  const safeLimit = getSafeLimit(
    limitCount,
    50
  );

  try {
    /*
      Category is filtered in Firestore.

      We intentionally don't use orderBy here because
      mixed/old timestamp fields can make Firestore
      indexing unreliable for this project.
    */

    const categoryQuery = query(
      newsCollection,
      where(
        "category",
        "==",
        category
      ),
      limit(safeLimit)
    );

    const snapshot = await getDocs(
      categoryQuery
    );

    const news = snapshot.docs
      .map(normalizeNewsDocument)
      .filter((item) => {
        return (
          normalizeCategory(item.category) ===
          normalizedCategory
        );
      });

    return sortNewsNewestFirst(news);
  } catch (error) {
    console.warn(
      "Category query failed. Using fallback.",
      error
    );

    /*
      Fallback is kept for older/inconsistent Firestore
      data or query configuration issues.
    */

    const allNews = await getAllNews();

    return allNews
      .filter((news) => {
        return (
          normalizeCategory(news.category) ===
          normalizedCategory
        );
      })
      .slice(0, safeLimit);
  }
}

/* =========================================================
   GET RELATED NEWS
   ---------------------------------------------------------
   Useful for NewsDetails page.

   It reads only the requested category instead of
   downloading the complete news collection.
========================================================= */

export async function getRelatedNews(
  category,
  excludeId = null,
  limitCount = 4
) {
  if (!category) {
    return [];
  }

  const safeLimit = getSafeLimit(
    limitCount,
    4
  );

  const news = await getNewsByCategory(
    category,
    safeLimit + 5
  );

  return news
    .filter((item) => {
      if (!excludeId) {
        return true;
      }

      return item.id !== excludeId;
    })
    .slice(0, safeLimit);
}

/* =========================================================
   GET BREAKING NEWS
========================================================= */

export async function getBreakingNews(
  limitCount = 10
) {
  const safeLimit = getSafeLimit(
    limitCount,
    10
  );

  try {
    /*
      Firestore can directly query the normal `breaking`
      boolean field used by addNews().
    */

    const breakingQuery = query(
      newsCollection,
      where("breaking", "==", true),
      limit(safeLimit)
    );

    const snapshot = await getDocs(
      breakingQuery
    );

    const breakingNews = snapshot.docs.map(
      normalizeNewsDocument
    );

    return sortNewsNewestFirst(
      breakingNews
    ).slice(0, safeLimit);
  } catch (error) {
    console.warn(
      "Breaking news query failed. Using fallback.",
      error
    );

    const allNews = await getAllNews();

    return allNews
      .filter(
        (news) =>
          news.breaking === true ||
          news.isBreaking === true ||
          news.breakingNews === true
      )
      .slice(0, safeLimit);
  }
}

/* =========================================================
   SEARCH NEWS
   ---------------------------------------------------------
   Firestore doesn't provide full-text search.

   Existing client-side search is preserved for now.
========================================================= */

export async function searchNews(searchTerm) {
  const term = String(searchTerm || "")
    .trim()
    .toLowerCase();

  if (!term) {
    return [];
  }

  const allNews = await getAllNews();

  return allNews.filter((news) => {
    const searchableText = [
      news.title,
      news.category,
      news.excerpt,
      news.description,
      news.content,
      news.author,
      news.source,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(term);
  });
}

/* =========================================================
   UPDATE NEWS
========================================================= */

export async function updateNews(
  id,
  newsData
) {
  if (!id) {
    throw new Error("News ID is required.");
  }

  if (!newsData || typeof newsData !== "object") {
    throw new Error("Invalid news data.");
  }

  const newsRef = doc(
    db,
    NEWS_COLLECTION,
    id
  );

  await updateDoc(newsRef, {
    ...newsData,
    updatedAt: serverTimestamp(),
  });
}

/* =========================================================
   DELETE NEWS
========================================================= */

export async function deleteNews(id) {
  if (!id) {
    throw new Error("News ID is required.");
  }

  const newsRef = doc(
    db,
    NEWS_COLLECTION,
    id
  );

  await deleteDoc(newsRef);
}

/* =========================================================
   GET NEWS COUNT
========================================================= */

export async function getNewsCount() {
  const snapshot = await getDocs(
    newsCollection
  );

  return snapshot.size;
}