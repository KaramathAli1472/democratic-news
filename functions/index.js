const { setGlobalOptions } = require("firebase-functions");

const {
  onSchedule,
} = require("firebase-functions/v2/scheduler");

const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Parser = require("rss-parser");
const { createHash } = require("node:crypto");

admin.initializeApp();

const db = admin.firestore();

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Democratic-News-RSS-Bot/1.0",
  },
});

setGlobalOptions({
  maxInstances: 1,
  region: "asia-south1",
});

/* =========================================================
   CONSTANTS
========================================================= */

const NEWS_COLLECTION = "news";
const RSS_COLLECTION = "rss_feeds";

const MAX_ITEMS_PER_FEED = 15;

/* =========================================================
   HELPERS
========================================================= */

function createSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   IMAGE EXTRACTION
========================================================= */

function getImage(item) {
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  const mediaContent =
    item["media:content"];

  if (
    mediaContent?.$?.url
  ) {
    return mediaContent.$.url;
  }

  if (
    Array.isArray(mediaContent) &&
    mediaContent[0]?.$?.url
  ) {
    return mediaContent[0].$.url;
  }

  const mediaThumbnail =
    item["media:thumbnail"];

  if (
    mediaThumbnail?.$?.url
  ) {
    return mediaThumbnail.$.url;
  }

  if (
    Array.isArray(mediaThumbnail) &&
    mediaThumbnail[0]?.$?.url
  ) {
    return mediaThumbnail[0].$.url;
  }

  const html =
    item["content:encoded"] ||
    item.content ||
    item.description ||
    "";

  const match = html.match(
    /<img[^>]+src=["']([^"']+)["']/i
  );

  return match?.[1] || "/logo.png";
}

/* =========================================================
   URL NORMALIZATION
========================================================= */

function normalizeSourceUrl(value) {
  try {
    const url = new URL(value);

    url.hash = "";

    for (
      const key of [
        ...url.searchParams.keys(),
      ]
    ) {
      if (
        /^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(
          key
        )
      ) {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.sort();

    if (url.pathname.length > 1) {
      url.pathname =
        url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return "";
  }
}

/* =========================================================
   EXTERNAL ID
========================================================= */

function createExternalId(
  item,
  feed,
  sourceUrl
) {
  return (
    sourceUrl ||
    String(
      item.guid ||
        item.id ||
        `${feed.name}-${item.title}`
    ).trim()
  );
}

function createRssDocumentId(
  externalId
) {
  return `rss_${createHash("sha256")
    .update(externalId)
    .digest("hex")}`;
}

/* =========================================================
   DUPLICATE CHECK
========================================================= */

/*
 * New RSS articles use a deterministic document ID.
 *
 * When sourceUrl exists, we also check sourceUrl so that
 * older/legacy documents with a different document ID
 * cannot be imported again.
 *
 * This avoids the previous situation where every article
 * could trigger multiple Firestore queries.
 */

async function articleExists(
  externalId,
  sourceUrl,
  documentRef
) {
  const documentSnapshot =
    await documentRef.get();

  if (documentSnapshot.exists) {
    return true;
  }

  if (!sourceUrl) {
    return false;
  }

  const sourceSnapshot = await db
    .collection(NEWS_COLLECTION)
    .where(
      "sourceUrl",
      "==",
      sourceUrl
    )
    .limit(1)
    .get();

  return !sourceSnapshot.empty;
}

/* =========================================================
   SAVE ARTICLE
========================================================= */

async function saveArticle(
  item,
  feed
) {
  const title = stripHtml(
    item.title
  );

  if (!title) {
    return false;
  }

  const sourceUrl =
    normalizeSourceUrl(
      item.link || ""
    );

  const externalId =
    createExternalId(
      item,
      feed,
      sourceUrl
    );

  const articleRef = db
    .collection(NEWS_COLLECTION)
    .doc(
      createRssDocumentId(
        externalId
      )
    );

  const exists =
    await articleExists(
      externalId,
      sourceUrl,
      articleRef
    );

  if (exists) {
    return false;
  }

  const rawDescription =
    item.contentSnippet ||
    item.description ||
    item["content:encoded"] ||
    item.content ||
    "";

  const description =
    stripHtml(
      rawDescription
    );

  const publishedAt =
    item.isoDate ||
    item.pubDate ||
    new Date().toISOString();

  const article = {
    title,

    slug: createSlug(title),

    category:
      feed.category ||
      "India",

    excerpt:
      description.slice(0, 300),

    content:
      description,

    image:
      getImage(item),

    author:
      feed.name ||
      "RSS",

    source:
      feed.name ||
      "RSS",

    sourceUrl:
      sourceUrl ||
      item.link ||
      "",

    externalId,

    rssImported: true,

    breaking: false,

    publishedAt,

    createdAt:
      admin.firestore.FieldValue.serverTimestamp(),

    updatedAt:
      admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await articleRef.create(
      article
    );
  } catch (error) {
    /*
     * Another function instance/request may have created
     * the same deterministic document between the check
     * and create operation.
     */
    if (
      error.code === 6 ||
      error.code ===
        "already-exists"
    ) {
      return false;
    }

    throw error;
  }

  return true;
}

/* =========================================================
   IMPORT SINGLE FEED
========================================================= */

async function importFeed(
  feed
) {
  logger.info(
    `Importing RSS feed: ${feed.name}`
  );

  if (!feed.url) {
    return {
      name: feed.name,
      category: feed.category,
      total: 0,
      added: 0,
      skipped: 0,
      success: false,
      error:
        "RSS feed URL is missing.",
    };
  }

  const parsed =
    await parser.parseURL(
      feed.url
    );

  const items =
    (parsed.items || []).slice(
      0,
      MAX_ITEMS_PER_FEED
    );

  let added = 0;
  let skipped = 0;

  for (
    const item of items
  ) {
    try {
      const saved =
        await saveArticle(
          item,
          feed
        );

      if (saved) {
        added++;
      } else {
        skipped++;
      }
    } catch (error) {
      /*
       * One broken article should not stop the entire
       * RSS feed from importing.
       */
      skipped++;

      logger.warn(
        `RSS article skipped from ${feed.name}`,
        {
          title:
            item?.title ||
            "Untitled",
          error:
            error.message,
        }
      );
    }
  }

  return {
    name: feed.name,
    category: feed.category,
    total: items.length,
    added,
    skipped,
    success: true,
  };
}

/* =========================================================
   RUN RSS IMPORT
========================================================= */

async function runRssImport() {
  const snapshot =
    await db
      .collection(RSS_COLLECTION)
      .where(
        "enabled",
        "==",
        true
      )
      .get();

  const feeds =
    snapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    );

  let totalAdded = 0;
  let totalFeeds = 0;
  let successfulFeeds = 0;
  let failedFeeds = 0;

  const results = [];

  for (
    const feed of feeds
  ) {
    if (!feed.url) {
      results.push({
        name:
          feed.name ||
          "Unnamed Feed",
        category:
          feed.category ||
          "India",
        total: 0,
        added: 0,
        skipped: 0,
        success: false,
        error:
          "RSS feed URL is missing.",
      });

      failedFeeds++;

      continue;
    }

    totalFeeds++;

    try {
      const result =
        await importFeed(
          feed
        );

      totalAdded +=
        result.added;

      successfulFeeds++;

      results.push(
        result
      );
    } catch (error) {
      failedFeeds++;

      logger.error(
        `RSS feed failed: ${feed.name}`,
        error
      );

      results.push({
        name: feed.name,
        category:
          feed.category,
        total: 0,
        added: 0,
        skipped: 0,
        success: false,
        error:
          error.message ||
          "Unknown RSS error",
      });
    }
  }

  const summary = {
    totalFeeds,
    successfulFeeds,
    failedFeeds,
    totalAdded,
    results,
  };

  logger.info(
    "RSS import completed",
    summary
  );

  return summary;
}

/* =========================================================
   MANUAL RSS IMPORT
========================================================= */

exports.importRssNow =
  onCall(
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Admin login required."
        );
      }

      /*
       * Existing project structure uses an admins
       * collection with the authenticated UID as the
       * document ID.
       */
      const adminRef =
        db
          .collection("admins")
          .doc(
            request.auth.uid
          );

      const adminSnapshot =
        await adminRef.get();

      if (
        !adminSnapshot.exists
      ) {
        throw new HttpsError(
          "permission-denied",
          "Admin access required."
        );
      }

      try {
        return await runRssImport();
      } catch (error) {
        logger.error(
          "Manual RSS import failed",
          error
        );

        throw new HttpsError(
          "internal",
          "RSS import failed."
        );
      }
    }
  );

/* =========================================================
   AUTOMATIC RSS IMPORT
========================================================= */

/*
 * Runs automatically every 15 minutes.
 *
 * Time zone:
 * India Standard Time
 */
exports.importRssNews =
  onSchedule(
    {
      schedule:
        "every 15 minutes",
      timeZone:
        "Asia/Kolkata",
    },
    async () => {
      try {
        await runRssImport();
      } catch (error) {
        logger.error(
          "Automatic RSS import failed",
          error
        );

        throw error;
      }
    }
  );