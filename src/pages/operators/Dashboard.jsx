import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState([]);

  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || '';

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const resp = await fetch('/api/operators/dashboard');
        const json = await resp.json();
        
        if (json.ok) {
          setDashboard(json.dashboard);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="dashboard" email={email} userRoles={userRoles} />
        <div className="container mx-auto px-4 py-8">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="dashboard" email={email} userRoles={userRoles} />
        <div className="container mx-auto px-4 py-8">No data available</div>
      </div>
    );
  }

  const { event_metrics, longitudinal_metrics } = dashboard;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <OperatorsHeader active="dashboard" email={email} userRoles={userRoles} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Events</h3>
            <p className="text-2xl font-semibold text-gray-900">{event_metrics.total_events}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Seats Filled Rate</h3>
            <p className="text-2xl font-semibold text-gray-900">{event_metrics.seats_filled_rate.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Voting Completion</h3>
            <p className="text-2xl font-semibold text-gray-900">{event_metrics.voting_completion_rate.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Operators</h3>
            <p className="text-2xl font-semibold text-gray-900">{longitudinal_metrics.active_operators}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
