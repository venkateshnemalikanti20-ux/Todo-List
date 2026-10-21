
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

const ai = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "TaskFlow AI backend is running!",
  });
});

app.post("/api/breakdown", async (req, res) => {
  try {
    const { task } = req.body;

    if (typeof task !== "string" || !task.trim()) {
      return res.status(400).json({
        error: "Please provide a valid task.",
      });
    }

    if (task.length > 500) {
      return res.status(400).json({
        error: "Task must be 500 characters or fewer.",
      });
    }

    const response = await ai.chat.completions.create({
  model: "openai/gpt-oss-120b",
  messages: [
    {
      role: "system",
      content:
        "Break goals into exactly 5 small, practical to-do tasks. Return a valid JSON object with a property named subtasks, whose value is an array of strings. Do not include markdown.",
    },
    {
      role: "user",
      content: `Break this goal into subtasks: ${task.trim()}`,
    },
  ],
  response_format: { type: "json_object" },
});

const result = JSON.parse(response.choices[0].message.content);
const subtasks = Array.isArray(result)
  ? result
  : result.subtasks;

    if (
      !Array.isArray(subtasks) ||
      subtasks.length === 0 ||
      !subtasks.every(
        (item) => typeof item === "string" && item.trim()
      )
    ) {
      throw new Error("The AI returned an invalid task list.");
    }

    res.json({
      subtasks: subtasks.map((item) => item.trim()),
    });
  } catch (error) {
    console.error("AI breakdown error:", error.message);

    res.status(500).json({
      error: "Unable to break down this task right now. Please try again.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
