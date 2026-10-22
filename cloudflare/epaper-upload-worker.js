const CLOUDINARY_UPLOAD_PRESET = "ml_default";
const ENDPOINT_PATH = "/epaper-upload-signature";
const DELETE_ENDPOINT_PATH = "/epaper-delete";
const MAP_ENDPOINT_PATH = "/epaper-auto-map";

function jsonResponse(body, status, origin) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Vary", "Origin");
  }

  return new Response(JSON.stringify(body), { status, headers });
}

function isValidEditionDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

async function isAdminRequest(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const tokenMatch = /^Bearer\s+(.+)$/i.exec(authorization);

  if (!tokenMatch) {
    return false;
  }

  const idToken = tokenMatch[1];
  const accountResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!accountResponse.ok) {
    return false;
  }

  const account = await accountResponse.json();
  const uid = account.users?.[0]?.localId;

  if (!uid) {
    return false;
  }

  const adminResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );

  return adminResponse.ok;
}

async function createSignature(editionDate, apiSecret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "epapers";
  const publicId = `democratic-news-${editionDate}`;
  const params = [
    `folder=${folder}`,
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
    `upload_preset=${CLOUDINARY_UPLOAD_PRESET}`,
  ].join("&");
  const signatureBytes = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(`${params}${apiSecret}`)
  );
  const signature = Array.from(new Uint8Array(signatureBytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return {
    timestamp,
    folder,
    publicId,
    signature,
  };
}

async function deleteCloudinaryPdf(publicId, env) {
  if (
    typeof publicId !== "string" ||
    !/^(?:epapers\/)?democratic-news-20\d{2}-\d{2}-\d{2}(?:\.pdf)?$/.test(
      publicId
    )
  ) {
    return { error: "Invalid E-Paper public ID." };
  }

  const cloudName = encodeURIComponent(env.CLOUDINARY_CLOUD_NAME);

  for (const resourceType of ["image", "raw"]) {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = `public_id=${publicId}&timestamp=${timestamp}`;
    const signatureBytes = await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(`${params}${env.CLOUDINARY_API_SECRET}`)
    );
    const signature = Array.from(new Uint8Array(signatureBytes))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const formData = new URLSearchParams({
      api_key: env.CLOUDINARY_API_KEY,
      public_id: publicId,
      signature,
      timestamp: String(timestamp),
    });
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      }
    );
    const result = await response.json();

    if (response.ok && ["ok", "not found"].includes(result.result)) {
      return { result: result.result, resourceType };
    }

    if (
      !response.ok &&
      result.error?.http_code !== 404 &&
      result.error?.message !== "Resource not found"
    ) {
      console.error(`Cloudinary ${resourceType} deletion failed:`, result);
      return {
        error:
          result.error?.message ||
          `Cloudinary ${resourceType} deletion failed.`,
      };
    }
  }

  return { result: "not found" };
}

function encodeBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function mapPageStories(imageUrl, news, env) {
  const image = new URL(imageUrl);

  if (
    image.protocol !== "https:" ||
    image.hostname !== "res.cloudinary.com" ||
    !image.pathname.startsWith(`/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`)
  ) {
    throw new Error("Page image URL is not a trusted Cloudinary image.");
  }

  const imageResponse = await fetch(image);

  if (!imageResponse.ok) {
    throw new Error("Could not fetch the E-Paper page image.");
  }

  const contentType = imageResponse.headers.get("Content-Type") || "";
  const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());

  if (
    !contentType.startsWith("image/") ||
    imageBytes.length === 0 ||
    imageBytes.length > 10 * 1024 * 1024
  ) {
    throw new Error("E-Paper page image has an unsupported format or size.");
  }

  const candidates = news.map((item) => ({
    id: item.id,
    title: item.title.slice(0, 240),
    category: item.category.slice(0, 80),
  }));
  const prompt = [
    "Analyze this full-page newspaper image.",
    "Detect each distinct individual news story/article region on the page.",
    "For each story, find the closest matching existing website news article from the candidate list.",
    "Always choose the closest candidate even if the match is weak; never invent an article ID.",
    "Return JSON only, with this exact shape:",
    '{"stories":[{"newsId":"candidate id","headline":"visible headline","x":0,"y":0,"width":0,"height":0}]}',
    "Coordinates must be integers from 0 through 1000, relative to the full image: x/y are the top-left and width/height are the rectangle dimensions.",
    "Make each rectangle tightly cover one story including its headline and body, and avoid covering neighboring stories.",
    "Exclude ads, mastheads, captions, and repeated teasers unless they are a distinct news story.",
    `Existing website news candidates: ${JSON.stringify(candidates)}`,
  ].join("\n");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: contentType,
                  data: encodeBase64(imageBytes),
                },
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  const result = await response.json();

  if (!response.ok) {
    console.error("Gemini E-Paper mapping failed:", result);
    throw new Error(
      result.error?.message || "Vision mapping service request failed."
    );
  }

  const responseText = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("");
  const mapped = JSON.parse(responseText || "{}");
  const newsIds = new Set(news.map((item) => item.id));

  if (!Array.isArray(mapped.stories) || mapped.stories.length > 40) {
    throw new Error("Vision mapping returned an invalid story list.");
  }

  return mapped.stories
    .filter(
      (story) =>
        typeof story.newsId === "string" &&
        newsIds.has(story.newsId) &&
        typeof story.headline === "string" &&
        [story.x, story.y, story.width, story.height].every(
          (value) => Number.isFinite(value) && value >= 0 && value <= 1000
        ) &&
        story.width > 0 &&
        story.height > 0 &&
        story.x + story.width <= 1000 &&
        story.y + story.height <= 1000
    )
    .map((story) => ({
      newsId: story.newsId,
      headline: story.headline.slice(0, 240),
      x: story.x,
      y: story.y,
      width: story.width,
      height: story.height,
    }));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!origin || !allowedOrigins.includes(origin)) {
      return jsonResponse({ error: "Origin not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        },
      });
    }

    const pathname = new URL(request.url).pathname;
    if (
      pathname !== ENDPOINT_PATH &&
      pathname !== DELETE_ENDPOINT_PATH &&
      pathname !== MAP_ENDPOINT_PATH
    ) {
      return jsonResponse({ error: "Not found." }, 404, origin);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, origin);
    }

    if (
      !env.FIREBASE_API_KEY ||
      !env.FIREBASE_PROJECT_ID ||
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET ||
      (pathname === MAP_ENDPOINT_PATH && !env.GEMINI_API_KEY)
    ) {
      return jsonResponse(
        { error: "Worker configuration is incomplete." },
        500,
        origin
      );
    }

    try {
      if (!(await isAdminRequest(request, env))) {
        return jsonResponse({ error: "Admin login required." }, 403, origin);
      }

      if (pathname === DELETE_ENDPOINT_PATH) {
        const { publicId } = await request.json();
        const deletion = await deleteCloudinaryPdf(publicId, env);

        if (deletion.error) {
          return jsonResponse({ error: deletion.error }, 502, origin);
        }

        return jsonResponse(deletion, 200, origin);
      }

      if (pathname === MAP_ENDPOINT_PATH) {
        const { imageUrl, news } = await request.json();

        if (
          typeof imageUrl !== "string" ||
          !Array.isArray(news) ||
          news.length === 0 ||
          news.length > 100
        ) {
          return jsonResponse(
            { error: "A page image and 1-100 news candidates are required." },
            400,
            origin
          );
        }

        const candidates = news.filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            item.id.length > 0 &&
            typeof item.title === "string" &&
            item.title.trim().length > 0 &&
            typeof item.category === "string"
        );

        if (candidates.length !== news.length) {
          return jsonResponse(
            { error: "News candidates contain invalid data." },
            400,
            origin
          );
        }

        const stories = await mapPageStories(imageUrl, candidates, env);
        return jsonResponse({ stories }, 200, origin);
      }

      const { editionDate } = await request.json();

      if (!isValidEditionDate(editionDate)) {
        return jsonResponse(
          { error: "A valid edition date is required." },
          400,
          origin
        );
      }

      const signedParams = await createSignature(
        editionDate,
        env.CLOUDINARY_API_SECRET
      );

      return jsonResponse(
        {
          ...signedParams,
          apiKey: env.CLOUDINARY_API_KEY,
        },
        200,
        origin
      );
    } catch (error) {
      console.error("E-Paper upload signature failed:", error);
      return jsonResponse(
        { error: "Secure upload authorization failed." },
        500,
        origin
      );
    }
  },
};
