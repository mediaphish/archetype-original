import React, { useState, useEffect } from 'react';

const ALISurvey = () => {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [respondentRole, setRespondentRole] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get token from URL
  const token = window.location.pathname.split('/').pop();

  useEffect(() => {
    // Mock questions - in real app, fetch from API
    const mockQuestions = [
      {
        stable_id: 'Q-CLARITY-001',
        question_text: 'I communicate the top priorities clearly enough that people can act without guessing.',
        pattern: 'clarity',
        role: 'leader',
        is_negative: false,
        is_anchor: true,
        order: 1
      },
      {
        stable_id: 'Q-CONSISTENCY-001',
        question_text: 'I respond to similar situations in similar ways, even when I\'m under pressure.',
        pattern: 'consistency',
        role: 'leader',
        is_negative: false,
        is_anchor: false,
        order: 2
      },
      {
        stable_id: 'Q-TRUST-002',
        question_text: 'I can speak honestly about issues that matter without worrying about negative consequences.',
        pattern: 'trust',
        role: 'team_member',
        is_negative: false,
        is_anchor: true,
        order: 3
      },
      {
        stable_id: 'Q-COMMUNICATION-001',
        question_text: 'I share decisions with enough context that people can act confidently.',
        pattern: 'communication',
        role: 'leader',
        is_negative: false,
        is_anchor: false,
        order: 4
      },
      {
        stable_id: 'Q-ALIGNMENT-001',
        question_text: 'I reinforce the behaviors that match what we say matters most.',
        pattern: 'alignment',
        role: 'leader',
        is_negative: false,
        is_anchor: false,
        order: 5
      },
      {
        stable_id: 'Q-STABILITY-001',
        question_text: 'I maintain stable expectations even when circumstances change.',
        pattern: 'stability',
        role: 'leader',
        is_negative: false,
        is_anchor: false,
        order: 6
      },
      {
        stable_id: 'Q-CLARITY-004',
        question_text: 'Important expectations are implied instead of stated in a way people can repeat back.',
        pattern: 'clarity',
        role: 'leader',
        is_negative: true,
        is_anchor: false,
        order: 7
      },
      {
        stable_id: 'Q-CONSISTENCY-008',
        question_text: 'The way issues are handled depends on timing, mood, or who is involved.',
        pattern: 'consistency',
        role: 'team_member',
        is_negative: true,
        is_anchor: false,
        order: 8
      },
      {
        stable_id: 'Q-TRUST-007',
        question_text: 'People hold back information because they are unsure how it will be received.',
        pattern: 'trust',
        role: 'team_member',
        is_negative: true,
        is_anchor: false,
        order: 9
      },
      {
        stable_id: 'Q-COMMUNICATION-007',
        question_text: 'I often have to rely on unofficial channels to understand what is happening.',
        pattern: 'communication',
        role: 'team_member',
        is_negative: true,
        is_anchor: false,
        order: 10
      }
    ];

    setQuestions(mockQuestions.sort((a, b) => a.order - b.order));
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

    // In real implementation, submit to API with respondentRole
    // const submitData = {
    //   deploymentToken: token,
    //   respondentRole: respondentRole,
    //   responses: responses
    // };

    // Fake submission
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

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
              Your response has been submitted successfully. Your feedback helps improve leadership conditions.
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
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
