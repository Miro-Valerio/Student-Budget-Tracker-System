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

const ALLOWANCE   = 500;
const SAVE_TARGET = 200;

app.get('/', (req, res) => {
  res.send(' Student Weekly Budget API is running!');
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

// POST add a week
// Body:  weekLabel, commuteDays 
app.post("/weeks", (req, res) => {
  const { weekLabel, commuteDays } = req.body;

  if (!weekLabel || commuteDays === undefined) {
    return res.status(400).json({ message: "weekLabel and commuteDays are required." });
  }
  if (commuteDays < 0 || commuteDays > 7) {
    return res.status(400).json({ message: "commuteDays must be 0 to 7." });
  }

  const commuteTotal = commuteDays * 30;
  const spent        = commuteTotal;
  const saved        = ALLOWANCE - spent;
  const metTarget    = saved >= SAVE_TARGET;

  const newWeek = {
    id: weekId++,
    weekLabel,
    allowance: ALLOWANCE,
    commuteDays,
    commuteTotal,
    spent,
    saved,
    saveTarget: SAVE_TARGET,
    metTarget,
    createdAt: new Date().toISOString(),
  };

  weeks.push(newWeek);
  res.status(201).json(newWeek);
});

// DELETE a week
app.delete("/weeks/:id", (req, res) => {
  const index = weeks.findIndex(w => w.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Week not found" });
  weeks.splice(index, 1);
  res.json({ message: "Week deleted." });
});

// GET overall summary
app.get("/summary/all", (req, res) => {
  const totalWeeks   = weeks.length;
  const totalSaved   = weeks.reduce((s, w) => s + w.saved, 0);
  const totalSpent   = weeks.reduce((s, w) => s + w.spent, 0);
  const metCount     = weeks.filter(w => w.metTarget).length;

  res.json({
    totalWeeks,
    totalAllowance: totalWeeks * ALLOWANCE,
    totalSpent,
    totalSaved,
    weeksMetTarget: metCount,
    weeksMissed: totalWeeks - metCount,
    averageSaved: totalWeeks > 0 ? (totalSaved / totalWeeks).toFixed(2) : "0.00",
  });
});



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

// POST create a goal
// Body: { name, targetAmount }
app.post("/goals", (req, res) => {
  const { name, targetAmount } = req.body;

  if (!name || !targetAmount) {
    return res.status(400).json({ message: "name and targetAmount are required." });
  }
  if (targetAmount <= 0) {
    return res.status(400).json({ message: "targetAmount must be greater than 0." });
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

// DELETE a goal
app.delete("/goals/:id", (req, res) => {
  const index = goals.findIndex(g => g.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Goal not found" });
  goals.splice(index, 1);
  res.json({ message: "Goal deleted." });
});

// POST contribute to a goal
// Body: { amount }
app.post("/goals/:id/contribute", (req, res) => {
  const goal = goals.find(g => g.id == req.params.id);
  if (!goal) return res.status(404).json({ message: "Goal not found" });

  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Amount must be greater than 0." });
  }
  if (goal.achieved) {
    return res.status(400).json({ message: "Goal already achieved." });
  }

  goal.currentAmount   += amount;
  goal.remaining        = Math.max(0, goal.targetAmount - goal.currentAmount);
  goal.progressPercent  = Math.min(100, parseFloat(((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)));
  goal.achieved         = goal.currentAmount >= goal.targetAmount;

  res.json({
    message: goal.achieved ? "Goal achieved!" : "Contribution recorded.",
    goal,
  });
});

//SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));