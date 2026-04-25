const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require('fs');
const path = require("path");
const { runExpenseAnalysis, budgetCreation, expenseAdding } = require("./ai/orchestrator");
const Budget = require("./models/BudgetSchema");
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
 
const Expense = mongoose.model("Expense", ExpenseSchema);

// budget creation post method
app.post("/create-budget", async (req, res) => {
  try {
    const { monthlyBudget, expenses } = req.body;
    const aiResult = await budgetCreation({ monthlyBudget, expenses });
    
    const { totalSpent, remainingBudget, budgetHealth, recommendation, advice } = aiResult;
    const budget = new Budget({
      monthlyBudget,
      totalSpent,
      remainingBudget,
      budgetHealth,
      aiAdvice: {
        recommendation,
        advice
      },
      expenses
    });

    const saveBudget = await budget.save();

    res.json({
      success: true,
      budgetId: saveBudget._id,
      message: "budget created and saved successfully",
      aiResult
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: "Budget not created or returned invalid JSON from AI"
    })
  }
});

app.post("/add-expense", async(req, res) => {
  try {
    const { expense, id } = req.body;
    // const budget = await Budget.findOne({ userId });
    const budget = await Budget.findById(id);
    if(!budget) {
      return res.status(404).json({ error: "Budget not found in system "});
    }
    const aiResult = await expenseAdding({ budget, expense });

    // update the new changes in db
    budget.expenses.push(expense);
    budget.totalSpent = aiResult.totalSpent;
    budget.remainingBudget = aiResult.remainingBudget;
    budget.budgetHealth = aiResult.budgetHealth;
    budget.aiAdvice = {
      recommendation: aiResult.recommendation,
      advice: aiResult.advice
    };

    // save it in db
    await budget.save();

    const newlyAddedExpense = budget.expenses[budget.expenses.length - 1];

    res.json({
      success: true,
      expenseId: newlyAddedExpense._id,
      message: "expense added succesfully",
      aiResult,

    })
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: "Expense is not able to add or returned invalid json from AI"
    })
  }
})
 
 
app.listen(5000, () => console.log("Server running on port 5000"));