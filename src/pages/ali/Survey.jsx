import React, { useState, useEffect } from 'react';

const ALISurvey = () => {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [respondentRole, setRespondentRole] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');

  // Get token from URL
  const token = window.location.pathname.split('/').pop();

  useEffect(() => {
    async function loadSurvey() {
      setLoading(true);
      setLoadError('');

      if (!token) {
        setLoadError('Survey link is missing a token.');
        setLoading(false);
        return;
      }

      try {
        const r = await fetch(`/api/ali/survey/${encodeURIComponent(token)}`);
        const j = await r.json().catch(() => ({}));

        if (!r.ok) {
          setLoadError(j?.error || 'Failed to load survey.');
          setLoading(false);
          return;
        }

        const normalized = (j.questions || []).map((q) => ({
          stable_id: q.id,
          question_text: q.question_text,
          pattern: q.pattern,
          is_negative: !!q.is_negative,
          is_anchor: !!q.is_anchor,
          order: q.order
        }));

        setQuestions(normalized.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      } catch (e) {
        setLoadError(e?.message || 'Failed to load survey.');
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, []);

  const handleResponseChange = (stableId, value) => {
    setResponses(prev => ({
      ...prev,
      [stableId]: parseInt(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!respondentRole) {
      alert('Please select your role');
      return;
    }
    
    if (Object.keys(responses).length !== questions.length) {
      alert('Please answer all questions');
      return;
    }

    setSubmitting(true);
    setSubmitMessage('');

    // Simple device type hint
    const deviceType =
      window.innerWidth < 640 ? 'mobile' :
      window.innerWidth < 1024 ? 'tablet' :
      'desktop';

    try {
      const r = await fetch('/api/ali/submit-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deploymentToken: token,
          respondentRole,
          responses,
          deviceType
        })
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setSubmitting(false);
        setSubmitMessage(j?.error || 'Failed to submit response.');
        return;
      }

      setSubmitting(false);
      setSubmitMessage(j?.message || 'Response submitted successfully.');
      setSubmitted(true);
    } catch (err) {
      setSubmitting(false);
      setSubmitMessage(err?.message || 'Failed to submit response.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading survey…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Survey Unavailable</h1>
            <p className="text-gray-600 mb-4">{loadError}</p>
            <p className="text-sm text-gray-500">If you believe this is a mistake, request a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
            <p className="text-gray-600 mb-6">
              {submitMessage || 'Your response has been submitted successfully. Your feedback helps improve leadership conditions.'}
            </p>
            <p className="text-sm text-gray-500">
              Your responses are anonymous and will be aggregated with other team members' responses.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-gray-900 mb-2">ALI Survey</div>
          <p className="text-gray-600">Your responses are anonymous and confidential</p>
        </div>

        {/* Survey Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          {/* Role Question */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <label className="block text-lg font-medium text-gray-900 mb-4">
              What best describes your role?
            </label>
            <div className="flex gap-4">
              <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                respondentRole === 'leader'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="respondentRole"
                  value="leader"
                  checked={respondentRole === 'leader'}
                  onChange={(e) => setRespondentRole(e.target.value)}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-semibold mb-1">I am a leader or manager</div>
                </div>
              </label>
              <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                respondentRole === 'team_member'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="respondentRole"
                  value="team_member"
                  checked={respondentRole === 'team_member'}
                  onChange={(e) => setRespondentRole(e.target.value)}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-semibold mb-1">I am a team member</div>
                </div>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Please answer each question on a scale of 1 (Strongly Disagree) to 5 (Strongly Agree).
            </p>
            {submitMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {submitMessage}
              </div>
            )}
          </div>

          <div className="space-y-8 mb-8">
            {questions.map((question, index) => (
              <div key={question.stable_id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                <div className="mb-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-500">{index + 1}.</span>
                    <label className="text-lg font-medium text-gray-900 flex-1">
                      {question.question_text}
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label
                      key={value}
                      className={`flex flex-col items-center cursor-pointer p-3 rounded-lg border-2 transition-all ${
                        responses[question.stable_id] === value
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.stable_id}
                        value={value}
                        checked={responses[question.stable_id] === value}
                        onChange={(e) => handleResponseChange(question.stable_id, e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-lg font-semibold">{value}</span>
                      <span className="text-xs mt-1">
                        {value === 1 ? 'Strongly Disagree' :
                         value === 2 ? 'Disagree' :
                         value === 3 ? 'Neutral' :
                         value === 4 ? 'Agree' :
                         'Strongly Agree'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {!respondentRole && <span className="text-gray-600 mr-2">Please select your role</span>}
              {Object.keys(responses).length} of {questions.length} questions answered
            </div>
            <button
              type="submit"
              disabled={submitting || !respondentRole || Object.keys(responses).length !== questions.length}
              className="min-h-[44px] bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>All responses are anonymous and will be used to improve leadership conditions.</p>
        </div>
      </div>
    </div>
  );
};

export default ALISurvey;
