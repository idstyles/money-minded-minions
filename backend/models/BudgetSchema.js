const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  isMandatory: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now }
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
  aiAdvice: {
    recommendation: String,
    advice: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Budget", BudgetSchema);
