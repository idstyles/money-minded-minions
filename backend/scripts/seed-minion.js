const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const User   = require("../models/UserSchema");
const Budget = require("../models/BudgetSchema");

const USER = { name: "Minion", email: "minion@test.com", password: "User@123" };

function monthStart(year, month) { return new Date(year, month, 1); }
function day(year, month, d)     { return new Date(year, month, d); }

function buildBudgets(userId) {
  return [
    // ── May 2025 — Healthy (60%) ─────────────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    24000,
      remainingBudget: 16000,
      budgetHealth: "Healthy",
      aiAdvice: {
        recommendation: "Proceed",
        advice: "Great start to May! You're well within budget. Consider moving the surplus into a recurring SIP or emergency fund.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  3500 },
        { category: "Transport",     limit:  3500, spent:  1200 },
        { category: "Utilities",     limit:  2500, spent:  1800 },
        { category: "Entertainment", limit:  3500, spent:   800 },
        { category: "Shopping",      limit:  4000, spent:   900 },
        { category: "Other",         limit:  2000, spent:   800 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2025, 4, 1)  },
        { amount:  1800, category: "Utilities",      isMandatory: true,  createdAt: day(2025, 4, 3)  },
        { amount:  1500, category: "Food",           isMandatory: true,  createdAt: day(2025, 4, 5)  },
        { amount:   600, category: "Transport",      isMandatory: true,  createdAt: day(2025, 4, 7)  },
        { amount:  2000, category: "Food",           isMandatory: false, createdAt: day(2025, 4, 10) },
        { amount:   600, category: "Transport",      isMandatory: false, createdAt: day(2025, 4, 13) },
        { amount:   800, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 4, 15) },
        { amount:   900, category: "Shopping",       isMandatory: false, createdAt: day(2025, 4, 18) },
        { amount:   800, category: "Other",          isMandatory: false, createdAt: day(2025, 4, 25) },
      ],
      createdAt: monthStart(2025, 4),
    },

    // ── June 2025 — Healthy (75%) ────────────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    30000,
      remainingBudget: 10000,
      budgetHealth: "Healthy",
      aiAdvice: {
        recommendation: "Proceed",
        advice: "June spending is healthy at 75%. You have ₹10,000 left — enjoy the month but avoid large discretionary splurges.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  4800 },
        { category: "Transport",     limit:  3500, spent:  2000 },
        { category: "Utilities",     limit:  2500, spent:  2200 },
        { category: "Entertainment", limit:  3500, spent:  2500 },
        { category: "Shopping",      limit:  4000, spent:  2500 },
        { category: "Other",         limit:  2000, spent:  1000 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2025, 5, 1)  },
        { amount:  2200, category: "Utilities",      isMandatory: true,  createdAt: day(2025, 5, 3)  },
        { amount:  1600, category: "Food",           isMandatory: true,  createdAt: day(2025, 5, 5)  },
        { amount:   900, category: "Transport",      isMandatory: true,  createdAt: day(2025, 5, 7)  },
        { amount:  1800, category: "Food",           isMandatory: false, createdAt: day(2025, 5, 9)  },
        { amount:  1100, category: "Transport",      isMandatory: false, createdAt: day(2025, 5, 12) },
        { amount:  1200, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 5, 14) },
        { amount:  1200, category: "Shopping",       isMandatory: false, createdAt: day(2025, 5, 16) },
        { amount:  1400, category: "Food",           isMandatory: false, createdAt: day(2025, 5, 18) },
        { amount:  1300, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 5, 20) },
        { amount:  1300, category: "Shopping",       isMandatory: false, createdAt: day(2025, 5, 23) },
        { amount:  1000, category: "Other",          isMandatory: false, createdAt: day(2025, 5, 27) },
      ],
      createdAt: monthStart(2025, 5),
    },

    // ── July 2025 — Tight (85%) ──────────────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    34000,
      remainingBudget: 6000,
      budgetHealth: "Tight",
      aiAdvice: {
        recommendation: "Caution",
        advice: "July spending is getting tight at 85%. Utilities exceeded the limit. Scale back entertainment and shopping for the rest of the month.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  5500 },
        { category: "Transport",     limit:  3500, spent:  3000 },
        { category: "Utilities",     limit:  2500, spent:  2800 },
        { category: "Entertainment", limit:  3500, spent:  3500 },
        { category: "Shopping",      limit:  4000, spent:  3200 },
        { category: "Other",         limit:  2000, spent:  1000 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2025, 6, 1)  },
        { amount:  2800, category: "Utilities",      isMandatory: true,  createdAt: day(2025, 6, 3)  },
        { amount:  1800, category: "Food",           isMandatory: true,  createdAt: day(2025, 6, 5)  },
        { amount:   900, category: "Transport",      isMandatory: true,  createdAt: day(2025, 6, 7)  },
        { amount:  2000, category: "Food",           isMandatory: false, createdAt: day(2025, 6, 9)  },
        { amount:  1000, category: "Transport",      isMandatory: false, createdAt: day(2025, 6, 11) },
        { amount:  1800, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 6, 13) },
        { amount:  1500, category: "Shopping",       isMandatory: false, createdAt: day(2025, 6, 15) },
        { amount:  1700, category: "Food",           isMandatory: false, createdAt: day(2025, 6, 18) },
        { amount:  1100, category: "Transport",      isMandatory: false, createdAt: day(2025, 6, 20) },
        { amount:  1700, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 6, 23) },
        { amount:  1700, category: "Shopping",       isMandatory: false, createdAt: day(2025, 6, 25) },
        { amount:  1000, category: "Other",          isMandatory: false, createdAt: day(2025, 6, 28) },
      ],
      createdAt: monthStart(2025, 6),
    },

    // ── August 2025 — Critical (105%) ────────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    42000,
      remainingBudget: -2000,
      budgetHealth: "Critical",
      aiAdvice: {
        recommendation: "Avoid",
        advice: "You overspent in August by ₹2,000. Entertainment and Shopping both blew past their limits. Set harder caps next month and avoid discretionary spending until you recover.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  7200 },
        { category: "Transport",     limit:  3500, spent:  3500 },
        { category: "Utilities",     limit:  2500, spent:  3000 },
        { category: "Entertainment", limit:  3500, spent:  5500 },
        { category: "Shopping",      limit:  4000, spent:  6000 },
        { category: "Other",         limit:  2000, spent:  1800 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2025, 7, 1)  },
        { amount:  3000, category: "Utilities",      isMandatory: true,  createdAt: day(2025, 7, 3)  },
        { amount:  1800, category: "Food",           isMandatory: true,  createdAt: day(2025, 7, 4)  },
        { amount:  1000, category: "Transport",      isMandatory: true,  createdAt: day(2025, 7, 5)  },
        { amount:  2000, category: "Food",           isMandatory: false, createdAt: day(2025, 7, 7)  },
        { amount:  2000, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 7, 9)  },
        { amount:  2000, category: "Shopping",       isMandatory: false, createdAt: day(2025, 7, 11) },
        { amount:  1200, category: "Transport",      isMandatory: false, createdAt: day(2025, 7, 13) },
        { amount:  1700, category: "Food",           isMandatory: false, createdAt: day(2025, 7, 15) },
        { amount:  2000, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 7, 17) },
        { amount:  2000, category: "Shopping",       isMandatory: false, createdAt: day(2025, 7, 19) },
        { amount:  1300, category: "Transport",      isMandatory: false, createdAt: day(2025, 7, 21) },
        { amount:  1700, category: "Food",           isMandatory: false, createdAt: day(2025, 7, 23) },
        { amount:  1500, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 7, 25) },
        { amount:  2000, category: "Shopping",       isMandatory: false, createdAt: day(2025, 7, 27) },
        { amount:  1800, category: "Other",          isMandatory: false, createdAt: day(2025, 7, 29) },
      ],
      createdAt: monthStart(2025, 7),
    },

    // ── September 2025 — Healthy (65%) ──────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    26000,
      remainingBudget: 14000,
      budgetHealth: "Healthy",
      aiAdvice: {
        recommendation: "Proceed",
        advice: "Excellent recovery in September! After August's overspend you've pulled back well. You're at 65% — keep the discipline going.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  3800 },
        { category: "Transport",     limit:  3500, spent:  1500 },
        { category: "Utilities",     limit:  2500, spent:  2000 },
        { category: "Entertainment", limit:  3500, spent:  1500 },
        { category: "Shopping",      limit:  4000, spent:  1500 },
        { category: "Other",         limit:  2000, spent:   700 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2025, 8, 1)  },
        { amount:  2000, category: "Utilities",      isMandatory: true,  createdAt: day(2025, 8, 3)  },
        { amount:  1800, category: "Food",           isMandatory: true,  createdAt: day(2025, 8, 5)  },
        { amount:   700, category: "Transport",      isMandatory: true,  createdAt: day(2025, 8, 7)  },
        { amount:  2000, category: "Food",           isMandatory: false, createdAt: day(2025, 8, 12) },
        { amount:   800, category: "Transport",      isMandatory: false, createdAt: day(2025, 8, 15) },
        { amount:  1500, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 8, 18) },
        { amount:  1500, category: "Shopping",       isMandatory: false, createdAt: day(2025, 8, 21) },
        { amount:   700, category: "Other",          isMandatory: false, createdAt: day(2025, 8, 26) },
      ],
      createdAt: monthStart(2025, 8),
    },

    // ── October 2025 — Healthy (70%) ────────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    28000,
      remainingBudget: 12000,
      budgetHealth: "Healthy",
      aiAdvice: {
        recommendation: "Proceed",
        advice: "October is on track at 70%. Festive season ahead — set aside some budget buffer for Diwali expenses next month.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  4200 },
        { category: "Transport",     limit:  3500, spent:  1800 },
        { category: "Utilities",     limit:  2500, spent:  2200 },
        { category: "Entertainment", limit:  3500, spent:  2000 },
        { category: "Shopping",      limit:  4000, spent:  1800 },
        { category: "Other",         limit:  2000, spent:  1000 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2025, 9, 1)  },
        { amount:  2200, category: "Utilities",      isMandatory: true,  createdAt: day(2025, 9, 3)  },
        { amount:  1400, category: "Food",           isMandatory: true,  createdAt: day(2025, 9, 5)  },
        { amount:   900, category: "Transport",      isMandatory: true,  createdAt: day(2025, 9, 7)  },
        { amount:  1400, category: "Food",           isMandatory: false, createdAt: day(2025, 9, 10) },
        { amount:   900, category: "Transport",      isMandatory: false, createdAt: day(2025, 9, 14) },
        { amount:  2000, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 9, 17) },
        { amount:  1400, category: "Food",           isMandatory: false, createdAt: day(2025, 9, 20) },
        { amount:  1800, category: "Shopping",       isMandatory: false, createdAt: day(2025, 9, 23) },
        { amount:  1000, category: "Other",          isMandatory: false, createdAt: day(2025, 9, 27) },
      ],
      createdAt: monthStart(2025, 9),
    },

    // ── November 2025 — Tight (90%) ─────────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    36000,
      remainingBudget: 4000,
      budgetHealth: "Tight",
      aiAdvice: {
        recommendation: "Caution",
        advice: "November festive spending pushed you to 90%. Entertainment and Shopping both exceeded limits. Only ₹4,000 remains — prioritise essentials only.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  5800 },
        { category: "Transport",     limit:  3500, spent:  2500 },
        { category: "Utilities",     limit:  2500, spent:  2800 },
        { category: "Entertainment", limit:  3500, spent:  4000 },
        { category: "Shopping",      limit:  4000, spent:  4200 },
        { category: "Other",         limit:  2000, spent:  1700 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2025, 10, 1)  },
        { amount:  2800, category: "Utilities",      isMandatory: true,  createdAt: day(2025, 10, 3)  },
        { amount:  1800, category: "Food",           isMandatory: true,  createdAt: day(2025, 10, 5)  },
        { amount:  1200, category: "Transport",      isMandatory: true,  createdAt: day(2025, 10, 6)  },
        { amount:  2200, category: "Food",           isMandatory: false, createdAt: day(2025, 10, 8)  },
        { amount:  2000, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 10, 10) },
        { amount:  2000, category: "Shopping",       isMandatory: false, createdAt: day(2025, 10, 12) },
        { amount:  1300, category: "Transport",      isMandatory: false, createdAt: day(2025, 10, 15) },
        { amount:  1800, category: "Food",           isMandatory: false, createdAt: day(2025, 10, 18) },
        { amount:  2000, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 10, 20) },
        { amount:  2200, category: "Shopping",       isMandatory: false, createdAt: day(2025, 10, 22) },
        { amount:  1700, category: "Other",          isMandatory: false, createdAt: day(2025, 10, 27) },
      ],
      createdAt: monthStart(2025, 10),
    },

    // ── December 2025 — Critical (110%) ─────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    44000,
      remainingBudget: -4000,
      budgetHealth: "Critical",
      aiAdvice: {
        recommendation: "Avoid",
        advice: "December holiday spending pushed you ₹4,000 over budget. Shopping hit more than double its limit. Start January with a strict spending freeze on non-essentials.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  6500 },
        { category: "Transport",     limit:  3500, spent:  2800 },
        { category: "Utilities",     limit:  2500, spent:  3000 },
        { category: "Entertainment", limit:  3500, spent:  6200 },
        { category: "Shopping",      limit:  4000, spent:  8500 },
        { category: "Other",         limit:  2000, spent:  2000 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2025, 11, 1)  },
        { amount:  3000, category: "Utilities",      isMandatory: true,  createdAt: day(2025, 11, 3)  },
        { amount:  1500, category: "Food",           isMandatory: true,  createdAt: day(2025, 11, 5)  },
        { amount:  1400, category: "Transport",      isMandatory: true,  createdAt: day(2025, 11, 6)  },
        { amount:  2000, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 11, 8)  },
        { amount:  2800, category: "Shopping",       isMandatory: false, createdAt: day(2025, 11, 10) },
        { amount:  1600, category: "Food",           isMandatory: false, createdAt: day(2025, 11, 12) },
        { amount:  1400, category: "Transport",      isMandatory: false, createdAt: day(2025, 11, 15) },
        { amount:  2200, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 11, 17) },
        { amount:  2800, category: "Shopping",       isMandatory: false, createdAt: day(2025, 11, 19) },
        { amount:  1700, category: "Food",           isMandatory: false, createdAt: day(2025, 11, 21) },
        { amount:  2200, category: "Entertainment",  isMandatory: false, createdAt: day(2025, 11, 23) },
        { amount:  2900, category: "Shopping",       isMandatory: false, createdAt: day(2025, 11, 26) },
        { amount:  1800, category: "Food",           isMandatory: false, createdAt: day(2025, 11, 28) },
        { amount:  2000, category: "Other",          isMandatory: false, createdAt: day(2025, 11, 30) },
      ],
      createdAt: monthStart(2025, 11),
    },

    // ── January 2026 — Healthy (55%) ────────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    22000,
      remainingBudget: 18000,
      budgetHealth: "Healthy",
      aiAdvice: {
        recommendation: "Proceed",
        advice: "New year, new discipline! January at just 55% is a great reset after December's overspend. Keep this momentum going.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  2800 },
        { category: "Transport",     limit:  3500, spent:  1000 },
        { category: "Utilities",     limit:  2500, spent:  1800 },
        { category: "Entertainment", limit:  3500, spent:   600 },
        { category: "Shopping",      limit:  4000, spent:   500 },
        { category: "Other",         limit:  2000, spent:   300 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2026, 0, 1)  },
        { amount:  1800, category: "Utilities",      isMandatory: true,  createdAt: day(2026, 0, 3)  },
        { amount:  1400, category: "Food",           isMandatory: true,  createdAt: day(2026, 0, 5)  },
        { amount:  1000, category: "Transport",      isMandatory: true,  createdAt: day(2026, 0, 7)  },
        { amount:  1400, category: "Food",           isMandatory: false, createdAt: day(2026, 0, 14) },
        { amount:   600, category: "Entertainment",  isMandatory: false, createdAt: day(2026, 0, 18) },
        { amount:   500, category: "Shopping",       isMandatory: false, createdAt: day(2026, 0, 22) },
        { amount:   300, category: "Other",          isMandatory: false, createdAt: day(2026, 0, 28) },
      ],
      createdAt: monthStart(2026, 0),
    },

    // ── February 2026 — Healthy (63%) ───────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    25200,
      remainingBudget: 14800,
      budgetHealth: "Healthy",
      aiAdvice: {
        recommendation: "Proceed",
        advice: "February is going smoothly at 63%. All categories are within limits. You could invest the surplus ₹14,800 or add it to your emergency fund.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  3500 },
        { category: "Transport",     limit:  3500, spent:  1400 },
        { category: "Utilities",     limit:  2500, spent:  2000 },
        { category: "Entertainment", limit:  3500, spent:  1300 },
        { category: "Shopping",      limit:  4000, spent:  1200 },
        { category: "Other",         limit:  2000, spent:   800 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2026, 1, 1)  },
        { amount:  2000, category: "Utilities",      isMandatory: true,  createdAt: day(2026, 1, 3)  },
        { amount:  1700, category: "Food",           isMandatory: true,  createdAt: day(2026, 1, 5)  },
        { amount:   700, category: "Transport",      isMandatory: true,  createdAt: day(2026, 1, 7)  },
        { amount:  1800, category: "Food",           isMandatory: false, createdAt: day(2026, 1, 11) },
        { amount:   700, category: "Transport",      isMandatory: false, createdAt: day(2026, 1, 14) },
        { amount:  1300, category: "Entertainment",  isMandatory: false, createdAt: day(2026, 1, 17) },
        { amount:  1200, category: "Shopping",       isMandatory: false, createdAt: day(2026, 1, 20) },
        { amount:   800, category: "Other",          isMandatory: false, createdAt: day(2026, 1, 25) },
      ],
      createdAt: monthStart(2026, 1),
    },

    // ── March 2026 — Tight (88%) ─────────────────────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    35200,
      remainingBudget: 4800,
      budgetHealth: "Tight",
      aiAdvice: {
        recommendation: "Caution",
        advice: "March is tight at 88%. Entertainment and Utilities pushed past their category limits. Only ₹4,800 left — stick to essentials for the rest of the month.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  5500 },
        { category: "Transport",     limit:  3500, spent:  2800 },
        { category: "Utilities",     limit:  2500, spent:  2800 },
        { category: "Entertainment", limit:  3500, spent:  3800 },
        { category: "Shopping",      limit:  4000, spent:  3800 },
        { category: "Other",         limit:  2000, spent:  1500 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2026, 2, 1)  },
        { amount:  2800, category: "Utilities",      isMandatory: true,  createdAt: day(2026, 2, 3)  },
        { amount:  1700, category: "Food",           isMandatory: true,  createdAt: day(2026, 2, 5)  },
        { amount:  1400, category: "Transport",      isMandatory: true,  createdAt: day(2026, 2, 7)  },
        { amount:  1900, category: "Food",           isMandatory: false, createdAt: day(2026, 2, 10) },
        { amount:  1400, category: "Transport",      isMandatory: false, createdAt: day(2026, 2, 13) },
        { amount:  1800, category: "Entertainment",  isMandatory: false, createdAt: day(2026, 2, 15) },
        { amount:  1800, category: "Shopping",       isMandatory: false, createdAt: day(2026, 2, 17) },
        { amount:  1900, category: "Food",           isMandatory: false, createdAt: day(2026, 2, 20) },
        { amount:  2000, category: "Entertainment",  isMandatory: false, createdAt: day(2026, 2, 22) },
        { amount:  2000, category: "Shopping",       isMandatory: false, createdAt: day(2026, 2, 24) },
        { amount:  1500, category: "Other",          isMandatory: false, createdAt: day(2026, 2, 28) },
      ],
      createdAt: monthStart(2026, 2),
    },

    // ── April 2026 — Healthy / in-progress (50%) ─────────────
    {
      userId,
      monthlyBudget: 40000,
      totalSpent:    20000,
      remainingBudget: 20000,
      budgetHealth: "Healthy",
      aiAdvice: {
        recommendation: "Proceed",
        advice: "April is off to a great start at 50% with half the month still ahead. All categories are well within limits. Keep this pace to finish the year on a high.",
      },
      categoryLimits: [
        { category: "Rent/EMI",      limit: 15000, spent: 15000 },
        { category: "Food",          limit:  7000, spent:  2200 },
        { category: "Transport",     limit:  3500, spent:   800 },
        { category: "Utilities",     limit:  2500, spent:  1200 },
        { category: "Entertainment", limit:  3500, spent:   500 },
        { category: "Shopping",      limit:  4000, spent:   300 },
        { category: "Other",         limit:  2000, spent:     0 },
      ],
      expenses: [
        { amount: 15000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2026, 3, 1)  },
        { amount:  1200, category: "Utilities",      isMandatory: true,  createdAt: day(2026, 3, 3)  },
        { amount:  1100, category: "Food",           isMandatory: true,  createdAt: day(2026, 3, 5)  },
        { amount:   500, category: "Transport",      isMandatory: true,  createdAt: day(2026, 3, 7)  },
        { amount:  1100, category: "Food",           isMandatory: false, createdAt: day(2026, 3, 12) },
        { amount:   300, category: "Transport",      isMandatory: false, createdAt: day(2026, 3, 15) },
        { amount:   500, category: "Entertainment",  isMandatory: false, createdAt: day(2026, 3, 18) },
        { amount:   300, category: "Shopping",       isMandatory: false, createdAt: day(2026, 3, 22) },
      ],
      createdAt: monthStart(2026, 3),
    },
  ];
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI.trim());
  console.log("Connected to MongoDB\n");

  let user = await User.findOne({ email: USER.email });
  if (!user) {
    const hashed = await bcrypt.hash(USER.password, 10);
    user = await User.create({
      name: USER.name, email: USER.email, password: hashed,
      isAdmin: false, status: "approved",
    });
    console.log(`Created user: ${USER.email}  (password: ${USER.password})`);
  } else {
    user.status = "approved";
    await user.save();
    console.log(`Found existing user: ${USER.email} — set to approved`);
  }

  const deleted = await Budget.deleteMany({ userId: user._id });
  if (deleted.deletedCount) console.log(`Removed ${deleted.deletedCount} old budget(s)`);

  const budgets = buildBudgets(user._id);
  for (const b of budgets) {
    await Budget.create(b);
  }

  console.log(`Inserted ${budgets.length} budgets (May 2025 – Apr 2026)`);
  console.log("Done!");
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
