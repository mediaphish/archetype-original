import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';

export default function EventDetail() {
  const path = window.location.pathname;
  const id = path.replace('/operators/events/', '');
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState([]);

  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || '';

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id || !email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const resp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const json = await resp.json();
        
        if (json.ok) {
          setEvent(json.event);
        }
      } catch (error) {
        console.error('Failed to fetch event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="events" email={email} userRoles={userRoles} />
        <div className="container mx-auto px-4 py-8">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="events" email={email} userRoles={userRoles} />
        <div className="container mx-auto px-4 py-8">Event not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <OperatorsHeader active="events" email={email} userRoles={userRoles} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-semibold text-gray-900 mb-4">{event.title}</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-600">State: {event.state}</p>
          <p className="text-gray-600">Date: {new Date(event.event_date).toLocaleDateString()}</p>
          <p className="text-gray-600">Stake: ${event.stake_amount}</p>
          <p className="text-gray-600">Max Seats: {event.max_seats}</p>
        </div>
      </div>
    </div>
  );
}
