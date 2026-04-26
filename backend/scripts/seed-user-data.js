const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const User   = require("../models/UserSchema");
const Budget = require("../models/BudgetSchema");

// ── Users to seed ─────────────────────────────────────────────
const USERS = [
  { name: "Indranuj",  email: "indranuj321@gmail.com",          password: "User@123" },
  { name: "Bijoy",     email: "bijoy@moneymindedminions.com",   password: "User@123" },
];

// ── Month helpers ─────────────────────────────────────────────
function monthStart(year, month) { return new Date(year, month, 1); }   // month 0-indexed
function day(year, month, d)     { return new Date(year, month, d); }

// ── Budget templates per month ────────────────────────────────
function budgetsFor(userId, name) {
  const isBijoy = name === "Bijoy";

  return [
    // ── February 2026 ────────────────────────────────────────
    {
      userId,
      monthlyBudget: isBijoy ? 45000 : 38000,
      totalSpent:    isBijoy ? 38200 : 31500,
      remainingBudget: isBijoy ? 6800 : 6500,
      budgetHealth: "Healthy",
      aiAdvice: {
        recommendation: "Proceed",
        advice: `Good spending discipline in February ${name}! You stayed well within budget. Consider putting the surplus into an emergency fund or SIP.`,
      },
      categoryLimits: [
        { category: "Rent/EMI",       limit: isBijoy ? 18000 : 14000, spent: isBijoy ? 18000 : 14000 },
        { category: "Food",           limit: isBijoy ? 8000  : 7000,  spent: isBijoy ? 7400  : 6200  },
        { category: "Transport",      limit: isBijoy ? 4000  : 3500,  spent: isBijoy ? 3200  : 3000  },
        { category: "Utilities",      limit: isBijoy ? 3000  : 2500,  spent: isBijoy ? 2800  : 2400  },
        { category: "Entertainment",  limit: isBijoy ? 4000  : 3500,  spent: isBijoy ? 3100  : 2900  },
        { category: "Shopping",       limit: isBijoy ? 5000  : 4000,  spent: isBijoy ? 3700  : 3000  },
      ],
      expenses: [
        { amount: isBijoy ? 18000 : 14000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2026, 1, 1)  },
        { amount: isBijoy ? 1400  : 1200,  category: "Food",           isMandatory: true,  createdAt: day(2026, 1, 3)  },
        { amount: isBijoy ? 800   : 700,   category: "Transport",      isMandatory: true,  createdAt: day(2026, 1, 4)  },
        { amount: isBijoy ? 2800  : 2400,  category: "Utilities",      isMandatory: true,  createdAt: day(2026, 1, 5)  },
        { amount: isBijoy ? 1200  : 1000,  category: "Food",           isMandatory: false, createdAt: day(2026, 1, 7)  },
        { amount: isBijoy ? 1800  : 1500,  category: "Shopping",       isMandatory: false, createdAt: day(2026, 1, 10) },
        { amount: isBijoy ? 900   : 800,   category: "Entertainment",  isMandatory: false, createdAt: day(2026, 1, 12) },
        { amount: isBijoy ? 1200  : 1000,  category: "Transport",      isMandatory: false, createdAt: day(2026, 1, 14) },
        { amount: isBijoy ? 1600  : 1400,  category: "Food",           isMandatory: false, createdAt: day(2026, 1, 16) },
        { amount: isBijoy ? 1200  : 1000,  category: "Shopping",       isMandatory: false, createdAt: day(2026, 1, 18) },
        { amount: isBijoy ? 1100  : 900,   category: "Entertainment",  isMandatory: false, createdAt: day(2026, 1, 20) },
        { amount: isBijoy ? 700   : 600,   category: "Transport",      isMandatory: false, createdAt: day(2026, 1, 22) },
        { amount: isBijoy ? 1500  : 1200,  category: "Food",           isMandatory: false, createdAt: day(2026, 1, 24) },
        { amount: isBijoy ? 1100  : 800,   category: "Shopping",       isMandatory: false, createdAt: day(2026, 1, 26) },
        { amount: isBijoy ? 1100  : 900,   category: "Entertainment",  isMandatory: false, createdAt: day(2026, 1, 27) },
        { amount: isBijoy ? 1500  : 1100,  category: "Other",          isMandatory: false, createdAt: day(2026, 1, 28) },
      ],
      createdAt: monthStart(2026, 1),
    },

    // ── March 2026 ───────────────────────────────────────────
    {
      userId,
      monthlyBudget: isBijoy ? 45000 : 38000,
      totalSpent:    isBijoy ? 47200 : 40800,
      remainingBudget: isBijoy ? -2200 : -2800,
      budgetHealth: "Critical",
      aiAdvice: {
        recommendation: "Avoid",
        advice: `You went over budget in March ${name}. The bulk of overspending came from Shopping and Entertainment. Try setting stricter category limits next month and avoid impulse purchases.`,
      },
      categoryLimits: [
        { category: "Rent/EMI",       limit: isBijoy ? 18000 : 14000, spent: isBijoy ? 18000 : 14000 },
        { category: "Food",           limit: isBijoy ? 8000  : 7000,  spent: isBijoy ? 9200  : 7800  },
        { category: "Transport",      limit: isBijoy ? 4000  : 3500,  spent: isBijoy ? 3800  : 3200  },
        { category: "Utilities",      limit: isBijoy ? 3000  : 2500,  spent: isBijoy ? 3100  : 2600  },
        { category: "Entertainment",  limit: isBijoy ? 4000  : 3500,  spent: isBijoy ? 5600  : 4900  },
        { category: "Shopping",       limit: isBijoy ? 5000  : 4000,  spent: isBijoy ? 7500  : 8300  },
      ],
      expenses: [
        { amount: isBijoy ? 18000 : 14000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2026, 2, 1)  },
        { amount: isBijoy ? 3100  : 2600,  category: "Utilities",      isMandatory: true,  createdAt: day(2026, 2, 2)  },
        { amount: isBijoy ? 1500  : 1300,  category: "Food",           isMandatory: true,  createdAt: day(2026, 2, 3)  },
        { amount: isBijoy ? 800   : 700,   category: "Transport",      isMandatory: true,  createdAt: day(2026, 2, 4)  },
        { amount: isBijoy ? 2200  : 1800,  category: "Shopping",       isMandatory: false, createdAt: day(2026, 2, 6)  },
        { amount: isBijoy ? 1800  : 1500,  category: "Food",           isMandatory: false, createdAt: day(2026, 2, 8)  },
        { amount: isBijoy ? 1400  : 1200,  category: "Entertainment",  isMandatory: false, createdAt: day(2026, 2, 10) },
        { amount: isBijoy ? 1200  : 1000,  category: "Transport",      isMandatory: false, createdAt: day(2026, 2, 12) },
        { amount: isBijoy ? 3500  : 3200,  category: "Shopping",       isMandatory: false, createdAt: day(2026, 2, 14) },
        { amount: isBijoy ? 1800  : 1600,  category: "Food",           isMandatory: false, createdAt: day(2026, 2, 16) },
        { amount: isBijoy ? 2200  : 1900,  category: "Entertainment",  isMandatory: false, createdAt: day(2026, 2, 18) },
        { amount: isBijoy ? 1800  : 1700,  category: "Food",           isMandatory: false, createdAt: day(2026, 2, 20) },
        { amount: isBijoy ? 1800  : 3100,  category: "Shopping",       isMandatory: false, createdAt: day(2026, 2, 22) },
        { amount: isBijoy ? 1800  : 1200,  category: "Entertainment",  isMandatory: false, createdAt: day(2026, 2, 24) },
        { amount: isBijoy ? 1800  : 1800,  category: "Transport",      isMandatory: false, createdAt: day(2026, 2, 26) },
        { amount: isBijoy ? 2500  : 2200,  category: "Other",          isMandatory: false, createdAt: day(2026, 2, 28) },
      ],
      createdAt: monthStart(2026, 2),
    },

    // ── April 2026 (current, in-progress) ────────────────────
    {
      userId,
      monthlyBudget: isBijoy ? 45000 : 38000,
      totalSpent:    isBijoy ? 28500 : 22400,
      remainingBudget: isBijoy ? 16500 : 15600,
      budgetHealth: "Healthy",
      aiAdvice: {
        recommendation: "Proceed",
        advice: `April is looking good ${name}! You're at 63% of your monthly budget with a week left. Keep Entertainment and Shopping in check to end the month in the green.`,
      },
      categoryLimits: [
        { category: "Rent/EMI",       limit: isBijoy ? 18000 : 14000, spent: isBijoy ? 18000 : 14000 },
        { category: "Food",           limit: isBijoy ? 8000  : 7000,  spent: isBijoy ? 4200  : 3600  },
        { category: "Transport",      limit: isBijoy ? 4000  : 3500,  spent: isBijoy ? 1800  : 1400  },
        { category: "Utilities",      limit: isBijoy ? 3000  : 2500,  spent: isBijoy ? 2700  : 2200  },
        { category: "Entertainment",  limit: isBijoy ? 4000  : 3500,  spent: isBijoy ? 1200  : 800   },
        { category: "Shopping",       limit: isBijoy ? 5000  : 4000,  spent: isBijoy ? 600   : 400   },
      ],
      expenses: [
        { amount: isBijoy ? 18000 : 14000, category: "Rent/EMI",      isMandatory: true,  createdAt: day(2026, 3, 1)  },
        { amount: isBijoy ? 2700  : 2200,  category: "Utilities",      isMandatory: true,  createdAt: day(2026, 3, 3)  },
        { amount: isBijoy ? 1400  : 1200,  category: "Food",           isMandatory: true,  createdAt: day(2026, 3, 5)  },
        { amount: isBijoy ? 600   : 500,   category: "Transport",      isMandatory: true,  createdAt: day(2026, 3, 7)  },
        { amount: isBijoy ? 1200  : 1000,  category: "Food",           isMandatory: false, createdAt: day(2026, 3, 10) },
        { amount: isBijoy ? 600   : 400,   category: "Shopping",       isMandatory: false, createdAt: day(2026, 3, 12) },
        { amount: isBijoy ? 800   : 600,   category: "Transport",      isMandatory: false, createdAt: day(2026, 3, 15) },
        { amount: isBijoy ? 1200  : 900,   category: "Entertainment",  isMandatory: false, createdAt: day(2026, 3, 17) },
        { amount: isBijoy ? 1400  : 1100,  category: "Food",           isMandatory: false, createdAt: day(2026, 3, 20) },
        { amount: isBijoy ? 400   : 300,   category: "Entertainment",  isMandatory: false, createdAt: day(2026, 3, 22) },
        { amount: isBijoy ? 1200  : 900,   category: "Food",           isMandatory: false, createdAt: day(2026, 3, 24) },
        { amount: isBijoy ? 400   : 300,   category: "Transport",      isMandatory: false, createdAt: day(2026, 3, 25) },
      ],
      createdAt: monthStart(2026, 3),
    },
  ];
}

// ── Main ──────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(process.env.MONGO_URI.trim());
  console.log("Connected to MongoDB\n");

  for (const u of USERS) {
    // Find or create user
    let user = await User.findOne({ email: u.email });
    if (!user) {
      const hashed = await bcrypt.hash(u.password, 10);
      user = await User.create({
        name: u.name, email: u.email, password: hashed,
        isAdmin: false, status: "approved",
      });
      console.log(`✅  Created user: ${u.email}  (password: ${u.password})`);
    } else {
      // Ensure approved
      user.status = "approved";
      await user.save();
      console.log(`👤  Found existing user: ${u.email} — set to approved`);
    }

    // Remove old budgets for this user
    const deleted = await Budget.deleteMany({ userId: user._id });
    if (deleted.deletedCount) console.log(`    Removed ${deleted.deletedCount} old budget(s)`);

    // Insert budgets
    const templates = budgetsFor(user._id, u.name);
    for (const b of templates) {
      await Budget.create(b);
    }
    console.log(`    Inserted ${templates.length} budgets (Feb, Mar, Apr 2026)\n`);
  }

  console.log("🍌  Done! All seed data inserted.");
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
