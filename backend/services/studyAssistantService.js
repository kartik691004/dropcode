class StudyAssistantServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "StudyAssistantServiceError";
    this.statusCode = statusCode;
  }
}

function cleanArray(input, maxItems = 8) {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return cleaned.slice(0, maxItems);
}

async function generateStudyAssistance({
  extractedText,
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
}) {
  if (!extractedText || String(extractedText).trim().length < 80) {
    throw new StudyAssistantServiceError("Extracted text is too short to generate useful study assistance", 400);
  }

  if (!apiKey) {
    throw new StudyAssistantServiceError("Missing AI API key. Set OPENAI_API_KEY in environment", 500);
  }

  const sourceText = String(extractedText).slice(0, 70000);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an academic study assistant. Return only JSON with keys: summary, keyTopics, revisionQuestions. Keep summary concise.",
        },
        {
          role: "user",
          content:
            `From the academic text below, produce:\n` +
            `1) concise summary\n` +
            `2) key topics + important concepts (inside keyTopics)\n` +
            `3) likely exam revision questions\n\n` +
            `Return valid JSON only with this schema:\n` +
            `{\n  "summary": "",\n  "keyTopics": [""],\n  "revisionQuestions": [""]\n}\n\n` +
            `Text:\n${sourceText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new StudyAssistantServiceError(`AI API request failed (${response.status}): ${errText}`, 502);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw) {
    throw new StudyAssistantServiceError("AI API returned empty content", 502);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    throw new StudyAssistantServiceError("AI API response was not valid JSON", 502);
  }

  const result = {
    summary: String(parsed.summary || "").trim(),
    keyTopics: cleanArray(parsed.keyTopics, 12),
    revisionQuestions: cleanArray(parsed.revisionQuestions, 12),
  };

  if (!result.summary) {
    throw new StudyAssistantServiceError("AI API response missing summary", 502);
  }

  return result;
}

module.exports = {
  generateStudyAssistance,
  StudyAssistantServiceError,
};
