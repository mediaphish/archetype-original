/**
 * Engagement Inquiry Form Page
 * Collects context about potential clients and triggers Archy chat with AI-generated reflections
 */
import React, { useState } from 'react';
import SEO from '../components/SEO';
import ChatApp from '../app/ChatApp';

export default function EngagementInquiry() {
  const [formData, setFormData] = useState({
    q1: '',
    q2: [],
    q2Other: '',
    q3: '',
    q4: [],
    q5: '',
    q6: '',
    q7: '',
    q8: '',
    role: '',
    roleOther: '',
    orgSize: ''
  });

  const [formStatus, setFormStatus] = useState({
    loading: false,
    success: false,
    error: null
  });

  const [archyInitialMessage, setArchyInitialMessage] = useState('');
  const [chatKey, setChatKey] = useState(0);

  const handleMultiSelect = (field, value, maxSelections = 2) => {
    setFormData(prev => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else if (current.length < maxSelections) {
        return { ...prev, [field]: [...current, value] };
      }
      return prev;
    });
  };

  const handleSingleSelect = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });

    // Validation
    if (!formData.q1 || !formData.q2.length || !formData.q3 || !formData.q4.length || 
        !formData.q5 || !formData.q6 || !formData.q7) {
      setFormStatus({ 
        loading: false, 
        success: false, 
        error: 'Please complete all required fields.' 
      });
      return;
    }

    try {
      const res = await fetch('/api/engagement-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        // Generate Archy's initial message based on form submission BEFORE showing success
        const archyMessage = await generateArchyReflections(formData);
        setArchyInitialMessage(archyMessage);
        setFormStatus({ loading: false, success: true, error: null });
        setChatKey(prev => prev + 1); // Force ChatApp to re-render with new message
      } else {
        setFormStatus({ 
          loading: false, 
          success: false, 
          error: data?.error || 'Something went wrong. Please try again.' 
        });
      }
    } catch (err) {
      setFormStatus({ 
        loading: false, 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      });
    }
  };

  const generateArchyReflections = async (submission) => {
    try {
      // Format submission for Archy
      const submissionText = `
Engagement Inquiry Submission:

What prompted you to reach out: ${submission.q1}

Organization state: ${submission.q2.join(', ')}${submission.q2Other ? ` (Other: ${submission.q2Other})` : ''}

What outside perspective would help: ${submission.q3}

Leadership support interested in: ${submission.q4.join(', ')}

Meaningful progress in 6-12 months: ${submission.q5}

What's working well to protect: ${submission.q6}

Partnership level considering: ${submission.q7}
${submission.q8 ? `\nAdditional context: ${submission.q8}` : ''}
${submission.role ? `\nRole: ${submission.role}${submission.roleOther ? ` (${submission.roleOther})` : ''}` : ''}
${submission.orgSize ? `\nOrganization size: ${submission.orgSize}` : ''}
      `.trim();

      const reflectionPrompt = `Based on this engagement inquiry submission, generate Archy's initial reflections following this EXACT structure:

1. Opening acknowledgement (2-3 sentences):
"Thanks for taking a moment to share some context.

Based on what you submitted, here are a few initial thoughts that may be worth considering. Treat these as starting points, not conclusions."

2. Initial Reflections (3 bullets):
Generate 3 non-diagnostic observations based on their answers. Use soft language like "it sounds like," "it may be," "it suggests," "you might consider." Do NOT diagnose problems or imply dysfunction. Focus on patterns, themes, or considerations.

3. Two reflection questions (use EXACT wording):
"What's the one thing you're most intent on not breaking as things evolve?

Where do you currently rely most on your own judgment—and where would another perspective actually help?"

4. Invitation to chat (use EXACT wording):
"If you have more questions, or I got this completely wrong, I'm here to chat.

You can clarify, push back, or add context. This isn't a test, and there's no right answer. It's simply a way to sharpen understanding before a real conversation happens."

Submission:
${submissionText}

Generate the full response following the structure above.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: reflectionPrompt,
          context: 'engagement-inquiry',
          conversationHistory: []
        }),
      });

      const data = await res.json();
      return data.response || '';
    } catch (err) {
      console.error('Error generating Archy reflections:', err);
      return '';
    }
  };

  const orgSizeOptions = ['5–15', '16–50', '51–150', '150+'];
  const roleOptions = ['Owner / Founder', 'Executive', 'Senior Leader', 'Team Lead', 'Advisor / Board', 'Other'];
  const orgStateOptions = [
    'Stable and healthy',
    'Growing or scaling',
    'In transition',
    'Re-aligning after change',
    'Strong but stretched',
    'Early stage',
    'Other'
  ];
  const supportOptions = [
    'Strategic perspective',
    'Cultural insight',
    'Decision clarity',
    'Ongoing advisory support',
    'Leadership development',
    'Organizational assessment',
    'Still discerning'
  ];
  const partnershipOptions = [
    'Periodic perspective and counsel',
    'Ongoing advisory relationship',
    'Project-based engagement',
    'Still determining'
  ];

  if (formStatus.success) {
    return (
      <>
        <SEO pageKey="engagement-inquiry" />
        <div className="min-h-screen bg-[#FAFAF9]">
          {/* Confirmation Section */}
          <section className="bg-white py-12 sm:py-16 md:py-20">
            <div className="container mx-auto px-4 sm:px-6 md:px-12">
              <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
                <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A] break-words">
                  Thanks — your message has been sent to Bart.
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#1A1A1A]/70 font-light break-words">
                  While that's being delivered, here are a few initial thoughts based on what you shared.
                </p>
              </div>
            </div>
          </section>

          {/* Archy Chat Section */}
          <section className="py-12 sm:py-16 md:py-20 bg-[#FAFAF9]">
            <div className="container mx-auto px-4 sm:px-6 md:px-12">
              <div className="max-w-4xl mx-auto">
                <ChatApp 
                  key={chatKey}
                  context="engagement-inquiry" 
                  initialMessage={archyInitialMessage}
                />
              </div>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO pageKey="engagement-inquiry" />
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section */}
        <section className="bg-white py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A] break-words">
                Work Together
              </h1>
              
              {/* Supporting Copy */}
              <div className="space-y-4 text-base sm:text-lg leading-relaxed text-[#1A1A1A]/80">
                <p>
                  If you're exploring advisory, consulting, or partnership work with Bart Paden through Archetype Original, this is where that conversation begins.
                </p>
                <p>
                  This inquiry helps establish context so any next step—whether a single conversation or ongoing work—starts from understanding.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="py-8 sm:py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              {/* Optional Micro-Line */}
              <div className="mb-6">
                <p className="text-sm text-[#6B6B6B]">
                  Takes about 3–5 minutes.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/10 rounded-lg p-6 sm:p-8 md:p-10 space-y-8">
                
                {/* Q1 */}
                <div>
                  <label className="block text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3">
                    What prompted you to reach out at this point? <span className="text-[#C85A3C]">*</span>
                  </label>
                  <textarea
                    value={formData.q1}
                    onChange={(e) => handleTextChange('q1', e.target.value)}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent resize-y"
                    placeholder="Share what led you to reach out now..."
                  />
                </div>

                {/* Q2 */}
                <div>
                  <label className="block text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3">
                    How would you describe your organization right now? <span className="text-[#C85A3C]">*</span>
                    <span className="text-sm font-normal text-[#6B6B6B] ml-2">(Select up to 2)</span>
                  </label>
                  <div className="space-y-2">
                    {orgStateOptions.map(option => (
                      <label key={option} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.q2.includes(option)}
                          onChange={() => handleMultiSelect('q2', option, 2)}
                          disabled={!formData.q2.includes(option) && formData.q2.length >= 2}
                          className="mt-1 w-5 h-5 text-[#C85A3C] border-[#1A1A1A]/20 rounded focus:ring-[#C85A3C] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-base text-[#1A1A1A] group-hover:text-[#1A1A1A]/80">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                  {formData.q2.includes('Other') && (
                    <div className="mt-4">
                      <input
                        type="text"
                        value={formData.q2Other}
                        onChange={(e) => handleTextChange('q2Other', e.target.value)}
                        placeholder="Briefly describe."
                        className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Q3 */}
                <div>
                  <label className="block text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3">
                    What are you hoping an outside perspective would help you see or think through? <span className="text-[#C85A3C]">*</span>
                  </label>
                  <textarea
                    value={formData.q3}
                    onChange={(e) => handleTextChange('q3', e.target.value)}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent resize-y"
                    placeholder="What clarity or perspective are you seeking?"
                  />
                </div>

                {/* Q4 */}
                <div>
                  <label className="block text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3">
                    What type of leadership support are you most interested in exploring? <span className="text-[#C85A3C]">*</span>
                    <span className="text-sm font-normal text-[#6B6B6B] ml-2">(Select up to 2)</span>
                  </label>
                  <div className="space-y-2">
                    {supportOptions.map(option => (
                      <label key={option} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.q4.includes(option)}
                          onChange={() => handleMultiSelect('q4', option, 2)}
                          disabled={!formData.q4.includes(option) && formData.q4.length >= 2}
                          className="mt-1 w-5 h-5 text-[#C85A3C] border-[#1A1A1A]/20 rounded focus:ring-[#C85A3C] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-base text-[#1A1A1A] group-hover:text-[#1A1A1A]/80">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Q5 */}
                <div>
                  <label className="block text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3">
                    Looking ahead 6–12 months, what would meaningful progress look like to you? <span className="text-[#C85A3C]">*</span>
                  </label>
                  <textarea
                    value={formData.q5}
                    onChange={(e) => handleTextChange('q5', e.target.value)}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent resize-y"
                    placeholder="Describe what success would look like..."
                  />
                </div>

                {/* Q6 */}
                <div>
                  <label className="block text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3">
                    What's currently working well that you want to protect as things evolve? <span className="text-[#C85A3C]">*</span>
                  </label>
                  <textarea
                    value={formData.q6}
                    onChange={(e) => handleTextChange('q6', e.target.value)}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent resize-y"
                    placeholder="What strengths or practices do you want to preserve?"
                  />
                </div>

                {/* Q7 */}
                <div>
                  <label className="block text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3">
                    What level of partnership are you considering? <span className="text-[#C85A3C]">*</span>
                  </label>
                  <div className="space-y-2">
                    {partnershipOptions.map(option => (
                      <label key={option} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="q7"
                          value={option}
                          checked={formData.q7 === option}
                          onChange={(e) => handleSingleSelect('q7', e.target.value)}
                          className="mt-1 w-5 h-5 text-[#C85A3C] border-[#1A1A1A]/20 focus:ring-[#C85A3C]"
                        />
                        <span className="text-base text-[#1A1A1A] group-hover:text-[#1A1A1A]/80">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Context Section */}
                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <h3 className="text-lg sm:text-xl font-semibold text-[#1A1A1A] mb-6">
                    Context (optional)
                  </h3>
                  
                  {/* Role */}
                  <div className="mb-6">
                    <label className="block text-base font-medium text-[#1A1A1A] mb-3">
                      Your role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleSingleSelect('role', e.target.value)}
                      className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                    >
                      <option value="">Select your role</option>
                      {roleOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {formData.role === 'Other' && (
                      <div className="mt-4">
                        <input
                          type="text"
                          value={formData.roleOther}
                          onChange={(e) => handleTextChange('roleOther', e.target.value)}
                          placeholder="Your role"
                          className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>

                  {/* Organization Size */}
                  <div>
                    <label className="block text-base font-medium text-[#1A1A1A] mb-3">
                      Organization size
                    </label>
                    <select
                      value={formData.orgSize}
                      onChange={(e) => handleSingleSelect('orgSize', e.target.value)}
                      className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                    >
                      <option value="">Select organization size</option>
                      {orgSizeOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Q8 - Must be last */}
                <div>
                  <label className="block text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3">
                    Is there anything else you'd like to share?
                  </label>
                  <textarea
                    value={formData.q8}
                    onChange={(e) => handleTextChange('q8', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent resize-y"
                    placeholder="Anything you think adds context, nuance, or helps us better understand you."
                  />
                  <p className="mt-2 text-sm text-[#6B6B6B]">
                    Anything you think adds context, nuance, or helps us better understand you.
                  </p>
                </div>

                {/* Error Message */}
                {formStatus.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{formStatus.error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={formStatus.loading}
                    className="w-full sm:w-auto bg-[#1A1A1A] text-white px-8 py-4 font-medium hover:bg-[#1A1A1A]/90 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {formStatus.loading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

