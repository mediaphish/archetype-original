// src/app/components/DarkHoursBanner.jsx
import React from 'react';
import { isDarkHours, getNextAvailableTime } from '../utils/darkHours.js';

export default function DarkHoursBanner() {
  const isDark = isDarkHours();
  
  if (!isDark) {
    return null;
  }
  
  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-center">
      <p className="text-sm text-yellow-800">
        <span className="font-medium">Heads up:</span> Live handoffs resume at 10:00 am CST.
      </p>
    </div>
  );
}
