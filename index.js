const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

//DATA
let weeks = [];
let goals = [];
let weekId = 1;
let goalId = 1;

//HOME
app.get("/", (req, res) => {
  res.send(" Student Budget API Running");
});


// GET all weeks
app.get("/weeks", (req, res) => {
  res.json(weeks);
});

// GET one week
app.get("/weeks/:id", (req, res) => {
  const week = weeks.find(w => w.id == req.params.id);
  if (!week) return res.status(404).json({ message: "Week not found" });
  res.json(week);
});

// CREATE week
app.post("/weeks", (req, res) => {
  const { weekLabel, allowance, spent, saveTarget } = req.body;

  if (!weekLabel || allowance === undefined || spent === undefined || saveTarget === undefined) {
    return res.status(400).json({
      message: "weekLabel, allowance, spent, saveTarget are required"
    });
  }

  if (allowance <= 0) {
    return res.status(400).json({ message: "Allowance must be greater than 0" });
  }

  if (spent < 0) {
    return res.status(400).json({ message: "Spent cannot be negative" });
  }

  if (spent > allowance) {
    return res.status(400).json({ message: "Spent cannot exceed allowance" });
  }

  const saved = allowance - spent;
  const metTarget = saved >= saveTarget;

  const newWeek = {
    id: weekId++,
    weekLabel,
    allowance,
    spent,
    saved,
    saveTarget,
    metTarget,
    createdAt: new Date().toISOString(),
  };

  weeks.push(newWeek);
  res.status(201).json(newWeek);
});

// UPDATE week (EDIT)
app.put("/weeks/:id", (req, res) => {
  const week = weeks.find(w => w.id == req.params.id);
  if (!week) return res.status(404).json({ message: "Week not found" });

  const { weekLabel, allowance, spent, saveTarget } = req.body;

  if (allowance !== undefined && allowance <= 0) {
    return res.status(400).json({ message: "Allowance must be greater than 0" });
  }

  if (spent !== undefined && spent < 0) {
    return res.status(400).json({ message: "Spent cannot be negative" });
  }

  const newAllowance = allowance ?? week.allowance;
  const newSpent = spent ?? week.spent;

  if (newSpent > newAllowance) {
    return res.status(400).json({ message: "Spent cannot exceed allowance" });
  }

  // update fields
  week.weekLabel = weekLabel ?? week.weekLabel;
  week.allowance = newAllowance;
  week.spent = newSpent;
  week.saveTarget = saveTarget ?? week.saveTarget;

  // recalculate
  week.saved = week.allowance - week.spent;
  week.metTarget = week.saved >= week.saveTarget;

  res.json({ message: "Week updated", week });
});

// DELETE week
app.delete("/weeks/:id", (req, res) => {
  const index = weeks.findIndex(w => w.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Week not found" });

  weeks.splice(index, 1);
  res.json({ message: "Week deleted" });
});

//SUMMARY
app.get("/summary/all", (req, res) => {
  const totalWeeks = weeks.length;
  const totalSaved = weeks.reduce((s, w) => s + w.saved, 0);
  const totalSpent = weeks.reduce((s, w) => s + w.spent, 0);
  const metCount = weeks.filter(w => w.metTarget).length;

  res.json({
    totalWeeks,
    totalAllowance: weeks.reduce((s, w) => s + w.allowance, 0),
    totalSpent,
    totalSaved,
    weeksMetTarget: metCount,
    weeksMissed: totalWeeks - metCount,
  });
});

//CRUD
// GET all goals
app.get("/goals", (req, res) => {
  res.json(goals);
});

// GET one goal
app.get("/goals/:id", (req, res) => {
  const goal = goals.find(g => g.id == req.params.id);
  if (!goal) return res.status(404).json({ message: "Goal not found" });
  res.json(goal);
});

// CREATE goal
app.post("/goals", (req, res) => {
  const { name, targetAmount } = req.body;

  if (!name || !targetAmount) {
    return res.status(400).json({ message: "name and targetAmount required" });
  }

  const newGoal = {
    id: goalId++,
    name,
    targetAmount,
    currentAmount: 0,
    remaining: targetAmount,
    progressPercent: 0,
    achieved: false,
    createdAt: new Date().toISOString(),
  };

  goals.push(newGoal);
  res.status(201).json(newGoal);
});

// UPDATE goal (EDIT)
app.put("/goals/:id", (req, res) => {
  const goal = goals.find(g => g.id == req.params.id);
  if (!goal) return res.status(404).json({ message: "Goal not found" });

  const { name, targetAmount } = req.body;

  goal.name = name ?? goal.name;
  goal.targetAmount = targetAmount ?? goal.targetAmount;

  goal.remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  goal.progressPercent = Math.min(
    100,
    ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)
  );
  goal.achieved = goal.currentAmount >= goal.targetAmount;

  res.json({ message: "Goal updated", goal });
});

// DELETE goal
app.delete("/goals/:id", (req, res) => {
  const index = goals.findIndex(g => g.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Goal not found" });

  goals.splice(index, 1);
  res.json({ message: "Goal deleted" });
});

// CONTRIBUTE to goal
app.post("/goals/:id/contribute", (req, res) => {
  const goal = goals.find(g => g.id == req.params.id);
  if (!goal) return res.status(404).json({ message: "Goal not found" });

  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Amount must be greater than 0" });
  }

  if (goal.achieved) {
    return res.status(400).json({ message: "Goal already achieved" });
  }

  goal.currentAmount += amount;
  goal.remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  goal.progressPercent = Math.min(
    100,
    ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)
  );
  goal.achieved = goal.currentAmount >= goal.targetAmount;

  res.json({
    message: goal.achieved ? "Goal achieved!" : "Contribution added",
    goal,
  });
});

//SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));