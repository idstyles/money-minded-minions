const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { budgetCreation, expenseAdding } = require("./ai/orchestrator");
const { callLLM } = require("./ai/azureOpenAi");
const Budget = require("./models/BudgetSchema");
const User = require("./models/UserSchema");
const auth = require("./middleware/auth");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const chatSystemPrompt = fs.readFileSync(
  path.join(__dirname, "ai", "prompts", "chatAgent.txt"),
  "utf-8"
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ─── Auth ─────────────────────────────────────────────────────

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── Budget ───────────────────────────────────────────────────

app.get("/budget", auth, async (req, res) => {
  try {
    const budget = await Budget.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ budget: budget || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch budget" });
  }
});

app.post("/create-budget", auth, async (req, res) => {
  try {
    const { monthlyBudget, expenses } = req.body;
    const safeExpenses = expenses || [];
    const aiResult = await budgetCreation({ monthlyBudget, expenses: safeExpenses });

    const { totalSpent, remainingBudget, budgetHealth, recommendation, advice } = aiResult;
    const budget = new Budget({
      userId: req.user.id,
      monthlyBudget,
      totalSpent,
      remainingBudget,
      budgetHealth,
      aiAdvice: { recommendation, advice },
      expenses: safeExpenses,
    });

    const saved = await budget.save();
    res.json({ success: true, budgetId: saved._id, budget: saved, aiResult });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Budget creation failed" });
  }
});

app.post("/add-expense", auth, async (req, res) => {
  try {
    const { expense, id } = req.body;
    const budget = await Budget.findOne({ _id: id, userId: req.user.id });
    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    // Derive running totals from the stored expense list
    const budgetWithTotals = {
      ...budget.toObject(),
      mandatorySpent: budget.expenses
        .filter((e) => e.isMandatory)
        .reduce((sum, e) => sum + e.amount, 0),
      nonMandatorySpent: budget.expenses
        .filter((e) => !e.isMandatory)
        .reduce((sum, e) => sum + e.amount, 0),
    };

    const aiResult = await expenseAdding({ budget: budgetWithTotals, expense });

    budget.expenses.push(expense);
    budget.totalSpent = aiResult.totalSpent;
    budget.remainingBudget = aiResult.remainingBudget;
    budget.budgetHealth = aiResult.budgetHealth;
    budget.aiAdvice = { recommendation: aiResult.recommendation, advice: aiResult.advice };

    await budget.save();

    const newExpense = budget.expenses[budget.expenses.length - 1];
    res.json({ success: true, expenseId: newExpense._id, budget, aiResult });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to add expense" });
  }
});

// ─── Chat ─────────────────────────────────────────────────────

app.post("/chat", auth, async (req, res) => {
  try {
    const { messages, context } = req.body;

    const contextLine = context
      ? `User's current budget context: Monthly Budget = ₹${context.monthlyBudget || 0}, Total Spent = ₹${context.totalSpent || 0}, Remaining = ₹${context.remainingBudget || 0}, Budget Health = ${context.budgetHealth || "Unknown"}, Latest Advice = ${context.lastAdvice || "None"}.`
      : "";

    const fullMessages = [
      { role: "system", content: chatSystemPrompt + (contextLine ? `\n\n${contextLine}` : "") },
      ...messages,
    ];

    const response = await callLLM({ messages: fullMessages, temperature: 0.7, max_tokens: 300 });
    const reply = response.choices[0].message.content;

    res.json({ success: true, reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Chat failed" });
  }
});

// ─── Serve React build in production ──────────────────────────
const frontendBuild = path.join(__dirname, "..", "frontend", "build");
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get("*", (req, res) =>
    res.sendFile(path.join(frontendBuild, "index.html"))
  );
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
