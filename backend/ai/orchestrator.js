const fs = require("fs");
const path = require("path");
const { callLLM } = require("./azureOpenAi");

// Load system prompt
// const budgetPlannerPrompt = fs.readFileSync(
//   path.join(__dirname, "prompts", "budgetPlanner.txt"),
//   "utf-8"
// );

// const expenseEvaluatorPrompt = fs.readFileSync(
//   path.join(__dirname, "prompts", "expenseEvaluator.txt"),
//   "utf-8"
// );

// const advisorPrompt = fs.readFileSync(
//   path.join(__dirname, "prompts", "advisor.txt"),
//   "utf-8"
// );

const budgetCreationPrmopt = fs.readFileSync(
    path.join(__dirname, "prompts", "budgetCreator.txt"), "utf-8"
);

const addExpensePrompt = fs.readFileSync(
      path.join(__dirname, "prompts", "addExpenseReview.txt"),
      "utf-8"
    );


// Multi-agent orchestration function
// async function runExpenseAnalysis({ monthlyBudget, mandatorySpent, newExpense }) {
//     const plannerResponse = await callLLM({
//         messages: [
//             { role: "system", content: budgetPlannerPrompt },
//             { role: "user", content: `Monthly Budget: ${monthlyBudget}
//                                         Mandatory Spent: ${mandatorySpent}` 
//             }
//         ], 
//         temperature: 0.2,
//         max_tokens: 200

//     });

//     const budgetContext = JSON.parse(plannerResponse.choices[0].message.content);
    
//     const expenseContext = newExpense?.expenseContext && typeof newExpense.expenseContext === "string" ? newExpense.expenseContext : "None provided";

//     const evaluatorResponse = await callLLM({
//         messages: [
//             { role: "system", content: expenseEvaluatorPrompt },
//             { role: "user", content: `Budget Context: ${JSON.stringify(budgetContext)}
//                                         New Expense:
//                                         Category: ${newExpense?.category || "Unknown"}
//                                         Amount: ${newExpense?.amount || null}
//                                         Context: ${expenseContext}` }
//         ],
//         temperature: 0.2,
//         max_tokens: 300
//     });

//     const evaluationResult = JSON.parse(evaluatorResponse.choices[0].message.content);

//     const advisorResponse = await callLLM({
//         messages: [
//             { role: "system", content: advisorPrompt },
//             { role: "user", content: `Expense Evaluation: ${JSON.stringify(evaluationResult)}` }
//         ],
//         temperature: 0.4,
//         max_tokens: 200
//     });

//     const advice = advisorResponse.choices[0].message.content;

//     return {
//         budgetContext,
//         evaluatorResponse,
//         advisorResponse
//     };

// }


// budget creation llm request
async function budgetCreation({ monthlyBudget, expenses }) {

    const mandatorySpent = expenses.filter((e) => e.isMandatory).reduce((sum, e) => sum + e.amount, 0);
    const nonMandatorySpentList = expenses.filter((e) => !e.isMandatory);
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remainingBudget = monthlyBudget - totalSpent;

    const budgetCreationRes = await callLLM({
        messages: [
            { role: "system", content: budgetCreationPrmopt },
            { role: "user", content: `Monthly Budget: ${monthlyBudget}
                                      Mandatory Spent: ${mandatorySpent}
                                      Non-mandatory Expenses: ${JSON.stringify(nonMandatorySpentList)}
                                      Total Spent: ${totalSpent}
                                      Remaining Budget: ${remainingBudget}`}
        ], 
        temperature: 0.2,
        max_tokens: 300,
    })

    const budgetResponse = budgetCreationRes.choices[0].message.content;
    return JSON.parse(budgetResponse);
};

// new expense adding llm request
async function expenseAdding({ budget, expense }) {

   

    const totalSpent = budget.totalSpent + expense.amount;
    let mandatorySpent = budget.mandatorySpent;
    let nonMandatorySpent = budget.nonMandatorySpent; 
    if (expense.isMandatory) {
      mandatorySpent += expense.amount;
    } else {
      nonMandatorySpent += expense.amount;
    }

    const remainingBudget = budget.monthlyBudget - totalSpent;

    const expenseAddRes = await callLLM({
        messages: [
            { role: "system", content: addExpensePrompt },
            { role: "user", content: `revious Budget Health: ${budget.budgetHealth}
                                        Previous AI Advice: ${budget.aiAdvice.advice}

                                        New Expense:
                                        Category: ${expense.category}
                                        Amount: ${expense.amount}
                                        Is Mandatory: ${expense.isMandatory}

                                        Updated State:
                                        Monthly Budget: ${budget.monthlyBudget}
                                        Total Spent: ${totalSpent}
                                        Remaining Budget: ${remainingBudget}
                                        Mandatory Spent: ${mandatorySpent}
                                        Non-Mandatory Spent: ${nonMandatorySpent}`}
        ],
        temperature: 0.2,
        max_tokens: 300,
    });

    const expenseRes = expenseAddRes.choices[0].message.content;
    return JSON.parse(expenseRes);
}

module.exports = { budgetCreation, expenseAdding };