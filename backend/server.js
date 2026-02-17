const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const pdfParseModule = require("pdf-parse");
const mammoth = require("mammoth");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const corsOptions = FRONTEND_ORIGIN === "*"
  ? {}
  : {
      origin: FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean),
      credentials: true,
    };
app.use(cors(corsOptions));
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "psdhospital_management",
  user: process.env.DB_USER || "krrish",
  password: process.env.DB_PASSWORD || "123456",
});

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const AUTH_TABLE = "auth_users";
const RESOURCE_TABLE = "resource_uploads";
const REVIEW_TABLE = "resource_reviews";
const INSIGHTS_TABLE = "resource_study_insights";
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const allowedExtensions = new Set([
  ".pdf",
  ".docx",
  ".doc",
  ".ppt",
  ".pptx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mimeAllowed = allowedMimeTypes.has(file.mimetype);
    const extAllowed = allowedExtensions.has(ext);

    if (!mimeAllowed && !extAllowed) {
      return cb(new Error("Only PDF, DOCX, images, and PPT files are allowed"));
    }

    cb(null, true);
  },
});

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    college: row.college,
    branch: row.branch,
    semester: row.semester,
    createdAt: row.created_at,
  };
}

function parseTags(tagsInput) {
  if (!tagsInput) return [];
  if (Array.isArray(tagsInput)) {
    return tagsInput.map((tag) => String(tag).trim()).filter(Boolean);
  }

  const raw = String(tagsInput).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag).trim()).filter(Boolean);
    }
  } catch (_error) {
    // Fallback to comma-separated tags.
  }

  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validateRegisterBody(body) {
  const { name, email, password, college, branch, semester } = body || {};

  if (!name || !email || !password || !college || !branch || semester === undefined) {
    return "name, email, password, college, branch, semester are required";
  }

  if (!email.includes("@")) {
    return "Invalid email";
  }

  if (String(password).length < 6) {
    return "Password must be at least 6 characters";
  }

  const parsedSemester = Number(semester);
  if (!Number.isInteger(parsedSemester) || parsedSemester < 1 || parsedSemester > 12) {
    return "Semester must be an integer between 1 and 12";
  }

  return null;
}

function validateResourceBody(body) {
  const { title, subject, semester, type, branch, year, privacyLevel } = body || {};
  if (!title || !subject || semester === undefined || !type || !branch || year === undefined || !privacyLevel) {
    return "title, subject, semester, type, branch, year, privacyLevel are required";
  }

  const parsedSemester = Number(semester);
  if (!Number.isInteger(parsedSemester) || parsedSemester < 1 || parsedSemester > 12) {
    return "semester must be an integer between 1 and 12";
  }

  const parsedYear = Number(year);
  if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    return "year must be a valid integer between 2000 and 2100";
  }

  const allowedPrivacy = new Set(["public", "private", "college_private"]);
  if (!allowedPrivacy.has(String(privacyLevel))) {
    return "privacyLevel must be one of: public, private, college_private";
  }

  return null;
}

async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${AUTH_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      college VARCHAR(120) NOT NULL,
      branch VARCHAR(120) NOT NULL,
      semester INT NOT NULL CHECK (semester BETWEEN 1 AND 12),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function ensureResourcesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${RESOURCE_TABLE} (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES ${AUTH_TABLE}(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_url TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes BIGINT NOT NULL,
      title VARCHAR(255) NOT NULL,
      subject VARCHAR(120) NOT NULL,
      semester INT NOT NULL CHECK (semester BETWEEN 1 AND 12),
      type VARCHAR(80) NOT NULL,
      branch VARCHAR(120) NOT NULL,
      year INT NOT NULL,
      description TEXT,
      tags TEXT[] NOT NULL DEFAULT '{}',
      extracted_text TEXT,
      privacy_level VARCHAR(30) NOT NULL CHECK (privacy_level IN ('public', 'college_private', 'private')),
      avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
      ratings_count INT NOT NULL DEFAULT 0,
      views_count INT NOT NULL DEFAULT 0,
      downloads_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE ${RESOURCE_TABLE} ADD COLUMN IF NOT EXISTS branch VARCHAR(120)`);
  await pool.query(`ALTER TABLE ${RESOURCE_TABLE} ADD COLUMN IF NOT EXISTS extracted_text TEXT`);
  await pool.query(`ALTER TABLE ${RESOURCE_TABLE} ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE ${RESOURCE_TABLE} ADD COLUMN IF NOT EXISTS ratings_count INT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE ${RESOURCE_TABLE} ADD COLUMN IF NOT EXISTS views_count INT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE ${RESOURCE_TABLE} ADD COLUMN IF NOT EXISTS downloads_count INT NOT NULL DEFAULT 0`);
}

async function ensureReviewsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${REVIEW_TABLE} (
      id SERIAL PRIMARY KEY,
      resource_id INT NOT NULL REFERENCES ${RESOURCE_TABLE}(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES ${AUTH_TABLE}(id) ON DELETE CASCADE,
      rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review_text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (resource_id, user_id)
    );
  `);
}

async function ensureInsightsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${INSIGHTS_TABLE} (
      id SERIAL PRIMARY KEY,
      resource_id INT NOT NULL UNIQUE REFERENCES ${RESOURCE_TABLE}(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      key_points TEXT[] NOT NULL DEFAULT '{}',
      key_topics TEXT[] NOT NULL DEFAULT '{}',
      important_concepts TEXT[] NOT NULL DEFAULT '{}',
      revision_questions TEXT[] NOT NULL DEFAULT '{}',
      revision_notes TEXT[] NOT NULL DEFAULT '{}',
      source_excerpt TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function protect(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Missing or invalid token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: "Token is invalid or expired" });
  }
}

function canAccessResource(resourcePrivacyLevel, requesterCollege, ownerCollege) {
  if (resourcePrivacyLevel === "public") {
    return true;
  }

  // Private resources are scoped to the owner's college.
  return (
    requesterCollege &&
    ownerCollege &&
    String(requesterCollege).trim().toLowerCase() === String(ownerCollege).trim().toLowerCase()
  );
}

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in", "is", "it", "its", "of",
  "on", "or", "that", "the", "to", "was", "were", "will", "with", "this", "these", "those", "you", "your",
  "we", "our", "they", "their", "can", "could", "should", "would", "about", "into", "out", "up", "down",
  "if", "then", "than", "there", "here", "also", "such", "using", "use", "used", "each", "any", "all",
  "not", "no", "yes", "which", "when", "where", "what", "why", "how", "do", "does", "did", "have", "had",
]);

function normalizeText(input) {
  return String(input || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

function topKeywords(text, maxItems = 8) {
  const freq = new Map();
  const words = text.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [];
  for (const w of words) {
    if (stopWords.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([w]) => w);
}

function topConceptPhrases(text, maxItems = 8) {
  const phraseFreq = new Map();
  const words = text.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [];
  for (let i = 0; i < words.length - 1; i += 1) {
    const a = words[i];
    const b = words[i + 1];
    if (stopWords.has(a) || stopWords.has(b)) continue;
    const phrase = `${a} ${b}`;
    phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1);
  }
  return Array.from(phraseFreq.entries())
    .sort((x, y) => y[1] - x[1])
    .slice(0, maxItems)
    .map(([p]) => p);
}

function scoreSentences(sentences, keywordsSet) {
  return sentences.map((sentence, idx) => {
    const words = sentence.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [];
    let score = 0;
    for (const w of words) {
      if (keywordsSet.has(w)) score += 1;
    }
    if (sentence.length <= 220) score += 0.5;
    return { sentence, idx, score };
  });
}

function buildStudyAssistantPayload(rawText) {
  const text = normalizeText(rawText).slice(0, 90000);
  const sentences = splitSentences(text);
  const keyTopics = topKeywords(text, 8);
  const importantConcepts = topConceptPhrases(text, 8);
  const keywordsSet = new Set(keyTopics);

  const ranked = scoreSentences(sentences, keywordsSet).sort((a, b) => b.score - a.score);
  const summarySentences = ranked.slice(0, 4).sort((a, b) => a.idx - b.idx).map((x) => x.sentence);
  const keyPoints = ranked.slice(0, 8).map((x) => x.sentence);

  const revisionQuestions = [
    ...keyTopics.slice(0, 4).map((topic) => `Explain the core idea of ${topic} with an example.`),
    ...importantConcepts.slice(0, 3).map((concept) => `How does ${concept} work, and where is it applied?`),
    "Compare two major concepts from this resource and justify when each should be used.",
  ].slice(0, 8);

  const revisionNotes = [
    ...summarySentences.slice(0, 3),
    ...keyTopics.slice(0, 5).map((topic) => `Focus term: ${topic}`),
  ].slice(0, 8);

  return {
    summary: summarySentences.join(" "),
    keyPoints,
    keyTopics,
    importantConcepts,
    revisionQuestions,
    revisionNotes,
    sourceExcerpt: text.slice(0, 1200),
  };
}

async function parsePdfText(dataBuffer) {
  if (typeof pdfParseModule === "function") {
    const parsed = await pdfParseModule(dataBuffer);
    return parsed?.text || "";
  }

  const PDFParseClass = pdfParseModule?.PDFParse;
  if (typeof PDFParseClass === "function") {
    const parser = new PDFParseClass({ data: dataBuffer });
    try {
      const parsed = await parser.getText();
      return parsed?.text || "";
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy().catch(() => {});
      }
    }
  }

  throw new Error("pdf-parse module is incompatible with current parser usage");
}

async function extractTextFromResource(resource) {
  const filePath = resource.file_path;
  const mime = String(resource.mime_type || "").toLowerCase();
  const ext = path.extname(String(resource.original_name || "")).toLowerCase();

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("Resource file not found on server");
  }

  if (mime.includes("pdf") || ext === ".pdf") {
    const dataBuffer = fs.readFileSync(filePath);
    return await parsePdfText(dataBuffer);
  }

  if (
    mime.includes("wordprocessingml.document") ||
    mime.includes("msword") ||
    ext === ".docx"
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  }

  throw new Error("Study assistant currently supports PDF and DOCX resources only");
}

function gradeNoteQuality({ title, subject, extractedText }) {
  const text = normalizeText(extractedText || "");
  const titleText = String(title || "").trim();
  const subjectText = String(subject || "").trim();

  const words = text.match(/[a-zA-Z][a-zA-Z0-9_-]{1,}/g) || [];
  const wordCount = words.length;
  const sentenceCount = splitSentences(text).length;
  const keywordCount = topKeywords(text, 12).length;
  const headingMatches = (text.match(/\b(unit|chapter|module|topic|summary|example|question|answer)\b/gi) || []).length;
  const questionMarks = (text.match(/\?/g) || []).length;

  const coverageScore = clamp((wordCount / 1200) * 35, 0, 35);
  const structureScore = clamp(((sentenceCount / 20) * 10) + ((headingMatches / 6) * 10), 0, 20);
  const focusScore = clamp(((keywordCount / 10) * 15), 0, 15);
  const practiceScore = clamp(((questionMarks / 8) * 10), 0, 10);
  const metadataScore = titleText && subjectText ? 10 : 4;
  const readabilityScore = clamp(10 - Math.abs((wordCount / Math.max(sentenceCount, 1)) - 18), 0, 10);

  const totalScore = Math.round(coverageScore + structureScore + focusScore + practiceScore + metadataScore + readabilityScore);
  let grade = "D";
  if (totalScore >= 85) grade = "A";
  else if (totalScore >= 70) grade = "B";
  else if (totalScore >= 55) grade = "C";

  const strengths = [];
  const improvements = [];
  if (wordCount >= 800) strengths.push("Good content depth for revision");
  else improvements.push("Add more concept explanations and examples");
  if (headingMatches >= 4) strengths.push("Well-structured with topic markers");
  else improvements.push("Use section headers like Unit/Topic/Summary");
  if (questionMarks >= 4) strengths.push("Includes practice-oriented questions");
  else improvements.push("Add PYQ-style questions for exam preparation");
  if (keywordCount >= 8) strengths.push("Strong subject-specific coverage");
  else improvements.push("Use clearer technical keywords from syllabus");

  return {
    score: totalScore,
    grade,
    verdict: grade === "A" ? "Excellent notes quality" : grade === "B" ? "Good notes quality" : grade === "C" ? "Average notes quality" : "Needs significant improvement",
    metrics: {
      wordCount,
      sentenceCount,
      keywordCount,
      structureMarkers: headingMatches,
      questionCount: questionMarks,
      estimatedAccuracy: clamp(55 + (keywordCount * 3) + (headingMatches * 2), 55, 96),
    },
    strengths,
    improvements,
  };
}

function slugTag(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function suggestAcademicTags(title, extractedText, max = 10) {
  const source = `${title || ""} ${extractedText || ""}`.toLowerCase();
  const tokens = source.match(/[a-z][a-z0-9_-]{2,}/g) || [];
  const freq = new Map();
  for (const token of tokens) {
    if (stopWords.has(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  const mapped = [];
  const vocabularyMap = new Map([
    ["dbms", ["database", "sql"]],
    ["database", ["database", "sql"]],
    ["normalization", ["database-normalization"]],
    ["os", ["operating-systems"]],
    ["operating", ["operating-systems"]],
    ["kernel", ["operating-systems", "process-management"]],
    ["network", ["computer-networks"]],
    ["tcp", ["computer-networks", "tcp-ip"]],
    ["ip", ["computer-networks", "tcp-ip"]],
    ["compiler", ["compiler-design"]],
    ["java", ["java-programming"]],
    ["python", ["python-programming"]],
    ["algorithm", ["algorithms"]],
    ["datastructure", ["data-structures"]],
    ["machine", ["machine-learning"]],
    ["learning", ["machine-learning"]],
    ["ai", ["artificial-intelligence"]],
    ["security", ["cyber-security"]],
  ]);

  for (const [token] of Array.from(freq.entries()).sort((a, b) => b[1] - a[1])) {
    if (vocabularyMap.has(token)) {
      mapped.push(...vocabularyMap.get(token));
    }
  }

  const topRaw = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([token]) => slugTag(token))
    .filter(Boolean);

  return Array.from(new Set([...mapped, ...topRaw])).slice(0, max);
}

function tokenSet(text) {
  const words = (String(text || "").toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [])
    .filter((w) => !stopWords.has(w));
  return new Set(words);
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

async function findSimilarResources({ title, tags, extractedText, limit = 5 }) {
  const result = await pool.query(
    `SELECT id, title, tags, file_url, subject, type, branch, year, COALESCE(extracted_text, '') AS extracted_text
     FROM ${RESOURCE_TABLE}
     ORDER BY created_at DESC
     LIMIT 500`
  );

  const uploadTitleSet = tokenSet(title);
  const uploadTagsSet = tokenSet((tags || []).join(" "));
  const uploadTextSet = tokenSet(String(extractedText || "").slice(0, 15000));

  const scored = result.rows.map((row) => {
    const titleSim = jaccardSimilarity(uploadTitleSet, tokenSet(row.title));
    const tagsSim = jaccardSimilarity(uploadTagsSet, tokenSet((row.tags || []).join(" ")));
    const textSim = jaccardSimilarity(uploadTextSet, tokenSet(String(row.extracted_text || "").slice(0, 15000)));
    const score = (titleSim * 0.5) + (tagsSim * 0.2) + (textSim * 0.3);
    return { row, score };
  });

  return scored
    .filter((item) => item.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      id: item.row.id,
      title: item.row.title,
      subject: item.row.subject,
      type: item.row.type,
      branch: item.row.branch,
      year: item.row.year,
      similarityScore: Number(item.score.toFixed(2)),
      file_url: item.row.file_url,
      resource_url: `/api/resources/${item.row.id}`,
    }));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function logNormalized(value, maxReference) {
  if (!value || value <= 0) return 0;
  const num = Math.log(1 + value);
  const den = Math.log(1 + maxReference);
  return clamp(den ? num / den : 0, 0, 1);
}

function computeRelevanceScore(keywordQuery, resource) {
  const q = String(keywordQuery || "").toLowerCase().trim();
  if (!q) return 0;

  const queryTokens = q.match(/[a-z][a-z0-9_-]{1,}/g) || [];
  if (!queryTokens.length) return 0;

  const indexText = [
    resource.title,
    resource.subject,
    resource.type,
    resource.branch,
    resource.description,
    (resource.tags || []).join(" "),
    String(resource.extracted_text || "").slice(0, 4000),
  ]
    .join(" ")
    .toLowerCase();

  const indexSet = tokenSet(indexText);
  let hitCount = 0;
  for (const token of queryTokens) {
    if (indexSet.has(token)) hitCount += 1;
  }

  const coverage = hitCount / queryTokens.length;
  const titleBoost = String(resource.title || "").toLowerCase().includes(q) ? 0.2 : 0;
  const subjectBoost = String(resource.subject || "").toLowerCase().includes(q) ? 0.1 : 0;
  return clamp(coverage + titleBoost + subjectBoost, 0, 1);
}

function computePriorityScore(resource, keywordQuery) {
  const ratingComponent = clamp((Number(resource.avg_rating || 0) / 5) * 35, 0, 35);
  const downloadsComponent = logNormalized(Number(resource.downloads_count || 0), 250) * 20;
  const ageDays = Math.max(
    0,
    (Date.now() - new Date(resource.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const recencyComponent = clamp((1 - ageDays / 180) * 20, 0, 20);
  const relevanceComponent = computeRelevanceScore(keywordQuery, resource) * 25;
  return Number((ratingComponent + downloadsComponent + recencyComponent + relevanceComponent).toFixed(2));
}

function computeContributorTrustScore(stats) {
  const uploadsComponent = logNormalized(Number(stats.uploads_count || 0), 40) * 25;
  const ratingComponent = clamp((Number(stats.avg_upload_rating || 0) / 5) * 35, 0, 35);
  const downloadsComponent = logNormalized(Number(stats.total_downloads || 0), 1000) * 25;
  const positiveReviewsComponent = logNormalized(Number(stats.positive_reviews || 0), 300) * 15;
  const score = Number((uploadsComponent + ratingComponent + downloadsComponent + positiveReviewsComponent).toFixed(2));

  let badge = "New";
  if (score >= 80) badge = "Platinum";
  else if (score >= 65) badge = "Gold";
  else if (score >= 50) badge = "Silver";
  else if (score >= 35) badge = "Bronze";

  return { score, badge };
}

async function getContributorReputationMap(userIds) {
  const uniqueIds = Array.from(new Set((userIds || []).map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0)));
  if (!uniqueIds.length) return new Map();

  const statsResult = await pool.query(
    `SELECT
      u.id AS user_id,
      COALESCE(us.uploads_count, 0) AS uploads_count,
      COALESCE(us.avg_upload_rating, 0) AS avg_upload_rating,
      COALESCE(us.total_downloads, 0) AS total_downloads,
      COALESCE(ps.positive_reviews, 0) AS positive_reviews
    FROM ${AUTH_TABLE} u
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*)::int AS uploads_count,
        AVG(avg_rating)::numeric AS avg_upload_rating,
        SUM(downloads_count)::int AS total_downloads
      FROM ${RESOURCE_TABLE}
      WHERE user_id = ANY($1::int[])
      GROUP BY user_id
    ) us ON us.user_id = u.id
    LEFT JOIN (
      SELECT
        r.user_id,
        COUNT(*)::int AS positive_reviews
      FROM ${REVIEW_TABLE} rv
      JOIN ${RESOURCE_TABLE} r ON r.id = rv.resource_id
      WHERE rv.rating >= 4 AND r.user_id = ANY($1::int[])
      GROUP BY r.user_id
    ) ps ON ps.user_id = u.id
    WHERE u.id = ANY($1::int[])`,
    [uniqueIds]
  );

  const map = new Map();
  for (const row of statsResult.rows) {
    map.set(Number(row.user_id), computeContributorTrustScore(row));
  }
  return map;
}

async function getResourceAccessRow(resourceId, requesterId, client = pool) {
  const result = await client.query(
    `SELECT
      r.id, r.user_id, r.file_path, r.file_url, r.original_name, r.mime_type, r.size_bytes,
      r.title, r.subject, r.semester, r.type, r.branch, r.year, r.description, r.tags, r.privacy_level,
      r.avg_rating, r.ratings_count, r.views_count, r.downloads_count, r.created_at,
      owner.college AS owner_college,
      requester.college AS requester_college
    FROM ${RESOURCE_TABLE} r
    JOIN ${AUTH_TABLE} owner ON owner.id = r.user_id
    JOIN ${AUTH_TABLE} requester ON requester.id = $2
    WHERE r.id = $1`,
    [resourceId, requesterId]
  );
  return result.rows[0] || null;
}

async function refreshResourceRating(resourceId, client = pool) {
  await client.query(
    `UPDATE ${RESOURCE_TABLE} r
     SET
       avg_rating = COALESCE(stats.avg_rating, 0),
       ratings_count = COALESCE(stats.ratings_count, 0),
       updated_at = NOW()
     FROM (
       SELECT
         resource_id,
         ROUND(AVG(rating)::numeric, 2) AS avg_rating,
         COUNT(*)::int AS ratings_count
       FROM ${REVIEW_TABLE}
       WHERE resource_id = $1
       GROUP BY resource_id
     ) stats
     WHERE r.id = $1`,
    [resourceId]
  );

  await client.query(
    `UPDATE ${RESOURCE_TABLE}
     SET avg_rating = 0, ratings_count = 0, updated_at = NOW()
     WHERE id = $1
       AND NOT EXISTS (SELECT 1 FROM ${REVIEW_TABLE} WHERE resource_id = $1)`,
    [resourceId]
  );
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const validationError = validateRegisterBody(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const { name, email, password, college, branch, semester } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const existingUser = await pool.query(`SELECT id FROM ${AUTH_TABLE} WHERE email = $1`, [normalizedEmail]);
    if (existingUser.rowCount > 0) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const insertResult = await pool.query(
      `INSERT INTO ${AUTH_TABLE} (name, email, password_hash, college, branch, semester)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, college, branch, semester, created_at`,
      [
        String(name).trim(),
        normalizedEmail,
        passwordHash,
        String(college).trim(),
        String(branch).trim(),
        Number(semester),
      ]
    );

    const user = insertResult.rows[0];
    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash, college, branch, semester, created_at
       FROM ${AUTH_TABLE}
       WHERE email = $1`,
      [String(email).toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const user = result.rows[0];
    const passwordOk = await bcrypt.compare(String(password), user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/auth/me", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, college, branch, semester, created_at
       FROM ${AUTH_TABLE}
       WHERE id = $1`,
      [req.user.sub]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      user: sanitizeUser(result.rows[0]),
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/resources/upload", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required (field: file)" });
    }

    const validationError = validateResourceBody(req.body);
    if (validationError) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: validationError });
    }

    const { title, subject, semester, type, branch, year, description, privacyLevel } = req.body;
    const normalizedPrivacyLevel = String(privacyLevel) === "college_private" ? "private" : String(privacyLevel);
    const userTags = parseTags(req.body.tags);
    const confirmDuplicate = String(req.body.confirmDuplicate || "").toLowerCase() === "true";

    let extractedText = "";
    try {
      extractedText = await extractTextFromResource({
        file_path: req.file.path,
        mime_type: req.file.mimetype,
        original_name: req.file.originalname,
      });
    } catch (_error) {
      extractedText = "";
    }

    const suggestedTags = suggestAcademicTags(String(title), extractedText);
    const tags = userTags.length ? userTags : suggestedTags;

    const similarResources = await findSimilarResources({
      title: String(title),
      tags,
      extractedText,
    });

    if (similarResources.length > 0 && !confirmDuplicate) {
      fs.unlink(req.file.path, () => {});
      return res.status(409).json({
        success: false,
        message: "Similar resources found. Review and confirm upload.",
        requiresConfirmation: true,
        suggestedTags,
        similarResources,
      });
    }

    const insertResult = await pool.query(
      `INSERT INTO ${RESOURCE_TABLE}
      (user_id, file_path, file_url, original_name, mime_type, size_bytes, title, subject, semester, type, branch, year, description, tags, extracted_text, privacy_level)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, user_id, file_url, title, subject, semester, type, branch, year, description, tags, privacy_level, avg_rating, ratings_count, views_count, created_at`,
      [
        req.user.sub,
        req.file.path,
        "",
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        String(title).trim(),
        String(subject).trim(),
        Number(semester),
        String(type).trim(),
        String(branch).trim(),
        Number(year),
        description ? String(description).trim() : null,
        tags,
        extractedText ? extractedText.slice(0, 200000) : null,
        normalizedPrivacyLevel,
      ]
    );

    const resourceId = insertResult.rows[0].id;
    const fileUrl = `${req.protocol}://${req.get("host")}/api/resources/${resourceId}/file`;
    await pool.query(`UPDATE ${RESOURCE_TABLE} SET file_url = $1 WHERE id = $2`, [fileUrl, resourceId]);
    insertResult.rows[0].file_url = fileUrl;

    return res.status(201).json({
      success: true,
      message: "Resource uploaded successfully",
      suggestedTags,
      similarResources,
      resource: insertResult.rows[0],
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    console.error("Resource upload error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/resources/suggest-tags", protect, upload.single("file"), async (req, res) => {
  try {
    const { title, subject, extractedText } = req.body || {};
    if (!title || !String(title).trim()) {
      if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: "title is required" });
    }

    let textSource = String(extractedText || "");
    let extractionWarning = null;
    if (req.file) {
      try {
        textSource = await extractTextFromResource({
          file_path: req.file.path,
          mime_type: req.file.mimetype,
          original_name: req.file.originalname,
        });
      } catch (error) {
        extractionWarning = `Unable to fully extract text: ${error.message}`;
      }
      fs.unlink(req.file.path, () => {});
    }

    const suggestedTags = suggestAcademicTags(String(title), textSource);
    const preGrade = gradeNoteQuality({
      title: String(title),
      subject: subject ? String(subject) : "",
      extractedText: textSource,
    });

    return res.json({
      success: true,
      suggestedTags,
      editable: true,
      extractedTextLength: textSource.length,
      extractionWarning,
      preGrade,
    });
  } catch (error) {
    if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
    console.error("Suggest tags error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/resources/:id(\\d+)", protect, async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    if (!Number.isInteger(resourceId) || resourceId < 1) {
      return res.status(400).json({ success: false, message: "Invalid resource id" });
    }

    const resource = await getResourceAccessRow(resourceId, req.user.sub);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }
    const allowed = canAccessResource(resource.privacy_level, resource.requester_college, resource.owner_college);

    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied: unauthorized resource access" });
    }

    await pool.query(`UPDATE ${RESOURCE_TABLE} SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1`, [resource.id]);
    const reputationMap = await getContributorReputationMap([resource.user_id]);
    const contributor = reputationMap.get(Number(resource.user_id)) || { score: 0, badge: "New" };

    return res.json({
      success: true,
      resource: {
        id: resource.id,
        user_id: resource.user_id,
        file_url: resource.file_url,
        original_name: resource.original_name,
        mime_type: resource.mime_type,
        size_bytes: resource.size_bytes,
        title: resource.title,
        subject: resource.subject,
        semester: resource.semester,
        type: resource.type,
        branch: resource.branch,
        year: resource.year,
        description: resource.description,
        tags: resource.tags,
        privacy_level: resource.privacy_level,
        avg_rating: Number(resource.avg_rating || 0),
        ratings_count: Number(resource.ratings_count || 0),
        views_count: Number(resource.views_count || 0) + 1,
        downloads_count: Number(resource.downloads_count || 0),
        contributor_trust_score: contributor.score,
        contributor_badge: contributor.badge,
        priority_score: computePriorityScore(resource, ""),
        created_at: resource.created_at,
      },
    });
  } catch (error) {
    console.error("Get resource error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/resources/:id(\\d+)/file", protect, async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    if (!Number.isInteger(resourceId) || resourceId < 1) {
      return res.status(400).json({ success: false, message: "Invalid resource id" });
    }

    const resource = await getResourceAccessRow(resourceId, req.user.sub);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }
    const allowed = canAccessResource(resource.privacy_level, resource.requester_college, resource.owner_college);

    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied: unauthorized resource access" });
    }

    await pool.query(
      `UPDATE ${RESOURCE_TABLE}
       SET downloads_count = COALESCE(downloads_count, 0) + 1, updated_at = NOW()
       WHERE id = $1`,
      [resource.id]
    );

    return res
      .type(resource.mime_type || "application/octet-stream")
      .download(resource.file_path, resource.original_name);
  } catch (error) {
    console.error("Download resource error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/resources/:id(\\d+)/reviews", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const resourceId = Number(req.params.id);
    const { rating, reviewText } = req.body || {};
    const parsedRating = Number(rating);

    if (!Number.isInteger(resourceId) || resourceId < 1) {
      return res.status(400).json({ success: false, message: "Invalid resource id" });
    }
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: "rating must be an integer between 1 and 5" });
    }

    await client.query("BEGIN");

    const resource = await getResourceAccessRow(resourceId, req.user.sub, client);
    if (!resource) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const allowed = canAccessResource(resource.privacy_level, resource.requester_college, resource.owner_college);
    if (!allowed) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Access denied: unauthorized resource access" });
    }

    const insertResult = await client.query(
      `INSERT INTO ${REVIEW_TABLE} (resource_id, user_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (resource_id, user_id) DO NOTHING
       RETURNING id, resource_id, user_id, rating, review_text, created_at, updated_at`,
      [resourceId, req.user.sub, parsedRating, reviewText ? String(reviewText).trim() : null]
    );

    if (insertResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "You have already reviewed this resource" });
    }

    await refreshResourceRating(resourceId, client);
    const summaryResult = await client.query(
      `SELECT avg_rating, ratings_count FROM ${RESOURCE_TABLE} WHERE id = $1`,
      [resourceId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      review: insertResult.rows[0],
      ratingSummary: summaryResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Add review error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
});

app.patch("/api/resources/:id(\\d+)/reviews/me", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const resourceId = Number(req.params.id);
    const { rating, reviewText } = req.body || {};
    const parsedRating = Number(rating);

    if (!Number.isInteger(resourceId) || resourceId < 1) {
      return res.status(400).json({ success: false, message: "Invalid resource id" });
    }
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: "rating must be an integer between 1 and 5" });
    }

    await client.query("BEGIN");

    const resource = await getResourceAccessRow(resourceId, req.user.sub, client);
    if (!resource) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const allowed = canAccessResource(resource.privacy_level, resource.requester_college, resource.owner_college);
    if (!allowed) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Access denied: unauthorized resource access" });
    }

    const updateResult = await client.query(
      `UPDATE ${REVIEW_TABLE}
       SET rating = $3, review_text = $4, updated_at = NOW()
       WHERE resource_id = $1 AND user_id = $2
       RETURNING id, resource_id, user_id, rating, review_text, created_at, updated_at`,
      [resourceId, req.user.sub, parsedRating, reviewText ? String(reviewText).trim() : null]
    );

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Review not found for this user/resource" });
    }

    await refreshResourceRating(resourceId, client);
    const summaryResult = await client.query(
      `SELECT avg_rating, ratings_count FROM ${RESOURCE_TABLE} WHERE id = $1`,
      [resourceId]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Review updated successfully",
      review: updateResult.rows[0],
      ratingSummary: summaryResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Edit review error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
});

app.get("/api/resources/:id(\\d+)/reviews", protect, async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    if (!Number.isInteger(resourceId) || resourceId < 1) {
      return res.status(400).json({ success: false, message: "Invalid resource id" });
    }

    const resource = await getResourceAccessRow(resourceId, req.user.sub);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }
    const allowed = canAccessResource(resource.privacy_level, resource.requester_college, resource.owner_college);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied: unauthorized resource access" });
    }

    const reviewsResult = await pool.query(
      `SELECT
        rv.id, rv.resource_id, rv.user_id, rv.rating, rv.review_text, rv.created_at, rv.updated_at,
        u.name AS reviewer_name, u.college AS reviewer_college
      FROM ${REVIEW_TABLE} rv
      JOIN ${AUTH_TABLE} u ON u.id = rv.user_id
      WHERE rv.resource_id = $1
      ORDER BY rv.updated_at DESC`,
      [resourceId]
    );

    return res.json({
      success: true,
      ratingSummary: {
        avg_rating: Number(resource.avg_rating || 0),
        ratings_count: Number(resource.ratings_count || 0),
      },
      reviews: reviewsResult.rows,
    });
  } catch (error) {
    console.error("List reviews error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/resources/:id(\\d+)/study-assistant", protect, async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    const regenerate = String(req.query.regenerate || "").toLowerCase() === "true";
    if (!Number.isInteger(resourceId) || resourceId < 1) {
      return res.status(400).json({ success: false, message: "Invalid resource id" });
    }

    const resource = await getResourceAccessRow(resourceId, req.user.sub);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }
    const allowed = canAccessResource(resource.privacy_level, resource.requester_college, resource.owner_college);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied: unauthorized resource access" });
    }

    if (!regenerate) {
      const cached = await pool.query(
        `SELECT summary, key_points, key_topics, important_concepts, revision_questions, revision_notes, updated_at
         FROM ${INSIGHTS_TABLE}
         WHERE resource_id = $1`,
        [resourceId]
      );
      if (cached.rowCount > 0) {
        const item = cached.rows[0];
        return res.json({
          success: true,
          generated: false,
          insights: {
            summary: item.summary,
            keyPoints: item.key_points,
            keyTopics: item.key_topics,
            importantConcepts: item.important_concepts,
            revisionQuestions: item.revision_questions,
            revisionNotes: item.revision_notes,
            updatedAt: item.updated_at,
          },
        });
      }
    }

    const extractedText = await extractTextFromResource(resource);
    if (!extractedText || normalizeText(extractedText).length < 80) {
      return res.status(422).json({
        success: false,
        message: "Not enough readable text was extracted from this file",
      });
    }

    const generated = buildStudyAssistantPayload(extractedText);
    await pool.query(
      `INSERT INTO ${INSIGHTS_TABLE}
       (resource_id, summary, key_points, key_topics, important_concepts, revision_questions, revision_notes, source_excerpt, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (resource_id)
       DO UPDATE SET
         summary = EXCLUDED.summary,
         key_points = EXCLUDED.key_points,
         key_topics = EXCLUDED.key_topics,
         important_concepts = EXCLUDED.important_concepts,
         revision_questions = EXCLUDED.revision_questions,
         revision_notes = EXCLUDED.revision_notes,
         source_excerpt = EXCLUDED.source_excerpt,
         updated_at = NOW()`,
      [
        resourceId,
        generated.summary,
        generated.keyPoints,
        generated.keyTopics,
        generated.importantConcepts,
        generated.revisionQuestions,
        generated.revisionNotes,
        generated.sourceExcerpt,
      ]
    );

    return res.json({
      success: true,
      generated: true,
      insights: generated,
    });
  } catch (error) {
    console.error("Study assistant error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
});

app.get("/api/resources/mine", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, file_url, title, subject, semester, type, branch, year, description, tags, extracted_text, privacy_level, avg_rating, ratings_count, views_count, downloads_count, created_at
       FROM ${RESOURCE_TABLE}
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.sub]
    );
    const reputationMap = await getContributorReputationMap(result.rows.map((r) => r.user_id));
    const resources = result.rows.map((row) => {
      const contributor = reputationMap.get(Number(row.user_id)) || { score: 0, badge: "New" };
      return {
        ...row,
        priority_score: computePriorityScore(row, ""),
        contributor_trust_score: contributor.score,
        contributor_badge: contributor.badge,
      };
    });
    return res.json({ success: true, resources });
  } catch (error) {
    console.error("List resources error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/resources/search", protect, async (req, res) => {
  try {
    const { q, subject, semester, type, branch, year, privacyLevel, sort, page, limit } = req.query;

    const filters = [];
    const params = [req.user.sub];
    let p = 2;

    filters.push(`(
      r.privacy_level = 'public'
      OR LOWER(requester.college) = LOWER(owner.college)
    )`);

    if (subject) {
      filters.push(`LOWER(r.subject) = LOWER($${p++})`);
      params.push(String(subject).trim());
    }

    if (semester !== undefined) {
      const parsedSemester = Number(semester);
      if (!Number.isInteger(parsedSemester) || parsedSemester < 1 || parsedSemester > 12) {
        return res.status(400).json({ success: false, message: "semester must be between 1 and 12" });
      }
      filters.push(`r.semester = $${p++}`);
      params.push(parsedSemester);
    }

    if (type) {
      filters.push(`LOWER(r.type) = LOWER($${p++})`);
      params.push(String(type).trim());
    }

    if (branch) {
      filters.push(`LOWER(r.branch) = LOWER($${p++})`);
      params.push(String(branch).trim());
    }

    if (year !== undefined) {
      const parsedYear = Number(year);
      if (!Number.isInteger(parsedYear)) {
        return res.status(400).json({ success: false, message: "year must be an integer" });
      }
      filters.push(`r.year = $${p++}`);
      params.push(parsedYear);
    }

    if (privacyLevel) {
      const normalizedPrivacyLevel = String(privacyLevel).trim().toLowerCase() === "college_private"
        ? "private"
        : String(privacyLevel).trim().toLowerCase();
      const allowedPrivacy = new Set(["public", "private"]);
      if (!allowedPrivacy.has(normalizedPrivacyLevel)) {
        return res.status(400).json({ success: false, message: "privacyLevel must be one of: public, private" });
      }
      filters.push(`r.privacy_level = $${p++}`);
      params.push(normalizedPrivacyLevel);
    }

    if (q && String(q).trim()) {
      const qValue = `%${String(q).trim().toLowerCase()}%`;
      filters.push(`(
        LOWER(r.title) LIKE $${p++}
        OR LOWER(r.subject) LIKE $${p++}
        OR LOWER(COALESCE(r.description, '')) LIKE $${p++}
        OR LOWER(array_to_string(r.tags, ' ')) LIKE $${p++}
      )`);
      params.push(qValue, qValue, qValue, qValue);
    }

    const normalizedSort = sort ? String(sort).trim().toLowerCase().replace(/[\s-]+/g, "_") : "latest";
    let orderBy = "r.created_at DESC";
    if (normalizedSort === "highest_rated") {
      orderBy = "r.avg_rating DESC, r.ratings_count DESC, r.created_at DESC";
    } else if (normalizedSort === "most_popular") {
      orderBy = "r.downloads_count DESC, r.views_count DESC, r.created_at DESC";
    } else if (normalizedSort !== "latest" && normalizedSort !== "priority") {
      return res.status(400).json({
        success: false,
        message: "sort must be one of: latest, highest_rated, most_popular, priority",
      });
    }

    const pageNumber = page === undefined ? 1 : Number(page);
    const limitNumber = limit === undefined ? 20 : Number(limit);
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ success: false, message: "page must be >= 1" });
    }
    if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({ success: false, message: "limit must be between 1 and 100" });
    }
    const offset = (pageNumber - 1) * limitNumber;

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const query = `
      SELECT
        r.id, r.user_id, r.file_url, r.original_name, r.mime_type, r.size_bytes,
        r.title, r.subject, r.semester, r.type, r.branch, r.year, r.description, r.tags,
        r.extracted_text, r.privacy_level, r.avg_rating, r.ratings_count, r.views_count, r.downloads_count, r.created_at
      FROM ${RESOURCE_TABLE} r
      JOIN ${AUTH_TABLE} owner ON owner.id = r.user_id
      JOIN ${AUTH_TABLE} requester ON requester.id = $1
      ${whereClause}
      ORDER BY ${orderBy}
    `;

    const result = await pool.query(query, params);
    const reputationMap = await getContributorReputationMap(result.rows.map((r) => r.user_id));
    let resources = result.rows.map((row) => {
      const contributor = reputationMap.get(Number(row.user_id)) || { score: 0, badge: "New" };
      return {
        ...row,
        priority_score: computePriorityScore(row, q),
        contributor_trust_score: contributor.score,
        contributor_badge: contributor.badge,
      };
    });

    if (normalizedSort === "priority") {
      resources = resources.sort((a, b) => b.priority_score - a.priority_score);
    }

    resources = resources.slice(offset, offset + limitNumber);
    return res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      sort: normalizedSort,
      filters: {
        q: q || null,
        subject: subject || null,
        semester: semester !== undefined ? Number(semester) : null,
        type: type || null,
        branch: branch || null,
        year: year !== undefined ? Number(year) : null,
        privacyLevel: privacyLevel || null,
      },
      resources,
    });
  } catch (error) {
    console.error("Search resources error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/protected", protect, (req, res) => {
  return res.json({
    success: true,
    message: "You are authenticated",
    auth: req.user,
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large. Max size is 20MB" });
  }

  if (err) {
    return res.status(400).json({ success: false, message: err.message || "Upload error" });
  }

  return res.status(500).json({ success: false, message: "Unexpected server error" });
});

const PORT = Number(process.env.PORT || 3000);
Promise.all([ensureUsersTable(), ensureResourcesTable(), ensureReviewsTable(), ensureInsightsTable()])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("DB init error:", error);
    process.exit(1);
  });
