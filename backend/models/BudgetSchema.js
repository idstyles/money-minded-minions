const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  isMandatory: {
    type: Boolean,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const BudgetSchema = new mongoose.Schema({
//   userId: {  // much important otherwise hard to retrieve data for the particular user
//     type: Number,
//     required: true
//   },

//   // Budget period (important for monthly budgets)
//   month: { // much important otherwise monthly budget we can't able to store
//     type: String, // e.g. "2026-04"
//     required: true
//   },

  // -------- Financial State (Backend Truth) --------
  monthlyBudget: Number,
  totalSpent: Number,
  remainingBudget: Number,
  budgetHealth: String,

  // -------- Expense History --------
  expenses: [ExpenseSchema],

  // -------- AI Advice Snapshot --------
  aiAdvice: {
    recommendation: String,
    advice: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Budget = mongoose.model("Budget", BudgetSchema);

module.exports = Budget;