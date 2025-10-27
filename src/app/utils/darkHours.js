// src/app/utils/darkHours.js

/**
 * Check if current time is within dark hours (6 PM - 10 AM CST)
 * @returns {boolean} true if within dark hours, false otherwise
 */
export function isDarkHours() {
  const now = new Date();
  
  // Convert to CST (America/Chicago timezone)
  const cstTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  
  const hour = cstTime.getHours();
  const dayOfWeek = cstTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Complete blackout on weekends (Saturday = 6, Sunday = 0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }
  
  // Dark hours: 6 PM (18:00) to 10 AM (10:00) next day
  // This means 18:00-23:59 and 00:00-09:59
  return hour >= 18 || hour < 10;
}

/**
 * Get the next available time for live handoffs (10 AM CST)
 * @returns {string} formatted time string
 */
export function getNextAvailableTime() {
  const now = new Date();
  const cstTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  
  // Set to next 10 AM CST
  const nextAvailable = new Date(cstTime);
  nextAvailable.setHours(10, 0, 0, 0);
  
  // If it's already past 10 AM today, set to 10 AM tomorrow
  if (cstTime.getHours() >= 10) {
    nextAvailable.setDate(nextAvailable.getDate() + 1);
  }
  
  return nextAvailable.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  });
}