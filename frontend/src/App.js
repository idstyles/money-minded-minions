import { useState } from "react";
 
function App() {
  const [amount, setAmount] = useState("");
  const [budget, setBudget] = useState("");
  const [result, setResult] = useState(null);
 
  const submitExpense = async () => {
    const res = await fetch("http://localhost:5000/add-expense", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Number(amount),
        monthlyBudget: Number(budget)
      })
    });
 
    const data = await res.json();
    setResult(data);
  };
 
  return (
<div style={{ padding: 20 }}>
<h2>Finance Tracker</h2>
 
      <input
        placeholder="Monthly Budget"
        onChange={(e) => setBudget(e.target.value)}
      />
<br /><br />
 
      <input
        placeholder="Today's Expense"
        onChange={(e) => setAmount(e.target.value)}
      />
<br /><br />
 
      <button onClick={submitExpense}>Submit</button>
 
      {result && (
<div>
<h3>Status: {result.status}</h3>
<p>Total Spent: {result.totalSpent}</p>
<p>Usage: {result.percentage.toFixed(2)}%</p>
</div>
      )}
</div>
  );
}
 
export default App;