export const SUGGESTED_PROMPTS = [
  {
    id: "reports",
    label: "View logistics reports",
    message: "Summarize logistics reports and key delivery metrics for me.",
  },
  {
    id: "active-drivers",
    label: "Active drivers",
    message: "Who are all active drivers and what routes are they on?",
  },
  {
    id: "orders-month",
    label: "Orders this month",
    message: "How many orders were sent this month and what is their status?",
  },
  {
    id: "pipeline",
    label: "Delivery pipeline",
    message: "What is the current order pipeline status?",
  },
  {
    id: "maintenance",
    label: "Maintenance alerts",
    message: "Which vehicles need maintenance soon?",
  },
  {
    id: "operations",
    label: "Today's operations",
    message: "Give me a company operations update for today.",
  },
  {
    id: "fuel",
    label: "Fuel & routes",
    message: "What are current fuel prices and active route fuel savings?",
  },
  {
    id: "high-risk",
    label: "High-risk fleet",
    message: "Show high-risk vehicles and recommended actions.",
  },
] as const;
