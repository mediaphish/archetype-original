// src/app/components/DarkHoursBanner.jsx
import React from 'react';
import { isDarkHours } from '../utils/darkHours.js';

export default function DarkHoursBanner() {
  const isDark = isDarkHours();
  
  if (!isDark) {
    return null;
  }
  
  const now = new Date();
  const cstTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  const dayOfWeek = cstTime.getDay();
  
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  return (
    <div className={`border-b px-4 py-3 text-center ${isWeekend ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
      <p className={`text-sm ${isWeekend ? 'text-red-800' : 'text-yellow-800'}`}>
        <span className="font-medium">Heads up:</span> {isWeekend ? 'Live handoffs resume Monday at 10:00 am CST.' : 'Live handoffs resume at 10:00 am CST.'}
      </p>
    </div>
  );
}