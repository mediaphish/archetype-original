import React from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';

export default function Candidates() {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || '';
  const userRoles = ['chief_operator']; // TODO: Fetch from API

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <OperatorsHeader active="candidates" email={email} userRoles={userRoles} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Candidates</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-600">Candidate management coming soon</p>
        </div>
      </div>
    </div>
  );
}
