const { ForecastService } = require("./forecastService");

function makeService() {
  return new ForecastService();
}

function makeBudget(monthlyBudget, totalSpent, expenses = [], createdAt) {
  return {
    monthlyBudget,
    totalSpent,
    remainingBudget: monthlyBudget - totalSpent,
    expenses,
    categoryLimits: [],
    createdAt: createdAt || new Date().toISOString(),
  };
}

// ─── _weights ────────────────────────────────────────────────

describe("_weights(n)", () => {
  test("returns n weights that sum to 1", () => {
    const svc = makeService();
    for (const n of [1, 3, 6, 12]) {
      const w = svc._weights(n);
      expect(w).toHaveLength(n);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }
  });

  test("last weight is the largest (most recent month weighted highest)", () => {
    const svc = makeService();
    const w = svc._weights(5);
    for (let i = 0; i < w.length - 1; i++) {
      expect(w[w.length - 1]).toBeGreaterThan(w[i]);
    }
  });
});

// ─── weightedAvg ─────────────────────────────────────────────

describe("weightedAvg", () => {
  test("returns exact value for a single element", () => {
    const svc = makeService();
    expect(svc.weightedAvg([500], [1])).toBe(500);
  });

  test("weights recent values higher than older ones", () => {
    const svc = makeService();
    const w = svc._weights(2);
    // second value should dominate
    const result = svc.weightedAvg([100, 900], w);
    expect(result).toBeGreaterThan(500);
  });

  test("returns 0 for empty array", () => {
    const svc = makeService();
    expect(svc.weightedAvg([], [])).toBe(0);
  });
});

// ─── variance ────────────────────────────────────────────────

describe("variance", () => {
  test("returns 0 for a uniform array", () => {
    const svc = makeService();
    expect(svc.variance([200, 200, 200])).toBe(0);
  });

  test("returns correct value for known input", () => {
    const svc = makeService();
    // mean = 2, variance = ((1-2)^2 + (2-2)^2 + (3-2)^2) / 3 = 2/3
    expect(svc.variance([1, 2, 3])).toBeCloseTo(2 / 3, 5);
  });

  test("returns 0 for single-element array", () => {
    const svc = makeService();
    expect(svc.variance([42])).toBe(0);
  });
});

// ─── confidence ──────────────────────────────────────────────

describe("confidence", () => {
  test("returns Insufficient for n < 3", () => {
    const svc = makeService();
    expect(svc.confidence(0, 0)).toBe("Insufficient");
    expect(svc.confidence(1, 0)).toBe("Insufficient");
    expect(svc.confidence(2, 0.1)).toBe("Insufficient");
  });

  test("returns Low for n < 6 (regardless of CV)", () => {
    const svc = makeService();
    expect(svc.confidence(3, 0.05)).toBe("Low");
    expect(svc.confidence(5, 0.05)).toBe("Low");
  });

  test("returns Low for high CV (> 0.3) even with many months", () => {
    const svc = makeService();
    expect(svc.confidence(12, 0.4)).toBe("Low");
  });

  test("returns Medium for CV between 0.15 and 0.3 with n >= 6", () => {
    const svc = makeService();
    expect(svc.confidence(6, 0.2)).toBe("Medium");
  });

  test("returns High for low CV with n >= 6", () => {
    const svc = makeService();
    expect(svc.confidence(6, 0.05)).toBe("High");
    expect(svc.confidence(12, 0.1)).toBe("High");
  });
});

// ─── generate ────────────────────────────────────────────────

describe("generate", () => {
  test("returns insufficientData true when fewer than 3 months provided", () => {
    const svc = makeService();
    const budgets = [makeBudget(3000, 2500)];
    const result = svc.generate(budgets, 12);
    expect(result.insufficientData).toBe(true);
    expect(result.confidence).toBe("Insufficient");
  });

  test("sets insufficientData false when 3+ months provided", () => {
    const svc = makeService();
    const budgets = [
      makeBudget(3000, 2500, [], "2026-02-01"),
      makeBudget(3000, 2600, [], "2026-03-01"),
      makeBudget(3000, 2400, [], "2026-04-01"),
    ];
    const result = svc.generate(budgets, 12);
    expect(result.insufficientData).toBe(false);
  });

  test("predictedBalance equals predictedBudget minus predictedSpend", () => {
    const svc = makeService();
    const budgets = [
      makeBudget(3000, 2500, [], "2026-02-01"),
      makeBudget(3200, 2800, [], "2026-03-01"),
      makeBudget(3100, 2600, [], "2026-04-01"),
    ];
    const result = svc.generate(budgets, 12);
    expect(result.predictedBalance).toBe(result.predictedBudget - result.predictedSpend);
  });

  test("respects lookback limit (uses only last N months)", () => {
    const svc = makeService();
    // 5 months of data but ask for 3
    const budgets = [
      makeBudget(1000, 800, [], "2025-12-01"),
      makeBudget(1000, 800, [], "2026-01-01"),
      makeBudget(5000, 4000, [], "2026-02-01"),
      makeBudget(5000, 4100, [], "2026-03-01"),
      makeBudget(5000, 4200, [], "2026-04-01"),
    ];
    const result = svc.generate(budgets, 3);
    expect(result.actualMonthsUsed).toBe(3);
    // Predicted should be near 5000, not influenced by the 1000-budget months
    expect(result.predictedBudget).toBeGreaterThan(3000);
  });

  test("returns empty arrays and zero values when no budgets provided", () => {
    const svc = makeService();
    const result = svc.generate([], 12);
    expect(result.actualMonthsUsed).toBe(0);
    expect(result.insufficientData).toBe(true);
    expect(result.categoryPredictions).toEqual([]);
    expect(result.historicalData).toEqual([]);
  });

  test("marks high-variance categories", () => {
    const svc = makeService();
    const budgets = [
      makeBudget(5000, 3000, [
        { category: "Food", amount: 2000, isMandatory: false },
        { category: "Entertainment", amount: 100, isMandatory: false },
      ], "2026-01-01"),
      makeBudget(5000, 3000, [
        { category: "Food", amount: 2100, isMandatory: false },
        { category: "Entertainment", amount: 1500, isMandatory: false },
      ], "2026-02-01"),
      makeBudget(5000, 3000, [
        { category: "Food", amount: 1900, isMandatory: false },
        { category: "Entertainment", amount: 50, isMandatory: false },
      ], "2026-03-01"),
    ];
    const result = svc.generate(budgets, 12);
    const food  = result.categoryPredictions.find((c) => c.category === "Food");
    const ent   = result.categoryPredictions.find((c) => c.category === "Entertainment");
    // Food is stable (~2000 each month) → not high variance
    expect(food.isHighVariance).toBe(false);
    // Entertainment swings wildly → high variance
    expect(ent.isHighVariance).toBe(true);
  });

  test("marks new categories (present in only 1 of multiple months)", () => {
    const svc = makeService();
    const budgets = [
      makeBudget(5000, 2000, [{ category: "Food", amount: 2000, isMandatory: false }], "2026-02-01"),
      makeBudget(5000, 2000, [{ category: "Food", amount: 2000, isMandatory: false }], "2026-03-01"),
      makeBudget(5000, 2500, [
        { category: "Food", amount: 2000, isMandatory: false },
        { category: "Shopping", amount: 500, isMandatory: false },
      ], "2026-04-01"),
    ];
    const result = svc.generate(budgets, 12);
    const shopping = result.categoryPredictions.find((c) => c.category === "Shopping");
    expect(shopping).toBeDefined();
    expect(shopping.isNew).toBe(true);
  });
});

// ─── smartAdvisor ────────────────────────────────────────────

describe("smartAdvisor", () => {
  test("returns inadvisable when current budget is null", () => {
    const svc = makeService();
    const result = svc.smartAdvisor(null, 3000);
    expect(result.recommendation).toBe("inadvisable");
  });

  test("returns safe when safe limit exceeds 10% of monthly budget", () => {
    const svc = makeService();
    // Large balance, low predicted daily rate → safe
    const currentBudget = { monthlyBudget: 10000, remainingBudget: 8000 };
    const result = svc.smartAdvisor(currentBudget, 300); // very low predicted spend
    expect(result.recommendation).toBe("safe");
    expect(result.safeSpendingLimit).toBeGreaterThan(0);
  });

  test("returns inadvisable when current balance is less than predicted remaining spend", () => {
    const svc = makeService();
    // Balance is 100 but monthly predicted spend is high → remaining spend > balance
    const currentBudget = { monthlyBudget: 5000, remainingBudget: 100 };
    const result = svc.smartAdvisor(currentBudget, 5000);
    expect(result.recommendation).toBe("inadvisable");
    expect(result.safeSpendingLimit).toBeLessThanOrEqual(0);
  });

  test("currentBalance matches budget remainingBudget", () => {
    const svc = makeService();
    const currentBudget = { monthlyBudget: 3000, remainingBudget: 1200 };
    const result = svc.smartAdvisor(currentBudget, 1000);
    expect(result.currentBalance).toBe(1200);
  });
});
