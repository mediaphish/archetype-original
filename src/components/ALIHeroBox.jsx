import React from "react";

export default function ALIHeroBox() {
  return (
    <section className="py-12 md:py-16" style={{ backgroundColor: "#F8F7F3" }}>
      <div className="container max-w-5xl mx-auto px-6">
        <div className="bg-white rounded-xl p-6 md:p-10 border-2 shadow-lg" style={{ borderColor: "var(--terracotta)" }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center" style={{ color: "#1D1F21" }}>
            Measure Leadership That Lasts
          </h2>
          <div className="text-lg leading-relaxed mb-8" style={{ color: "#1D1F21" }}>
            <ContentGoesHere placeholder="Body copy from ChatGPT - coming soon" />
          </div>
          <div className="text-center">
            <a
              href="/ali"
              className="inline-block px-8 py-4 rounded-lg font-semibold text-white transition-all duration-300"
              style={{ backgroundColor: "#6A1B1A" }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#7A2B2A"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#6A1B1A"}
            >
              Join the Pilot Program
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// Placeholder component
function ContentGoesHere({ placeholder }) {
  return (
    <div className="p-4 border-2 border-dashed rounded-lg" style={{ borderColor: "#CBD5E1", backgroundColor: "#F8F7F3" }}>
      <p className="text-sm italic" style={{ color: "#94A3B8" }}>
        {placeholder}
      </p>
    </div>
  );
}

