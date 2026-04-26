const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  isMandatory: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now }
});

const CategoryLimitSchema = new mongoose.Schema({
  category: { type: String, required: true },
  limit: { type: Number, required: true },
  spent: { type: Number, default: 0 }
});

const BudgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  monthlyBudget: Number,
  totalSpent: Number,
  remainingBudget: Number,
  budgetHealth: String,
  expenses: [ExpenseSchema],
  categoryLimits: [CategoryLimitSchema],
  aiAdvice: {
    recommendation: String,
    advice: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Budget", BudgetSchema);
