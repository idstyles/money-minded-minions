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
const { requireAdmin } = require("./middleware/auth");
require("dotenv").config();

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://money-minded-minions-group249.azurewebsites.net",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
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

    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      isAdmin: isFirstUser,
      status: isFirstUser ? "approved" : "pending",
    });

    if (isFirstUser) {
      const token = jwt.sign(
        { id: user._id, name: user.name, email: user.email, isAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: true } });
    }

    res.json({ pending: true, message: "Your account is awaiting admin approval." });
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
    if (user.status === "pending") {
      return res.json({ pending: true });
    }
    if (user.status === "rejected") {
      return res.status(403).json({ error: "Your account has been rejected." });
    }
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user._id, name: user.name, displayName: user.displayName, email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── Admin ────────────────────────────────────────────────────

app.get("/admin/users", auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }, "-password").sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.patch("/admin/users/:userId/status", auth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status },
      { new: true, select: "-password" }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// ─── Account ──────────────────────────────────────────────────

app.get("/account/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, "-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ name: user.name, displayName: user.displayName, email: user.email, status: user.status, isAdmin: user.isAdmin, createdAt: user.createdAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

app.patch("/account/display-name", auth, async (req, res) => {
  try {
    const { displayName } = req.body;
    if (!displayName?.trim()) return res.status(400).json({ error: "Display name is required" });
    const user = await User.findByIdAndUpdate(req.user.id, { displayName: displayName.trim() }, { new: true, select: "-password" });
    res.json({ success: true, displayName: user.displayName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update display name" });
  }
});

app.patch("/account/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords are required" });
    const user = await User.findById(req.user.id);
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to change password" });
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

app.get("/budgets/all", auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ budgets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

app.post("/create-budget", auth, async (req, res) => {
  try {
    const { monthlyBudget, expenses, categoryLimits } = req.body;
    const safeExpenses = expenses || [];
    const safeCategoryLimits = (categoryLimits || []).map((c) => ({
      category: c.category,
      limit: c.limit,
      spent: 0,
    }));

    const aiResult = await budgetCreation({ monthlyBudget, expenses: safeExpenses });
    const { totalSpent, remainingBudget, budgetHealth, recommendation, advice } = aiResult;

    // Seed spent for any initial expenses that match category limits
    const seededLimits = safeCategoryLimits.map((cl) => {
      const matchingSpend = safeExpenses
        .filter((e) => e.category?.toLowerCase() === cl.category.toLowerCase())
        .reduce((sum, e) => sum + e.amount, 0);
      return { ...cl, spent: matchingSpend };
    });

    const budget = new Budget({
      userId: req.user.id,
      monthlyBudget,
      totalSpent,
      remainingBudget,
      budgetHealth,
      aiAdvice: { recommendation, advice },
      expenses: safeExpenses,
      categoryLimits: seededLimits,
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

    const budgetWithTotals = {
      ...budget.toObject(),
      mandatorySpent: budget.expenses.filter((e) => e.isMandatory).reduce((sum, e) => sum + e.amount, 0),
      nonMandatorySpent: budget.expenses.filter((e) => !e.isMandatory).reduce((sum, e) => sum + e.amount, 0),
    };

    const aiResult = await expenseAdding({ budget: budgetWithTotals, expense });

    budget.expenses.push(expense);
    budget.totalSpent = aiResult.totalSpent;
    budget.remainingBudget = aiResult.remainingBudget;
    budget.budgetHealth = aiResult.budgetHealth;
    budget.aiAdvice = { recommendation: aiResult.recommendation, advice: aiResult.advice };

    // Update matching category limit spent
    if (expense.category && budget.categoryLimits?.length > 0) {
      const idx = budget.categoryLimits.findIndex(
        (cl) => cl.category.toLowerCase() === expense.category.toLowerCase()
      );
      if (idx !== -1) {
        budget.categoryLimits[idx].spent += expense.amount;
      }
    }

    await budget.save();

    const newExpense = budget.expenses[budget.expenses.length - 1];
    res.json({ success: true, expenseId: newExpense._id, budget, aiResult });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to add expense" });
  }
});

app.patch("/budget/category-limit", auth, async (req, res) => {
  try {
    const { budgetId, category, newLimit } = req.body;
    if (!budgetId || !category || newLimit == null) {
      return res.status(400).json({ error: "budgetId, category, and newLimit are required" });
    }
    const budget = await Budget.findOne({ _id: budgetId, userId: req.user.id });
    if (!budget) return res.status(404).json({ error: "Budget not found" });

    const idx = budget.categoryLimits.findIndex(
      (cl) => cl.category.toLowerCase() === category.toLowerCase()
    );
    if (idx === -1) return res.status(404).json({ error: "Category not found in budget" });

    budget.categoryLimits[idx].limit = newLimit;
    await budget.save();
    res.json({ success: true, categoryLimits: budget.categoryLimits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update category limit" });
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
  // Hashed JS/CSS assets: cache for 1 year
  app.use(express.static(frontendBuild, { maxAge: "1y", etag: false }));

  // index.html: never cache so browsers always get the latest shell
  app.get(/.*/, (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.sendFile(path.join(frontendBuild, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
