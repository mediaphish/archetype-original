import React from 'react';

const OperatorsLanding = () => {
  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header for SaaS */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <img src="/brand/ao-icon.svg" alt="Archetype Original" className="w-6 h-6" aria-hidden="true" />
              <span className="hidden sm:inline">The Operators</span>
              <span className="sm:hidden">Operators</span>
            </div>
            <button
              onClick={() => handleNavigate('/operators/login')}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Log In
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="bg-white py-16">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              {/* PLACEHOLDER: Content from ChatGPT */}
              Operators Platform
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {/* PLACEHOLDER: Content from ChatGPT */}
              Connect, network, and grow with fellow business operators.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleNavigate('/operators/login')}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                Get Started
              </button>
              <button
                onClick={() => handleNavigate('/operators/login')}
                className="px-6 py-3 border border-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-50"
              >
                Log In
              </button>
            </div>
          </div>
        </section>

        {/* What is Operators Platform */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">What is Operators Platform?</h2>
            <p className="text-lg text-gray-700 mb-4">
              {/* PLACEHOLDER: Content from ChatGPT */}
              Operators Platform is a comprehensive event management and networking system designed for business operators.
            </p>
            <p className="text-lg text-gray-700 mb-4">
              {/* PLACEHOLDER: Content from ChatGPT */}
              Join monthly networking events, vote on fellow operators, and compete for ROI prizes.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">1. RSVP to Events</h3>
                <p className="text-gray-600">
                  {/* PLACEHOLDER: Content from ChatGPT */}
                  Sign up for monthly networking events and secure your spot.
                </p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">2. Attend & Vote</h3>
                <p className="text-gray-600">
                  {/* PLACEHOLDER: Content from ChatGPT */}
                  Participate in events and vote on fellow operators' performance.
                </p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">3. Win ROI</h3>
                <p className="text-gray-600">
                  {/* PLACEHOLDER: Content from ChatGPT */}
                  Top performers win cash prizes from the ROI pot.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-gray-600 mb-6">
              {/* PLACEHOLDER: Content from ChatGPT */}
              Join the Operators Platform community today.
            </p>
            <button
              onClick={() => handleNavigate('/operators/login')}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Sign Up Now
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default OperatorsLanding;
