const { extractTextFromFile } = require("../services/textExtractor");
const { generateStudyAssistance } = require("../services/studyAssistantService");

async function runExample() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node examples/studyAssistant.example.js <path-to-pdf-or-docx>");
    process.exit(1);
  }

  try {
    const text = await extractTextFromFile({ filePath });
    const insights = await generateStudyAssistance({ extractedText: text });
    console.log(JSON.stringify(insights, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

runExample();
