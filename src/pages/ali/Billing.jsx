import React from 'react';

const ALIBilling = () => {
  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Preserve magic-link email across ALI app navigation (used for role-aware links)
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const email = emailParam ? emailParam.toLowerCase().trim() : '';
  const isSuperAdminUser = !!email && email.endsWith('@archetypeoriginal.com');
  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  // Mock data
  const subscription = {
    plan: 'Professional',
    status: 'active',
    nextBillingDate: '2024-02-15',
    price: '$99',
    period: 'month'
  };

  const paymentMethod = {
    type: 'card',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: '12',
    expiryYear: '2025'
  };

  const billingHistory = [
    { id: '1', date: '2024-01-15', amount: '$99.00', status: 'paid' },
    { id: '2', date: '2023-12-15', amount: '$99.00', status: 'paid' },
    { id: '3', date: '2023-11-15', amount: '$99.00', status: 'paid' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/reports'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Reports
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/deploy'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/settings'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Settings
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/billing'))}
                className="text-blue-600 font-semibold"
              >
                Billing
              </button>
              {isSuperAdminUser && (
                <button
                  onClick={() => handleNavigate(withEmail('/ali/super-admin/overview'))}
                  className="text-[#2563eb] font-semibold hover:text-[#1d4ed8]"
                >
                  Super Admin
                </button>
              )}
              <button
                onClick={() => handleNavigate('/ali')}
                className="text-gray-600 hover:text-gray-800"
              >
                Log Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        </div>

        {/* Current Plan */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Plan</h2>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{subscription.plan}</div>
              <div className="text-sm text-gray-600">
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded mr-2 ${
                  subscription.status === 'active' ? 'bg-blue-100 text-blue-700' :
                  subscription.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {subscription.status}
                </span>
                {subscription.price}/{subscription.period}
              </div>
            </div>
            <button
              onClick={() => alert('Change plan - coming soon')}
              className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200"
            >
              Change Plan
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <strong>Next billing date:</strong> {subscription.nextBillingDate}
            </div>
          </div>
        </section>

        {/* Payment Method */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
            <button
              onClick={() => alert('Update payment method - coming soon')}
              className="text-sm text-blue-600 hover:underline font-semibold"
            >
              Update
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
              {paymentMethod.brand.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                {paymentMethod.brand} •••• {paymentMethod.last4}
              </div>
              <div className="text-sm text-gray-600">
                Expires {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
              </div>
            </div>
          </div>
        </section>

        {/* Billing History */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Billing History</h2>
          
          {billingHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No billing history
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">{invoice.date}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">{invoice.amount}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          invoice.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                          invoice.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => alert('Download invoice - coming soon')}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ALIBilling;

