export function percentage(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / goal) * 100)));
}

export function sleepDurationMinutes(fellAsleepAt: Date, wokeAt: Date): number {
  const duration = Math.round((wokeAt.getTime() - fellAsleepAt.getTime()) / 60_000);
  return Math.max(0, duration);
}

export function totalCalories(items: Array<{ calories: number } | { kcal: number }>): number {
  return items.reduce((total, item) => total + ('calories' in item ? item.calories : item.kcal), 0);
}

export function streakFromDates(dates: string[], today: string): number {
  const values = new Set(dates);
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  while (values.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
