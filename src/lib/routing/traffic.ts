export function getTrafficFactor(departTime: Date) {
  // Simple peak-hour model: reduce effective speed on AM/PM commute.
  // Using UTC to stay deterministic in serverless environments.
  const hour = departTime.getUTCHours();

  const isPeak =
    (hour >= 6 && hour <= 9) || // morning
    (hour >= 16 && hour <= 19); // evening

  return isPeak ? 0.6 : 0.85;
}

