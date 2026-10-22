
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";

const PAGE_SIZE = 8;

function isValidUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidEditionDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function formatDate(value) {
  if (!isValidEditionDate(value)) return "Date unavailable";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getCreatedAtTime(edition) {
  if (typeof edition.createdAt?.toMillis === "function") {
    return edition.createdAt.toMillis();
  }

  const value =
    typeof edition.createdAt?.toDate === "function"
      ? edition.createdAt.toDate()
      : edition.createdAt;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getSortedPages(edition) {
  if (!Array.isArray(edition.pages)) return [];

  return edition.pages
    .filter(
      (page) =>
        page &&
        Number.isInteger(page.pageNumber) &&
        isValidUrl(page.imageUrl)
    )
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

function sortEditions(a, b) {
  const aValid = isValidEditionDate(a.editionDate);
  const bValid = isValidEditionDate(b.editionDate);

  if (aValid && bValid) {
    const result = b.editionDate.localeCompare(a.editionDate);
    if (result !== 0) return result;
  }

  if (aValid !== bValid) return aValid ? -1 : 1;

  return getCreatedAtTime(b) - getCreatedAtTime(a);
}

function Epaper() {
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEdition, setSelectedEdition] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [archivePage, setArchivePage] = useState(1);
  const [searchDate, setSearchDate] = useState("");
  const [zoom, setZoom] = useState(100);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  useEffect(() => {
    let cancelled = false;

    async function loadEditions() {
      setLoading(true);
      setError("");

      try {
        const editionsQuery = query(
          collection(db, "epapers"),
          where("status", "==", "published")
        );

        const snapshot = await getDocs(editionsQuery);

        const results = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...document.data(),
          }))
          .filter(
            (edition) =>
              getSortedPages(edition).length > 0 ||
              isValidUrl(edition.pdfUrl)
          )
          .sort(sortEditions);

        if (!cancelled) setEditions(results);
      } catch (err) {
        console.error("E-Paper load failed:", err);

        if (!cancelled) {
          setError(
            err.message || "E-Paper load nahi ho saka."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEditions();

    return () => {
      cancelled = true;
    };
  }, []);

  const latestEdition = editions[0] || null;

  const filteredEditions = useMemo(() => {
    if (!searchDate) return editions;

    return editions.filter(
      (edition) => edition.editionDate === searchDate
    );
  }, [editions, searchDate]);

  const totalArchivePages = Math.max(
    1,
    Math.ceil(filteredEditions.length / PAGE_SIZE)
  );

  const visibleEditions = filteredEditions.slice(
    (archivePage - 1) * PAGE_SIZE,
    archivePage * PAGE_SIZE
  );
  const calendarMonthLabel = calendarMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const calendarOffset = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  ).getDay();
  const calendarDayCount = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();
  const editionDates = new Set(
    editions
      .filter((edition) => isValidEditionDate(edition.editionDate))
      .map((edition) => edition.editionDate)
  );
  const calendarYears = Array.from(
    new Set([
      new Date().getFullYear(),
      ...editions
        .filter((edition) => isValidEditionDate(edition.editionDate))
        .map((edition) => Number(edition.editionDate.slice(0, 4))),
    ])
  ).sort((a, b) => a - b);

  const readerPages = selectedEdition
    ? getSortedPages(selectedEdition)
    : [];

  const currentPage = readerPages.find(
    (page) => page.pageNumber === pageNumber
  ) || readerPages[0];
  const currentPageIndex = currentPage
    ? readerPages.findIndex(
      (page) => page.pageNumber === currentPage.pageNumber
    )
    : -1;
  const pageWindowStart = Math.max(
    0,
    Math.min(currentPageIndex - 2, readerPages.length - 5)
  );
  const visibleReaderPages = readerPages.slice(
    pageWindowStart,
    pageWindowStart + 5
  );

  function openEdition(edition) {
    setSelectedEdition(edition);
    setPageNumber(
      getSortedPages(edition)[0]?.pageNumber || 1
    );
    setZoom(100);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    setSelectedEdition(null);
    setPageNumber(1);
    setZoom(100);
  }

  function changeArchiveDate(value) {
    setSearchDate(value);
    setArchivePage(1);
  }

  function selectCalendarDate(day) {
    const month = String(calendarMonth.getMonth() + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    changeArchiveDate(
      `${calendarMonth.getFullYear()}-${month}-${date}`
    );
  }

  function changeCalendarMonth(month) {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), month, 1)
    );
  }

  function changeCalendarYear(year) {
    setCalendarMonth(
      new Date(Number(year), calendarMonth.getMonth(), 1)
    );
  }

  return (
    <div className="epaper-app">
      <style>{`
        .epaper-app {
          --ep-red: #b51f2b;
          --ep-dark: #171717;
          --ep-muted: #6b7280;
          --ep-border: #e5e7eb;
          color: var(--ep-dark);
          background: #f5f6f8;
          min-height: 100vh;
          font-family: Arial, Helvetica, sans-serif;
        }
        .ep-container {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }
        .ep-topbar {
          background: #171717;
          color: white;
          font-size: 12px;
          padding: 14px 0;
        }
        .ep-topbar-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ep-topbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
        }
        .ep-topbar-brand img {
          width: 54px;
          height: 44px;
          object-fit: contain;
          background: white;
          border-radius: 3px;
        }
        .ep-topbar-brand strong {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 20px;
          letter-spacing: .2px;
        }
        .ep-topbar-links {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ep-topbar-links a {
          color: #e5e7eb;
          text-decoration: none;
          padding: 8px 12px;
          border: 1px solid #ffffff30;
          border-radius: 3px;
        }
        .ep-topbar-links a:hover { background: #ffffff18; }
        .ep-masthead {
          background: white;
          border-bottom: 1px solid var(--ep-border);
          box-shadow: 0 4px 14px #0000000d;
        }
        .ep-brand-row {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .ep-brand {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(25px, 4vw, 39px);
          font-weight: 800;
          letter-spacing: -1px;
          margin: 0;
          line-height: 1.15;
        }
        .ep-brand span { color: var(--ep-red); }
        .ep-brand-sub {
          color: var(--ep-muted);
          font-size: 12px;
          margin-top: 7px;
        }
        .ep-nav {
          display: flex;
          gap: 0;
          align-items: center;
          flex-wrap: wrap;
          padding: 0;
          border-top: 0;
          font-size: 13px;
          font-weight: 700;
        }
        .ep-nav button, .ep-link-button {
          border: 0;
          background: none;
          cursor: pointer;
          color: inherit;
          font: inherit;
        }
        .ep-nav button {
          padding: 15px 20px;
        }
        .ep-link-button { padding: 0; }
        .ep-nav button:hover { color: var(--ep-red); background: #f8f8f8; }
        .ep-main { padding: 28px 0 52px; }
        .ep-page-heading {
          position: relative;
          text-align: center;
          border-bottom: 2px solid var(--ep-red);
          margin: 0 0 14px;
        }
        .ep-page-heading h2 {
          display: inline-block;
          background: var(--ep-red);
          color: white;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 500;
          margin: 0;
          padding: 12px 22px;
        }
        .ep-social-strip {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 4px;
          margin-bottom: 14px;
        }
        .ep-social-strip button {
          min-height: 42px;
          border: 0;
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
        }
        .ep-social-strip button:nth-child(1) { background: #1877f2; }
        .ep-social-strip button:nth-child(2) { background: #111827; }
        .ep-social-strip button:nth-child(3) { background: #20b866; }
        .ep-social-strip button:nth-child(4) { background: #0a66c2; }
        .ep-social-strip button:nth-child(5) { background: #229ed9; }
        .ep-social-strip button:nth-child(6) { background: #c0392b; }
        .ep-social-strip button:nth-child(7) { background: #3183a6; }
        .ep-home-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(280px, .9fr);
          align-items: start;
          gap: 24px;
        }
        .ep-edition-list { display: grid; gap: 20px; }
        .ep-edition-card {
          overflow: hidden;
          background: white;
          border: 1px solid #d8dce2;
          box-shadow: 0 2px 8px #0000000b;
        }
        .ep-edition-cover {
          display: flex;
          width: 100%;
          height: 320px;
          justify-content: center;
          align-items: center;
          padding: 18px;
          border: 0;
          background: #f1f2f4;
          cursor: pointer;
          box-sizing: border-box;
        }
        .ep-edition-cover img {
          display: block;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          background: white;
          box-shadow: 0 2px 10px #0002;
        }
        .ep-edition-info {
          text-align: center;
          padding: 13px 16px 16px;
          border-top: 1px solid #e5e7eb;
        }
        .ep-edition-info h3 {
          margin: 0 0 5px;
          color: #1761a0;
          font-size: 17px;
        }
        .ep-edition-info p {
          margin: 0;
          color: var(--ep-muted);
          font-size: 13px;
        }
        .ep-sidebar { display: grid; gap: 18px; }
        .ep-sidebar-brand {
          background: white;
          border: 1px solid var(--ep-border);
          text-align: center;
          padding: 20px 14px;
        }
        .ep-sidebar-brand img {
          width: 118px;
          height: 90px;
          object-fit: contain;
        }
        .ep-sidebar-brand h3 {
          margin: 8px 0 4px;
          font-size: 23px;
        }
        .ep-sidebar-brand p {
          margin: 0;
          color: var(--ep-muted);
          font-size: 13px;
        }
        .ep-archive-panel {
          background: white;
          border: 1px solid var(--ep-border);
        }
        .ep-archive-title {
          color: white;
          background: #1761a0;
          border-bottom: 3px solid var(--ep-red);
          padding: 9px 13px;
          font: 22px Georgia, 'Times New Roman', serif;
        }
        .ep-calendar { padding: 12px; }
        .ep-calendar-controls {
          display: grid;
          grid-template-columns: 38px 1fr 1fr 38px;
          align-items: center;
          gap: 6px;
          padding: 8px;
          background: #f0f1f3;
          border: 1px solid #ddd;
          margin-bottom: 10px;
        }
        .ep-calendar-controls button,
        .ep-calendar-controls select {
          min-width: 0;
          height: 32px;
          border: 1px solid #ccc;
          background: white;
          border-radius: 3px;
        }
        .ep-calendar-controls button { cursor: pointer; }
        .ep-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 3px;
          text-align: center;
        }
        .ep-calendar-weekday {
          padding: 7px 0;
          color: #303846;
          font-size: 12px;
          font-weight: 800;
        }
        .ep-calendar-day {
          min-width: 0;
          height: 38px;
          border: 1px solid #d9dce1;
          background: #f8f9fa;
          color: #303846;
        }
        button.ep-calendar-day { cursor: pointer; }
        button.ep-calendar-day:hover { background: #fff2a8; }
        button.ep-calendar-day.has-edition {
          background: #fff6a8;
          border-color: #e6d757;
          font-weight: 800;
        }
        button.ep-calendar-day.selected {
          background: var(--ep-red);
          border-color: var(--ep-red);
          color: white;
        }
        .ep-calendar-clear {
          width: 100%;
          margin-top: 10px;
        }
        .ep-list-heading {
          margin: 0 0 14px;
          padding: 9px 13px;
          background: #1761a0;
          color: white;
          border-bottom: 3px solid var(--ep-red);
          font: 22px Georgia, 'Times New Roman', serif;
        }
        .ep-breadcrumb {
          color: var(--ep-muted);
          font-size: 13px;
          margin-bottom: 20px;
        }
        .ep-section-head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .ep-section-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(25px, 4vw, 32px);
          margin: 0 0 7px;
        }
        .ep-subtitle {
          color: var(--ep-muted);
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }
        .ep-latest {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
          background: white;
          border: 1px solid var(--ep-border);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 36px;
        }
        .ep-latest-cover {
          background: #e8e8e8;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 290px;
        }
        .ep-latest-cover img {
          display: block;
          width: auto;
          max-width: 100%;
          max-height: 370px;
          object-fit: contain;
          box-shadow: 0 4px 20px #0002;
          background: white;
        }
        .ep-latest-info {
          padding: clamp(22px, 4vw, 42px);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        }
        .ep-tag {
          display: inline-block;
          background: #fff0f0;
          color: var(--ep-red);
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 1px;
          border-radius: 3px;
          padding: 7px 10px;
          margin-bottom: 15px;
        }
        .ep-latest-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.2;
          margin: 0 0 12px;
        }
        .ep-meta {
          font-size: 13px;
          color: var(--ep-muted);
          margin-bottom: 18px;
        }
        .ep-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--ep-red);
          color: white;
          border: 1px solid var(--ep-red);
          border-radius: 5px;
          padding: 12px 18px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        .ep-primary:hover { background: #951722; }
        .ep-secondary {
          background: white;
          border: 1px solid var(--ep-border);
          border-radius: 5px;
          padding: 10px 14px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          color: #252525;
        }
        .ep-archive-tools {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ep-date {
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 5px;
          padding: 10px 12px;
          font-size: 13px;
          min-height: 40px;
        }
        .ep-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
        }
        .ep-card {
          min-width: 0;
          background: white;
          border: 1px solid var(--ep-border);
          border-radius: 8px;
          overflow: hidden;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .ep-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px #0000000d;
        }
        .ep-card-cover {
          height: 260px;
          padding: 15px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #e9eaec;
          cursor: pointer;
          border: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .ep-card-cover img {
          max-height: 100%;
          max-width: 100%;
          width: auto;
          object-fit: contain;
          box-shadow: 0 2px 10px #0002;
          background: white;
        }
        .ep-card-placeholder {
          width: 100%;
          height: 100%;
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: var(--ep-red);
          font-family: Georgia, serif;
          font-size: 23px;
          font-weight: 800;
          text-align: center;
        }
        .ep-card-body { padding: 15px; }
        .ep-card-date {
          font-size: 11px;
          color: var(--ep-red);
          font-weight: 800;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .ep-card-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 17px;
          line-height: 1.35;
          margin: 0 0 8px;
          overflow-wrap: anywhere;
        }
        .ep-card-meta {
          color: var(--ep-muted);
          font-size: 12px;
          margin-bottom: 14px;
        }
        .ep-card-action {
          display: block;
          width: 100%;
          text-align: center;
          box-sizing: border-box;
        }
        .ep-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 30px;
        }
        .ep-page-btn {
          border: 1px solid var(--ep-border);
          border-radius: 4px;
          background: white;
          min-width: 38px;
          min-height: 38px;
          padding: 8px 12px;
          cursor: pointer;
        }
        .ep-page-btn.active {
          color: white;
          background: var(--ep-red);
          border-color: var(--ep-red);
        }
        .ep-empty, .ep-message {
          background: white;
          border: 1px solid var(--ep-border);
          border-radius: 8px;
          padding: 30px 20px;
          text-align: center;
          line-height: 1.6;
        }
        .ep-error {
          color: #a51d2d;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          padding: 15px;
          border-radius: 6px;
          overflow-wrap: anywhere;
        }
        .ep-reader-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          background: white;
          border: 1px solid var(--ep-border);
          padding: 18px;
          border-radius: 8px;
          margin-bottom: 18px;
        }
        .ep-viewer-toolbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding: 14px;
          margin: -5px 0 16px;
          background: #f1f2f4;
          border: 1px solid #dfe2e6;
        }
        .ep-viewer-page-nav {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0;
        }
        .ep-viewer-page-select {
          min-width: 190px;
          height: 42px;
          margin-right: 18px;
          padding: 0 12px;
          border: 1px solid #ccd1d8;
          background: white;
          font-size: 14px;
        }
        .ep-viewer-page-button {
          min-width: 42px;
          height: 42px;
          border: 1px solid #d7dbe0;
          border-right: 0;
          background: white;
          color: #1761a0;
          cursor: pointer;
        }
        .ep-viewer-page-button:last-child { border-right: 1px solid #d7dbe0; }
        .ep-viewer-page-button.active {
          background: #1761a0;
          color: white;
          border-color: #1761a0;
        }
        .ep-viewer-toolbar-actions {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }
        .ep-viewer-layout {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }
        .ep-viewer-content { grid-column: 2; min-width: 0; }
        .ep-viewer-title {
          margin: 0;
          padding: 10px 16px;
          background: var(--ep-red);
          border-bottom: 3px solid #1761a0;
          color: white;
          font: clamp(20px, 3vw, 29px) Georgia, 'Times New Roman', serif;
          overflow-wrap: anywhere;
        }
        .ep-viewer-share { margin-bottom: 12px; }
        .ep-viewer-share button { min-height: 40px; }
        .ep-reader-stage {
          min-height: 300px;
          border: 1px solid #e1e4e8;
          border-radius: 0;
          background: white;
          padding: 12px;
        }
        .ep-pdf-viewer {
          width: 100%;
          height: min(80vh, 900px);
          min-height: 420px;
          border: 0;
        }
        .ep-pdf-open-link {
          display: inline-flex;
          margin: 0 0 12px;
          text-decoration: none;
        }
        .ep-reader-image {
          max-width: none;
          box-shadow: 0 1px 8px #0002;
        }
        .ep-reader-image-wrap {
          position: relative;
          width: 100%;
          margin: 0 auto;
        }
        .ep-story-hotspot {
          position: absolute;
          display: block;
          border: 1px solid transparent;
          background: transparent;
          text-decoration: none;
        }
        .ep-story-hotspot:hover,
        .ep-story-hotspot:focus-visible {
          border: 2px solid #d82735;
          background: #d8273522;
          outline: 2px solid white;
          outline-offset: -4px;
        }
        .ep-story-hotspot-label {
          position: absolute;
          left: 0;
          bottom: 100%;
          display: none;
          max-width: min(320px, 70vw);
          padding: 6px 9px;
          background: #0b1f33;
          color: white;
          font-size: 12px;
          line-height: 1.4;
        }
        .ep-story-hotspot:hover .ep-story-hotspot-label,
        .ep-story-hotspot:focus-visible .ep-story-hotspot-label {
          display: block;
        }
        .ep-viewer-sidebar {
          grid-column: 1;
          grid-row: 1;
          display: grid;
          gap: 10px;
          max-height: 100vh;
          overflow-y: auto;
          padding: 0 0 8px 5px;
        }
        .ep-viewer-thumb {
          display: block;
          width: 100%;
          padding: 6px;
          border: 2px solid #dfe2e6;
          background: white;
          color: #1761a0;
          cursor: pointer;
          font: inherit;
          text-align: center;
        }
        .ep-viewer-thumb.active { border-color: #1761a0; }
        .ep-viewer-thumb img {
          display: block;
          width: 100%;
          height: 112px;
          object-fit: contain;
          background: #f1f2f4;
          margin-bottom: 6px;
        }
        .ep-viewer-thumb span { font-size: 13px; }
        .ep-reader-controls {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ep-reader-stage {
          background: #292929;
          border-radius: 8px;
          padding: clamp(10px, 3vw, 24px);
          overflow: auto;
          text-align: center;
        }
        .ep-reader-image {
          display: block;
          height: auto;
          max-width: none;
          margin: 0 auto;
          background: white;
        }
        .ep-reader-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
        }
        .ep-all-pages {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 26px;
        }
        .ep-page-thumb {
          border: 2px solid transparent;
          border-radius: 5px;
          padding: 8px;
          background: white;
          cursor: pointer;
          min-width: 0;
        }
        .ep-page-thumb.active { border-color: var(--ep-red); }
        .ep-page-thumb img {
          display: block;
          width: 100%;
          height: 160px;
          object-fit: contain;
          background: #eee;
        }
        .ep-page-thumb span {
          display: block;
          font-size: 12px;
          padding-top: 8px;
          font-weight: 700;
        }
        .ep-footer {
          background: #171717;
          color: #eee;
          padding: 25px 0;
          font-size: 12px;
          line-height: 1.8;
        }
        @media (max-width: 850px) {
          .ep-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ep-latest { grid-template-columns: 1fr; }
          .ep-latest-cover { min-height: 240px; }
          .ep-all-pages { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .ep-home-layout { grid-template-columns: minmax(0, 1.2fr) minmax(250px, .8fr); gap: 16px; }
          .ep-edition-cover { height: 260px; }
          .ep-viewer-layout { grid-template-columns: minmax(0, 1fr); gap: 12px; }
          .ep-viewer-content { grid-column: 1; grid-row: 1; }
          .ep-viewer-sidebar {
            grid-column: 1;
            grid-row: 2;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            max-height: none;
            overflow: visible;
            padding: 0;
          }
          .ep-viewer-thumb img { height: 96px; }
        }
        @media (max-width: 520px) {
          .ep-container { width: calc(100% - 24px); }
          .ep-topbar-brand strong { font-size: 17px; }
          .ep-topbar-links { display: none; }
          .ep-brand-row { min-height: 0; }
          .ep-nav { justify-content: center; }
          .ep-nav button { padding: 12px 10px; font-size: 11px; }
          .ep-grid { gap: 12px; }
          .ep-card-cover { height: 190px; padding: 9px; }
          .ep-card-body { padding: 10px; }
          .ep-card-title { font-size: 15px; }
          .ep-card-meta { line-height: 1.5; }
          .ep-all-pages { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ep-page-thumb img { height: 130px; }
          .ep-latest-cover { padding: 15px; }
          .ep-latest-cover img { max-height: 300px; }
          .ep-home-layout { grid-template-columns: 1fr; }
          .ep-sidebar { grid-row: 1; }
          .ep-edition-cover { height: 250px; }
          .ep-social-strip { grid-template-columns: repeat(7, minmax(38px, 1fr)); overflow-x: auto; }
          .ep-social-strip button { min-height: 38px; font-size: 11px; }
          .ep-viewer-layout { grid-template-columns: 1fr; }
          .ep-viewer-content { grid-column: 1; grid-row: 1; }
          .ep-viewer-sidebar {
            grid-column: 1;
            grid-row: 2;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            max-height: none;
            overflow: visible;
            padding: 0;
          }
          .ep-viewer-thumb img { height: 100px; }
          .ep-viewer-page-select { min-width: 0; width: 100%; margin: 0 0 8px; }
          .ep-viewer-page-nav { width: 100%; }
          .ep-viewer-toolbar-actions { margin-left: 0; }
        }
      `}</style>

      <div className="ep-topbar">
        <div className="ep-container ep-topbar-inner">
          <a className="ep-topbar-brand" href="/">
            <img src="/logo.png" alt="" />
            <strong>The Democratic News</strong>
          </a>
          <div className="ep-topbar-links">
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/latest">Latest News</a>
          </div>
        </div>
      </div>

      <header className="ep-masthead">
        <div className="ep-container">
          <nav className="ep-nav" aria-label="E-Paper navigation">
            <button onClick={goHome}>E-PAPER HOME</button>
            <button
              onClick={() => {
                goHome();
                document
                  .getElementById("ep-archive")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              ARCHIVE
            </button>
            {selectedEdition && (
              <button onClick={goHome}>BACK TO EDITIONS</button>
            )}
          </nav>
        </div>
      </header>

      <main className="ep-container ep-main">
        {selectedEdition ? (
          <>
            {readerPages.length > 0 && (
              <div className="ep-viewer-toolbar">
                <div className="ep-viewer-page-nav">
                  <select
                    className="ep-viewer-page-select"
                    aria-label="Select newspaper page"
                    value={currentPage?.pageNumber || pageNumber}
                    onChange={(event) => {
                      setPageNumber(Number(event.target.value));
                      setZoom(100);
                    }}
                  >
                    {readerPages.map((page) => (
                      <option key={page.pageNumber} value={page.pageNumber}>
                        Page {page.pageNumber}
                      </option>
                    ))}
                  </select>
                  {visibleReaderPages.map((page) => (
                    <button
                      key={page.pageNumber}
                      type="button"
                      className={
                        page.pageNumber === currentPage?.pageNumber
                          ? "ep-viewer-page-button active"
                          : "ep-viewer-page-button"
                      }
                      onClick={() => {
                        setPageNumber(page.pageNumber);
                        setZoom(100);
                      }}
                    >
                      {page.pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="ep-viewer-page-button"
                    disabled={currentPageIndex >= readerPages.length - 1}
                    aria-label="Next page"
                    onClick={() => {
                      const nextPage = readerPages[currentPageIndex + 1];
                      if (nextPage) {
                        setPageNumber(nextPage.pageNumber);
                        setZoom(100);
                      }
                    }}
                  >
                    »
                  </button>
                </div>
                <div className="ep-viewer-toolbar-actions">
                  <button className="ep-primary" onClick={goHome}>
                    Archive
                  </button>
                  {isValidUrl(selectedEdition.pdfUrl) && (
                    <a
                      className="ep-secondary"
                      href={selectedEdition.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      Open PDF
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="ep-viewer-layout">
              <section className="ep-viewer-content">
                <h2 className="ep-viewer-title">
                  {selectedEdition.title || "Democratic News"} —{" "}
                  {formatDate(selectedEdition.editionDate)}
                  {currentPage ? ` — Page ${currentPage.pageNumber}` : ""}
                </h2>
                <div
                  className="ep-social-strip ep-viewer-share"
                  aria-label="Share and print"
                >
                  <button
                    type="button"
                    aria-label="Share on Facebook"
                    onClick={() =>
                      window.open(
                        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    f
                  </button>
                  <button
                    type="button"
                    aria-label="Share on X"
                    onClick={() =>
                      window.open(
                        `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    𝕏
                  </button>
                  <button
                    type="button"
                    aria-label="Share on WhatsApp"
                    onClick={() =>
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(window.location.href)}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    aria-label="Share on LinkedIn"
                    onClick={() =>
                      window.open(
                        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    in
                  </button>
                  <button
                    type="button"
                    aria-label="Share on Telegram"
                    onClick={() =>
                      window.open(
                        `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    Telegram
                  </button>
                  <button
                    type="button"
                    aria-label="Print page"
                    onClick={() => window.print()}
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    aria-label="Share by email"
                    onClick={() => {
                      window.location.href = `mailto:?subject=${encodeURIComponent("Democratic News E-Paper")}&body=${encodeURIComponent(window.location.href)}`;
                    }}
                  >
                    Email
                  </button>
                </div>

                {readerPages.length > 0 ? (
                  <>
                    <div className="ep-reader-head">
                      <strong>
                        Page {currentPage?.pageNumber || pageNumber} of{" "}
                        {readerPages.length}
                      </strong>
                      <div className="ep-reader-controls">
                        <button
                          className="ep-secondary"
                          onClick={() =>
                            setZoom((value) => Math.max(50, value - 10))
                          }
                        >
                          − Zoom
                        </button>
                        <span style={{ fontSize: 13, minWidth: 42 }}>
                          {zoom}%
                        </span>
                        <button
                          className="ep-secondary"
                          onClick={() =>
                            setZoom((value) => Math.min(200, value + 10))
                          }
                        >
                          + Zoom
                        </button>
                        {currentPage && (
                          <a
                            className="ep-secondary"
                            href={currentPage.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none" }}
                          >
                            Full Image
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="ep-reader-stage">
                      {currentPage && (
                        <div
                          className="ep-reader-image-wrap"
                          style={{ width: `${zoom}%` }}
                        >
                          <img
                            className="ep-reader-image"
                            src={currentPage.imageUrl}
                            alt={`Newspaper page ${currentPage.pageNumber}`}
                            style={{ width: "100%" }}
                          />
                          {(currentPage.newsAreas || []).map((story, index) => (
                            <Link
                              key={`${story.newsId}-${index}`}
                              className="ep-story-hotspot"
                              to={`/news/${story.newsId}`}
                              aria-label={
                                story.headline || "Open matching news article"
                              }
                              title={story.headline || "Open news article"}
                              style={{
                                left: `${story.x / 10}%`,
                                top: `${story.y / 10}%`,
                                width: `${story.width / 10}%`,
                                height: `${story.height / 10}%`,
                              }}
                            >
                              <span className="ep-story-hotspot-label">
                                {story.headline}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ep-reader-nav">
                      <button
                        className="ep-secondary"
                        disabled={currentPageIndex <= 0}
                        onClick={() => {
                          const previousPage =
                            readerPages[currentPageIndex - 1];
                          if (previousPage) {
                            setPageNumber(previousPage.pageNumber);
                            setZoom(100);
                          }
                        }}
                      >
                        ← Previous Page
                      </button>
                      <button
                        className="ep-primary"
                        disabled={currentPageIndex >= readerPages.length - 1}
                        onClick={() => {
                          const nextPage =
                            readerPages[currentPageIndex + 1];
                          if (nextPage) {
                            setPageNumber(nextPage.pageNumber);
                            setZoom(100);
                          }
                        }}
                      >
                        Next Page →
                      </button>
                    </div>
                  </>
                ) : isValidUrl(selectedEdition.pdfUrl) ? (
                  <div style={{ background: "white", padding: 10 }}>
                    <a
                      className="ep-secondary ep-pdf-open-link"
                      href={selectedEdition.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open PDF
                    </a>
                    <iframe
                      title="E-Paper PDF"
                      className="ep-pdf-viewer"
                      src={selectedEdition.pdfUrl}
                    />
                  </div>
                ) : (
                  <div className="ep-empty">
                    Is edition mein readable pages nahi mile.
                  </div>
                )}
              </section>

              {readerPages.length > 0 && (
                <aside
                  className="ep-viewer-sidebar"
                  aria-label="Newspaper pages"
                >
                  {readerPages.map((page) => (
                    <button
                      key={page.pageNumber}
                      type="button"
                      className={
                        page.pageNumber === currentPage?.pageNumber
                          ? "ep-viewer-thumb active"
                          : "ep-viewer-thumb"
                      }
                      onClick={() => {
                        setPageNumber(page.pageNumber);
                        setZoom(100);
                      }}
                      aria-label={`Open page ${page.pageNumber}`}
                    >
                      <img
                        src={page.imageUrl}
                        alt=""
                        loading="lazy"
                      />
                      <span>Page {page.pageNumber}</span>
                    </button>
                  ))}
                </aside>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="ep-page-heading">
              <h2>Democratic News E-Paper</h2>
            </div>

            <div className="ep-social-strip" aria-label="Share and print">
              <button
                type="button"
                aria-label="Share on Facebook"
                onClick={() =>
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                f
              </button>
              <button
                type="button"
                aria-label="Share on X"
                onClick={() =>
                  window.open(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                𝕏
              </button>
              <button
                type="button"
                aria-label="Share on WhatsApp"
                onClick={() =>
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(window.location.href)}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                WhatsApp
              </button>
              <button
                type="button"
                aria-label="Share on LinkedIn"
                onClick={() =>
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                in
              </button>
              <button
                type="button"
                aria-label="Share on Telegram"
                onClick={() =>
                  window.open(
                    `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                Telegram
              </button>
              <button type="button" aria-label="Print page" onClick={() => window.print()}>
                Print
              </button>
              <button
                type="button"
                aria-label="Share by email"
                onClick={() => {
                  window.location.href = `mailto:?subject=${encodeURIComponent("Democratic News E-Paper")}&body=${encodeURIComponent(window.location.href)}`;
                }}
              >
                Email
              </button>
            </div>

            {loading && (
              <div className="ep-message" role="status">
                Published editions load ho rahe hain...
              </div>
            )}

            {!loading && error && (
              <div className="ep-error" role="alert">
                E-Paper load nahi ho saka: {error}
              </div>
            )}

            {!loading && !error && editions.length === 0 && (
              <div className="ep-empty">
                <h3>No E-Paper Available</h3>
                <p>
                  Abhi koi published edition nahi hai. Admin panel
                  se edition upload karke Publish karein.
                </p>
              </div>
            )}

            {!loading && !error && latestEdition && (
              <div className="ep-home-layout">
                <section id="ep-archive" aria-labelledby="ep-list-heading">
                  <h2 id="ep-list-heading" className="ep-list-heading">
                    {searchDate
                      ? `Editions — ${formatDate(searchDate)}`
                      : "Latest E-Paper Editions"}
                  </h2>
                  {searchDate && (
                    <button
                      className="ep-secondary"
                      onClick={() => changeArchiveDate("")}
                      style={{ marginBottom: 14 }}
                    >
                      Clear date filter
                    </button>
                  )}

                  {filteredEditions.length === 0 ? (
                    <div className="ep-empty">
                      Is date ke liye koi published edition nahi mila.
                    </div>
                  ) : (
                    <>
                      <div className="ep-edition-list">
                        {visibleEditions.map((edition) => {
                          const pages = getSortedPages(edition);
                          const cover = pages[0]?.imageUrl;

                          return (
                            <article
                              key={edition.id}
                              className="ep-edition-card"
                            >
                              <button
                                className="ep-edition-cover"
                                onClick={() => openEdition(edition)}
                                aria-label={`Read ${edition.title || "newspaper"} dated ${formatDate(edition.editionDate)}`}
                              >
                                {cover ? (
                                  <img
                                    src={cover}
                                    alt={`${edition.title || "Democratic News"} cover`}
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="ep-card-placeholder">
                                    DEMOCRATIC
                                    <br />
                                    NEWS
                                  </div>
                                )}
                              </button>
                              <div className="ep-edition-info">
                                <h3>
                                  {edition.title || "The Democratic News"}
                                </h3>
                                <p>{formatDate(edition.editionDate)}</p>
                                {pages.length > 0 && (
                                  <p>{pages.length} pages</p>
                                )}
                                <button
                                  className="ep-primary"
                                  onClick={() => openEdition(edition)}
                                  style={{ marginTop: 12 }}
                                >
                                  Read Edition
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {totalArchivePages > 1 && (
                        <div className="ep-pagination">
                          <button
                            className="ep-page-btn"
                            disabled={archivePage === 1}
                            onClick={() =>
                              setArchivePage((page) => page - 1)
                            }
                          >
                            ←
                          </button>
                          {Array.from(
                            { length: totalArchivePages },
                            (_, index) => index + 1
                          ).map((page) => (
                            <button
                              key={page}
                              className={
                                archivePage === page
                                  ? "ep-page-btn active"
                                  : "ep-page-btn"
                              }
                              onClick={() => setArchivePage(page)}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            className="ep-page-btn"
                            disabled={archivePage === totalArchivePages}
                            onClick={() =>
                              setArchivePage((page) => page + 1)
                            }
                          >
                            →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>

                <aside className="ep-sidebar">
                  <section className="ep-sidebar-brand">
                    <img src="/logo.png" alt="The Democratic News" />
                    <h3>The Democratic News</h3>
                    <p>Daily news and digital newspaper editions</p>
                  </section>

                  <section className="ep-archive-panel">
                    <h2 className="ep-archive-title">E-Paper Archive</h2>
                    <div className="ep-calendar">
                      <div className="ep-calendar-controls">
                        <button
                          type="button"
                          aria-label="Previous month"
                          onClick={() =>
                            setCalendarMonth(
                              new Date(
                                calendarMonth.getFullYear(),
                                calendarMonth.getMonth() - 1,
                                1
                              )
                            )
                          }
                        >
                          ‹
                        </button>
                        <select
                          aria-label="Archive month"
                          value={calendarMonth.getMonth()}
                          onChange={(event) =>
                            changeCalendarMonth(Number(event.target.value))
                          }
                        >
                          {Array.from({ length: 12 }, (_, month) => (
                            <option key={month} value={month}>
                              {new Date(2024, month, 1).toLocaleDateString(
                                "en-IN",
                                { month: "short" }
                              )}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="Archive year"
                          value={calendarMonth.getFullYear()}
                          onChange={(event) =>
                            changeCalendarYear(event.target.value)
                          }
                        >
                          {calendarYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          aria-label="Next month"
                          onClick={() =>
                            setCalendarMonth(
                              new Date(
                                calendarMonth.getFullYear(),
                                calendarMonth.getMonth() + 1,
                                1
                              )
                            )
                          }
                        >
                          ›
                        </button>
                      </div>
                      <div className="ep-calendar-grid" aria-label={calendarMonthLabel}>
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
                          (day) => (
                            <span key={day} className="ep-calendar-weekday">
                              {day}
                            </span>
                          )
                        )}
                        {Array.from({ length: calendarOffset }, (_, index) => (
                          <span
                            key={`empty-${index}`}
                            className="ep-calendar-day"
                          />
                        ))}
                        {Array.from(
                          { length: calendarDayCount },
                          (_, index) => {
                            const day = index + 1;
                            const month = String(
                              calendarMonth.getMonth() + 1
                            ).padStart(2, "0");
                            const date = `${calendarMonth.getFullYear()}-${month}-${String(day).padStart(2, "0")}`;
                            const hasEdition = editionDates.has(date);

                            return (
                              <button
                                key={date}
                                type="button"
                                className={[
                                  "ep-calendar-day",
                                  hasEdition ? "has-edition" : "",
                                  searchDate === date ? "selected" : "",
                                ].filter(Boolean).join(" ")}
                                aria-label={`${date}${hasEdition ? ", edition available" : ""}`}
                                onClick={() => selectCalendarDate(day)}
                              >
                                {day}
                              </button>
                            );
                          }
                        )}
                      </div>
                      {searchDate && (
                        <button
                          className="ep-secondary ep-calendar-clear"
                          onClick={() => changeArchiveDate("")}
                        >
                          Show all editions
                        </button>
                      )}
                    </div>
                  </section>
                </aside>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="ep-footer">
        <div className="ep-container">
          <strong>THE DEMOCRATIC NEWS — E-PAPER</strong>
          <div>
            Digital newspaper archive. Published editions are displayed here.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Epaper;
