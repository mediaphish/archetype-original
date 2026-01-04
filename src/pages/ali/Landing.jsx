import React from 'react';

const ALILanding = () => {
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
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <button
              onClick={() => handleNavigate('/ali/login')}
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
              The Archetype Leadership Index
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Leadership becomes measurable, visible, and directional.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleNavigate('/ali/signup')}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                Get Started
              </button>
              <button
                onClick={() => handleNavigate('/ali/login')}
                className="px-6 py-3 border border-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-50"
              >
                Log In
              </button>
            </div>
          </div>
        </section>

        {/* What is ALI */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">What is ALI?</h2>
            <p className="text-lg text-gray-700 mb-4">
              ALI is a leadership diagnostic built to help leaders see the conditions they are creating — long before drift becomes damage.
            </p>
            <p className="text-lg text-gray-700 mb-4">
              Through anonymous 10-question surveys deployed quarterly, ALI translates team responses into actionable leadership insights.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">How ALI Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">1. Deploy Survey</h3>
                <p className="text-gray-600">Send a 10-question survey to your team quarterly</p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">2. Collect Responses</h3>
                <p className="text-gray-600">Team members respond anonymously</p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">3. View Insights</h3>
                <p className="text-gray-600">See leadership conditions visualized on your dashboard</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-gray-600 mb-6">Join the ALI pilot program</p>
            <button
              onClick={() => handleNavigate('/ali/signup')}
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

export default ALILanding;
