import React from "react";

export default function MethodsTeaser() {
  return (
    <section className="section bg-white">
      <div className="container">
        <h2 className="h2 mb-6">Methods</h2>
        <div className="max-w-3xl">
          <p className="p text-lg leading-relaxed">
            No programs. No subscriptions. Real conversations that lead to real execution. I start by listening, surface the real problem, build clarity you can act on, and design rhythms your team can sustain. Success is when you don't need me anymore.
          </p>
          <div className="mt-6">
            <a 
              href="/methods" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              See how I work →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

