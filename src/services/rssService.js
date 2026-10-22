import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

const rssCollection = collection(db, "rss_feeds");

export async function getAllRssFeeds() {
  const snapshot = await getDocs(rssCollection);

  const feeds = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));

  feeds.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );

  return feeds;
}

export async function addRssFeed(feedData) {
  const docRef = await addDoc(rssCollection, {
    ...feedData,
    enabled: feedData.enabled !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateRssFeed(id, feedData) {
  await updateDoc(doc(db, "rss_feeds", id), {
    ...feedData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRssFeed(id) {
  await deleteDoc(doc(db, "rss_feeds", id));
}