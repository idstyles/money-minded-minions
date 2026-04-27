const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { budgetCreation, expenseAdding } = require("./ai/orchestrator");
const { callLLM } = require("./ai/azureOpenAi");
const forecastService = require("./services/forecastService");
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

app.get("/budgets/history", auth, async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 24);
    const allBudgets = await Budget.find({ userId: req.user.id }).sort({ createdAt: 1 });
    const sliced = allBudgets.slice(-months);

    const monthsData = sliced.map((b) => {
      const date = new Date(b.createdAt);
      const monthLabel = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      const categoryBreakdown = (b.categoryLimits || []).map((cl) => ({
        category: cl.category,
        spent: cl.spent,
        limit: cl.limit,
        exceededLimit: cl.spent > cl.limit,
      }));
      return {
        monthLabel,
        budget: b.monthlyBudget,
        spent: b.totalSpent,
        remaining: b.remainingBudget,
        exceededBudget: b.totalSpent > b.monthlyBudget,
        budgetHealth: b.budgetHealth,
        categoryBreakdown,
      };
    });

    const totalMonths = monthsData.length;
    const avgBudget = totalMonths ? Math.round(monthsData.reduce((s, m) => s + m.budget, 0) / totalMonths) : 0;
    const avgSpent = totalMonths ? Math.round(monthsData.reduce((s, m) => s + m.spent, 0) / totalMonths) : 0;

    res.json({ months: monthsData, summary: { totalMonths, avgBudget, avgSpent } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch budget history" });
  }
});

const forecastNarrativePrompt = fs.readFileSync(
  path.join(__dirname, "ai", "prompts", "forecastNarrative.txt"),
  "utf-8"
);

app.get("/budgets/forecast", auth, async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 24);
    const allBudgets = await Budget.find({ userId: req.user.id }).sort({ createdAt: 1 });

    const forecastResult = forecastService.generate(allBudgets, months);

    // Get AI narrative (skip if no data)
    let aiNarrative = null;
    let purchaseAdvice = null;
    if (!forecastResult.insufficientData || forecastResult.actualMonthsUsed > 0) {
      try {
        const narrativeResp = await callLLM({
          messages: [
            { role: "system", content: forecastNarrativePrompt },
            { role: "user", content: JSON.stringify(forecastResult) },
          ],
          temperature: 0.4,
          max_tokens: 250,
        });
        const raw = narrativeResp.choices[0].message.content.trim();
        const parsed = JSON.parse(raw);
        aiNarrative = parsed.narrative || null;
        purchaseAdvice = parsed.purchaseAdvice || null;
      } catch (aiErr) {
        console.error("Forecast AI narrative failed:", aiErr.message);
      }
    }

    res.json({ ...forecastResult, aiNarrative, purchaseAdvice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate forecast" });
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

// ─── Expense edit / delete ────────────────────────────────────

function recalcBudget(budget) {
  const totalSpent = budget.expenses.reduce((s, e) => s + e.amount, 0);
  const remainingBudget = budget.monthlyBudget - totalSpent;
  const pct = budget.monthlyBudget > 0 ? totalSpent / budget.monthlyBudget : 0;
  budget.totalSpent      = totalSpent;
  budget.remainingBudget = remainingBudget;
  budget.budgetHealth    = pct > 1 ? "Critical" : pct >= 0.8 ? "Tight" : "Healthy";
  if (budget.categoryLimits?.length) {
    for (const cl of budget.categoryLimits) {
      cl.spent = budget.expenses
        .filter((e) => e.category.toLowerCase() === cl.category.toLowerCase())
        .reduce((s, e) => s + e.amount, 0);
    }
  }
  return budget;
}

app.patch("/expense/:budgetId/:expenseId", auth, async (req, res) => {
  try {
    const { amount, category, isMandatory } = req.body;
    const budget = await Budget.findOne({ _id: req.params.budgetId, userId: req.user.id });
    if (!budget) return res.status(404).json({ error: "Budget not found" });
    const exp = budget.expenses.id(req.params.expenseId);
    if (!exp) return res.status(404).json({ error: "Expense not found" });
    if (amount      !== undefined) exp.amount      = Number(amount);
    if (category    !== undefined) exp.category    = category;
    if (isMandatory !== undefined) exp.isMandatory = isMandatory;
    recalcBudget(budget);
    await budget.save();
    res.json({ success: true, budget });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

app.delete("/expense/:budgetId/:expenseId", auth, async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.budgetId, userId: req.user.id });
    if (!budget) return res.status(404).json({ error: "Budget not found" });
    const expIdx = budget.expenses.findIndex((e) => e._id.toString() === req.params.expenseId);
    if (expIdx === -1) return res.status(404).json({ error: "Expense not found" });
    budget.expenses.splice(expIdx, 1);
    recalcBudget(budget);
    await budget.save();
    res.json({ success: true, budget });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// ─── Chat tools ───────────────────────────────────────────────

const CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "add_expense",
      description: "Add a new expense to the user's current active budget. Call this whenever the user says they spent money, bought something, or wants to log/record a purchase or payment.",
      parameters: {
        type: "object",
        properties: {
          amount:      { type: "number",  description: "Amount in INR (Indian Rupees)" },
          category:    { type: "string",  enum: ["Food","Transport","Shopping","Entertainment","Utilities","Rent/EMI","Other"], description: "Expense category" },
          isMandatory: { type: "boolean", description: "True for essential expenses (rent, EMI, bills, medicine). False for optional/discretionary spending." },
        },
        required: ["amount", "category", "isMandatory"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_expense",
      description: "Edit an existing expense in the current budget — correct a wrong amount, wrong category, or mandatory flag. Use the expenseId from the recent expenses list in context.",
      parameters: {
        type: "object",
        properties: {
          expenseId:   { type: "string",  description: "The _id of the expense to edit (from context)" },
          amount:      { type: "number",  description: "New amount in INR (omit if not changing)" },
          category:    { type: "string",  enum: ["Food","Transport","Shopping","Entertainment","Utilities","Rent/EMI","Other"], description: "New category (omit if not changing)" },
          isMandatory: { type: "boolean", description: "New mandatory flag (omit if not changing)" },
        },
        required: ["expenseId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_expense",
      description: "Delete/remove an expense from the current budget. Use when the user says an expense was wrong, entered by mistake, or wants to undo/remove it. Use the expenseId from the recent expenses list in context.",
      parameters: {
        type: "object",
        properties: {
          expenseId: { type: "string", description: "The _id of the expense to delete (from context)" },
        },
        required: ["expenseId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_category_limit",
      description: "Update the spending limit for a budget category. Call this when the user wants to change, increase, decrease, or set a category budget.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string",  enum: ["Food","Transport","Shopping","Entertainment","Utilities","Rent/EMI","Other"], description: "Category to update" },
          newLimit: { type: "number",  description: "New spending limit in INR" },
        },
        required: ["category", "newLimit"],
      },
    },
  },
];

// ─── Chat ─────────────────────────────────────────────────────

app.post("/chat", auth, async (req, res) => {
  try {
    const { messages, context } = req.body;
    const userId = req.user.id;

    // ── Load full budget history for pattern analysis ──────────
    const allBudgets = await Budget.find({ userId }).sort({ createdAt: 1 });

    function buildHistoryContext(budgets) {
      if (!budgets.length) return "";

      const lines = ["\n\n=============== USER'S FULL BUDGET HISTORY ==============="];

      for (const b of budgets) {
        const monthLabel = new Date(b.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        const pct = b.monthlyBudget ? Math.round((b.totalSpent / b.monthlyBudget) * 100) : 0;
        lines.push(`\n[${monthLabel}] Budget: ₹${b.monthlyBudget} | Spent: ₹${b.totalSpent} (${pct}%) | Remaining: ₹${b.remainingBudget} | Health: ${b.budgetHealth}`);

        if (b.categoryLimits?.length) {
          const catSummary = b.categoryLimits
            .map((cl) => {
              const over = cl.spent > cl.limit ? " ⚠OVER" : "";
              return `${cl.category}: ₹${cl.spent}/₹${cl.limit}${over}`;
            })
            .join(" | ");
          lines.push(`  Categories: ${catSummary}`);
        }

        if (b.expenses?.length) {
          // Group expenses by category for compact representation
          const grouped = {};
          for (const e of b.expenses) {
            if (!grouped[e.category]) grouped[e.category] = { count: 0, total: 0, mandatory: e.isMandatory };
            grouped[e.category].count++;
            grouped[e.category].total += e.amount;
          }
          const expSummary = Object.entries(grouped)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([cat, d]) => `${cat} ₹${d.total} (${d.count} txn${d.count > 1 ? "s" : ""})`)
            .join(", ");
          lines.push(`  Expense breakdown: ${expSummary}`);
        }
      }

      lines.push("\n=============== END OF HISTORY ===============");
      lines.push("Use this history to identify spending patterns, recurring expenses, category trends, and to make predictions for upcoming months.");
      return lines.join("\n");
    }

    const historyContext = buildHistoryContext(allBudgets);

    const catLimitsLine = context?.categoryLimits?.length
      ? `\nCategory limits: ${context.categoryLimits.map((cl) => `${cl.category} (spent ₹${cl.spent} of ₹${cl.limit})`).join(", ")}.`
      : "";

    // Include recent expense IDs so co-pilot can reference them for edit/delete
    const currentBudget = allBudgets[allBudgets.length - 1];
    const recentExpensesLine = currentBudget?.expenses?.length
      ? "\n\nRecent expenses in current budget (use these IDs for edit_expense / delete_expense):\n" +
        [...currentBudget.expenses]
          .reverse()
          .slice(0, 15)
          .map((e) =>
            `  ID:${e._id} | ${new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} | ${e.category} | ₹${e.amount} | ${e.isMandatory ? "Essential" : "Optional"}`
          )
          .join("\n")
      : "";

    const currentContextLine = context
      ? `\n\nCurrent month context: Monthly Budget = ₹${context.monthlyBudget || 0}, Total Spent = ₹${context.totalSpent || 0}, Remaining = ₹${context.remainingBudget || 0}, Budget Health = ${context.budgetHealth || "Unknown"}, Latest Advice = ${context.lastAdvice || "None"}.${catLimitsLine}${recentExpensesLine}`
      : recentExpensesLine;

    const fullMessages = [
      { role: "system", content: chatSystemPrompt + historyContext + currentContextLine },
      ...messages,
    ];

    // ── First LLM call: may return a tool call or a plain reply ──
    const resp1 = await callLLM({
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 400,
      tools: CHAT_TOOLS,
      tool_choice: "auto",
    });

    const choice1 = resp1.choices[0];

    // ── No tool call: return the text reply as-is ─────────────
    if (choice1.finish_reason !== "tool_calls" || !choice1.message.tool_calls?.length) {
      return res.json({ success: true, reply: choice1.message.content });
    }

    // ── Tool call: execute the action ─────────────────────────
    const toolCall = choice1.message.tool_calls[0];
    const toolName = toolCall.function.name;
    let toolArgs;
    try { toolArgs = JSON.parse(toolCall.function.arguments); }
    catch { return res.json({ success: true, reply: "I had trouble understanding that action. Could you rephrase?" }); }

    let toolResultText = "";
    let updatedBudget   = null;

    const budget = await Budget.findOne({ userId }).sort({ createdAt: -1 });

    if (!budget) {
      toolResultText = "No active budget found. The user has not created a budget yet.";
    } else if (toolName === "add_expense") {
      const { amount, category, isMandatory } = toolArgs;
      const expense = { amount, category, isMandatory };

      const budgetWithTotals = {
        ...budget.toObject(),
        mandatorySpent:    budget.expenses.filter((e) => e.isMandatory).reduce((s, e) => s + e.amount, 0),
        nonMandatorySpent: budget.expenses.filter((e) => !e.isMandatory).reduce((s, e) => s + e.amount, 0),
      };

      const aiResult = await expenseAdding({ budget: budgetWithTotals, expense });

      budget.expenses.push(expense);
      budget.totalSpent       = aiResult.totalSpent;
      budget.remainingBudget  = aiResult.remainingBudget;
      budget.budgetHealth     = aiResult.budgetHealth;
      budget.aiAdvice         = { recommendation: aiResult.recommendation, advice: aiResult.advice };

      if (category && budget.categoryLimits?.length) {
        const idx = budget.categoryLimits.findIndex(
          (cl) => cl.category.toLowerCase() === category.toLowerCase()
        );
        if (idx !== -1) budget.categoryLimits[idx].spent += amount;
      }

      await budget.save();
      updatedBudget = budget;
      toolResultText = `Expense added: ₹${amount} for ${category} (${isMandatory ? "essential" : "optional"}). New total spent: ₹${budget.totalSpent}. Remaining budget: ₹${budget.remainingBudget}. Budget health is now: ${budget.budgetHealth}.`;

    } else if (toolName === "edit_expense") {
      const { expenseId, amount, category, isMandatory } = toolArgs;
      const exp = budget.expenses.id(expenseId);
      if (!exp) {
        toolResultText = `Could not find an expense with ID ${expenseId} in the current budget.`;
      } else {
        const oldAmount   = exp.amount;
        const oldCategory = exp.category;
        if (amount      !== undefined) exp.amount      = Number(amount);
        if (category    !== undefined) exp.category    = category;
        if (isMandatory !== undefined) exp.isMandatory = isMandatory;
        recalcBudget(budget);
        await budget.save();
        updatedBudget  = budget;
        toolResultText = `Expense updated: was ₹${oldAmount} for ${oldCategory}, now ₹${exp.amount} for ${exp.category}. New total spent: ₹${budget.totalSpent}. Remaining: ₹${budget.remainingBudget}. Health: ${budget.budgetHealth}.`;
      }

    } else if (toolName === "delete_expense") {
      const { expenseId } = toolArgs;
      const expIdx = budget.expenses.findIndex((e) => e._id.toString() === expenseId);
      if (expIdx === -1) {
        toolResultText = `Could not find an expense with ID ${expenseId} in the current budget.`;
      } else {
        const removed = budget.expenses[expIdx];
        budget.expenses.splice(expIdx, 1);
        recalcBudget(budget);
        await budget.save();
        updatedBudget  = budget;
        toolResultText = `Deleted expense: ₹${removed.amount} for ${removed.category}. New total spent: ₹${budget.totalSpent}. Remaining: ₹${budget.remainingBudget}. Health: ${budget.budgetHealth}.`;
      }

    } else if (toolName === "update_category_limit") {
      const { category, newLimit } = toolArgs;
      const idx = budget.categoryLimits?.findIndex(
        (cl) => cl.category.toLowerCase() === category.toLowerCase()
      ) ?? -1;

      if (idx === -1) {
        toolResultText = `Category "${category}" was not found in this budget. Available categories: ${budget.categoryLimits?.map((cl) => cl.category).join(", ") || "none"}.`;
      } else {
        const oldLimit = budget.categoryLimits[idx].limit;
        budget.categoryLimits[idx].limit = newLimit;
        await budget.save();
        updatedBudget = budget;
        toolResultText = `Updated ${category} spending limit from ₹${oldLimit} to ₹${newLimit}. Current spent in this category: ₹${budget.categoryLimits[idx].spent}.`;
      }
    }

    // ── Second LLM call: generate natural confirmation ────────
    const resp2 = await callLLM({
      messages: [
        ...fullMessages,
        choice1.message,
        { role: "tool", tool_call_id: toolCall.id, content: toolResultText },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = resp2.choices[0].message.content;
    res.json({
      success: true,
      reply,
      action: updatedBudget ? { type: "budget_updated", budget: updatedBudget } : null,
    });

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
