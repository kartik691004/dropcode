const path = require("path");
const fs = require("fs/promises");
const pdfParseModule = require("pdf-parse");
const mammoth = require("mammoth");

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx"]);

class UnsupportedFileTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedFileTypeError";
    this.statusCode = 400;
  }
}

class ExtractionError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExtractionError";
    this.statusCode = 422;
  }
}

function normalizeExtractedText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectFileType(filePath, mimeType = "") {
  const ext = path.extname(filePath || "").toLowerCase();
  const mime = String(mimeType || "").toLowerCase();

  if (ext === ".pdf" || mime.includes("pdf")) return "pdf";
  if (ext === ".docx" || mime.includes("wordprocessingml.document")) return "docx";

  throw new UnsupportedFileTypeError(
    `Unsupported file type. Only PDF and DOCX are allowed. Received extension: ${ext || "unknown"}`
  );
}

async function extractTextFromFile({ filePath, mimeType, maxFileSizeMB = 80, maxTextChars = 200000 }) {
  if (!filePath) {
    throw new ExtractionError("filePath is required for text extraction");
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext) && !mimeType) {
    throw new UnsupportedFileTypeError("Unsupported file extension. Only .pdf and .docx are supported");
  }

  let stats;
  try {
    stats = await fs.stat(filePath);
  } catch (_error) {
    throw new ExtractionError("File not found or inaccessible");
  }

  const maxBytes = maxFileSizeMB * 1024 * 1024;
  if (stats.size > maxBytes) {
    throw new ExtractionError(
      `File too large (${(stats.size / (1024 * 1024)).toFixed(1)} MB). Max allowed: ${maxFileSizeMB} MB`
    );
  }

  const fileType = detectFileType(filePath, mimeType);
  let extractedText = "";

  try {
    if (fileType === "pdf") {
      const buffer = await fs.readFile(filePath);
      if (typeof pdfParseModule === "function") {
        const parsed = await pdfParseModule(buffer);
        extractedText = parsed?.text || "";
      } else if (typeof pdfParseModule?.PDFParse === "function") {
        const parser = new pdfParseModule.PDFParse({ data: buffer });
        try {
          const parsed = await parser.getText();
          extractedText = parsed?.text || "";
        } finally {
          if (typeof parser.destroy === "function") {
            await parser.destroy().catch(() => {});
          }
        }
      } else {
        throw new Error("Unsupported pdf-parse module shape");
      }
    } else {
      const parsed = await mammoth.extractRawText({ path: filePath });
      extractedText = parsed.value || "";
    }
  } catch (error) {
    throw new ExtractionError(`Failed to extract text from ${fileType.toUpperCase()}: ${error.message}`);
  }

  const normalized = normalizeExtractedText(extractedText);
  if (!normalized) {
    throw new ExtractionError("No readable text found in the uploaded file");
  }

  // Keep memory predictable for very large source documents.
  return normalized.length > maxTextChars ? normalized.slice(0, maxTextChars) : normalized;
}

module.exports = {
  extractTextFromFile,
  UnsupportedFileTypeError,
  ExtractionError,
};
