const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require('fs');
const path = require("path");
const { callLLM } = require("./ai/azureOpenAi");
require("dotenv").config();
 
const app = express();
app.use(cors());
app.use(express.json());
 
// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));
 
// Schema
const ExpenseSchema = new mongoose.Schema({
  amount: Number,
  date: { type: Date, default: Date.now }
});

// prompt readability 
const systemPrompt = fs.readFileSync(
  path.join(__dirname, "ai", "prompts", "financeAgent.txt"),
  "utf-8"
);

 
const Expense = mongoose.model("Expense", ExpenseSchema);

// api for connection with llm
app.post("/analyze-expense-ai", async (req, res) => {
  try {
    const { monthlyBudget, mandatorySpent, newExpense } = req.body;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `
          Monthly Budget: ${monthlyBudget}
          Mandatory Spent: ${mandatorySpent}
          New Expense Amount: ${newExpense.amount}
          Expense Category: ${newExpense.category}
        `
      }
    ];

    const response = await callLLM({
      messages,
      temperature: 0.2,          // low for determinism
      max_tokens: 200
    });

    // Safely parse JSON
    const aiResult = JSON.parse(response.choices[0].message.content);

    res.json({
      success: true,
      aiResult
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "AI analysis failed or returned invalid JSON"
    });
  }
});
 
// API
app.post("/add-expense", async (req, res) => {
  const { amount, monthlyBudget } = req.body;
 
  await Expense.create({ amount });
 
  const expenses = await Expense.find();
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
 
  const percentage = (totalSpent / monthlyBudget) * 100;
 
  let status;
  if (percentage < 70) status = "Normal";
  else if (percentage < 90) status = "Warning";
  else status = "Overspending";
 
  res.json({
    totalSpent,
    percentage,
    status
  });
});
 
app.listen(5000, () => console.log("Server running on port 5000"));