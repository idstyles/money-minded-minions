class ForecastService {
  // Exponential decay weights: index 0 = oldest, last = most recent
  _weights(n) {
    const decay = 0.8;
    const raw = Array.from({ length: n }, (_, i) => Math.pow(decay, n - 1 - i));
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map((w) => w / sum);
  }

  weightedAvg(values, weights) {
    if (!values.length) return 0;
    return values.reduce((sum, val, i) => sum + val * (weights[i] ?? 0), 0);
  }

  variance(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  coefficientOfVariation(values) {
    if (!values.length) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;
    return Math.sqrt(this.variance(values)) / mean;
  }

  confidence(n, cv) {
    if (n < 3) return "Insufficient";
    if (n < 6 || cv > 0.3) return "Low";
    if (cv > 0.15) return "Medium";
    return "High";
  }

  categoryPredictions(budgets) {
    // Collect all distinct categories
    const allCategories = new Set();
    for (const b of budgets) {
      for (const e of b.expenses || []) allCategories.add(e.category);
    }

    const predictions = [];
    for (const category of allCategories) {
      // Build per-month spend for this category (0 if absent in a month)
      const monthlySpends = budgets.map((b) =>
        (b.expenses || [])
          .filter((e) => e.category === category)
          .reduce((sum, e) => sum + e.amount, 0)
      );

      // Only include months where category appeared at least once (exclude structual 0s for new cats)
      const nonZeroCount = monthlySpends.filter((v) => v > 0).length;
      if (nonZeroCount === 0) continue;

      const isNew = nonZeroCount === 1 && budgets.length > 1;

      // Use only months where category had spend for avg; weight by recency among those months
      const activeSpendsWithIdx = monthlySpends
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => v > 0);

      const activeValues = activeSpendsWithIdx.map(({ v }) => v);
      const weights = this._weights(activeValues.length);
      const predicted = this.weightedAvg(activeValues, weights);
      const cv = this.coefficientOfVariation(activeValues);

      predictions.push({
        category,
        predicted: Math.round(predicted),
        isHighVariance: cv > 0.3,
        isNew,
        monthsPresent: nonZeroCount,
      });
    }

    return predictions.sort((a, b) => b.predicted - a.predicted);
  }

  smartAdvisor(currentBudget, predictedMonthlySpend) {
    if (!currentBudget) {
      return { currentBalance: 0, predictedRemainingSpend: 0, safeSpendingLimit: 0, recommendation: "inadvisable" };
    }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const remainingDays = daysInMonth - dayOfMonth;

    const dailyRate = predictedMonthlySpend / daysInMonth;
    const predictedRemainingSpend = Math.round(dailyRate * remainingDays);
    const currentBalance = currentBudget.remainingBudget ?? 0;
    const safeSpendingLimit = currentBalance - predictedRemainingSpend;
    const safeThreshold = (currentBudget.monthlyBudget ?? 0) * 0.1;

    let recommendation;
    if (safeSpendingLimit > safeThreshold) recommendation = "safe";
    else if (safeSpendingLimit > 0) recommendation = "caution";
    else recommendation = "inadvisable";

    return {
      currentBalance,
      predictedRemainingSpend,
      safeSpendingLimit,
      recommendation,
    };
  }

  generate(budgets, lookbackMonths) {
    const sorted = [...budgets].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const sliced = sorted.slice(-lookbackMonths);

    const actualMonthsUsed = sliced.length;
    const insufficientData = actualMonthsUsed < 3;

    if (actualMonthsUsed === 0) {
      return {
        lookbackMonths,
        actualMonthsUsed: 0,
        insufficientData: true,
        predictedBudget: 0,
        predictedSpend: 0,
        predictedBalance: 0,
        confidence: "Insufficient",
        categoryPredictions: [],
        historicalData: [],
        smartAdvisor: this.smartAdvisor(null, 0),
      };
    }

    const budgetAmounts = sliced.map((b) => b.monthlyBudget);
    const spentAmounts = sliced.map((b) => b.totalSpent);
    const weights = this._weights(actualMonthsUsed);

    const predictedBudget = Math.round(this.weightedAvg(budgetAmounts, weights));
    const predictedSpend = Math.round(this.weightedAvg(spentAmounts, weights));
    const predictedBalance = predictedBudget - predictedSpend;

    const budgetCV = this.coefficientOfVariation(budgetAmounts);
    const spendCV = this.coefficientOfVariation(spentAmounts);
    const overallCV = Math.max(budgetCV, spendCV);
    const conf = this.confidence(actualMonthsUsed, overallCV);

    const catPredictions = this.categoryPredictions(sliced);

    const historicalData = sliced.map((b) => {
      const date = new Date(b.createdAt);
      const monthLabel = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      return {
        monthLabel,
        budget: b.monthlyBudget,
        spent: b.totalSpent,
        remaining: b.remainingBudget,
        exceededBudget: b.totalSpent > b.monthlyBudget,
      };
    });

    const currentBudget = sorted[sorted.length - 1] ?? null;
    const advisor = this.smartAdvisor(currentBudget, predictedSpend);

    return {
      lookbackMonths,
      actualMonthsUsed,
      insufficientData,
      predictedBudget,
      predictedSpend,
      predictedBalance,
      confidence: conf,
      categoryPredictions: catPredictions,
      historicalData,
      smartAdvisor: advisor,
    };
  }
}

module.exports = new ForecastService();
module.exports.ForecastService = ForecastService;
