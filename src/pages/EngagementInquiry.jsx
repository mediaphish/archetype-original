/**
 * Engagement Inquiry Form Page
 * Collects context about potential clients and triggers Archy chat with AI-generated reflections
 */
import React, { useEffect, useRef, useState } from 'react';
import SEO from '../components/SEO';
import ChatApp from '../app/ChatApp';

function go(e, path) {
  e.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export default function EngagementInquiry() {
  const formLoadedAtRef = useRef(null);
  const [trapField, setTrapField] = useState('');

  useEffect(() => {
    if (formLoadedAtRef.current == null) formLoadedAtRef.current = Date.now();
  }, []);

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
    orgSize: '',
  });

  const [formStatus, setFormStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });

  const [archyInitialMessage, setArchyInitialMessage] = useState('');
  const [chatKey, setChatKey] = useState(0);

  const handleMultiSelect = (field, value, maxSelections = 2) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      }
      if (current.length < maxSelections) {
        return { ...prev, [field]: [...current, value] };
      }
      return prev;
    });
  };

  const handleSingleSelect = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });

    if (
      !formData.q1 ||
      !formData.q2.length ||
      !formData.q3 ||
      !formData.q4.length ||
      !formData.q5 ||
      !formData.q6 ||
      !formData.q7
    ) {
      setFormStatus({
        loading: false,
        success: false,
        error: 'Please complete all required fields.',
      });
      return;
    }

    try {
      const res = await fetch('/api/engagement-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          form_loaded_at: formLoadedAtRef.current,
          _trap: trapField,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const archyMessage = await generateArchyReflections(formData);
        setArchyInitialMessage(archyMessage);
        setFormStatus({ loading: false, success: true, error: null });
        setTrapField('');
        setChatKey((prev) => prev + 1);
      } else {
        setFormStatus({
          loading: false,
          success: false,
          error: data?.error || 'Something went wrong. Please try again.',
        });
      }
    } catch {
      setFormStatus({
        loading: false,
        success: false,
        error: 'Network error. Please check your connection and try again.',
      });
    }
  };

  const generateArchyReflections = async (submission) => {
    try {
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
          conversationHistory: [],
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
    'Other',
  ];
  const supportOptions = [
    'Strategic perspective',
    'Cultural insight',
    'Decision clarity',
    'Ongoing advisory support',
    'Leadership development',
    'Organizational assessment',
    'Still discerning',
  ];
  const partnershipOptions = [
    'Periodic perspective and counsel',
    'Ongoing advisory relationship',
    'Project-based engagement',
    'Still determining',
  ];

  const textareaClass =
    'w-full resize-y border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3.5 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none';

  if (formStatus.success) {
    return (
      <>
        <SEO pageKey="engagement-inquiry" />
        <div className="min-h-screen bg-[#FAFAF9] font-inter antialiased">
          <section className="border-b border-[#1A1A1A]/08 bg-white px-6 py-20 lg:px-10">
            <div className="mx-auto max-w-[1400px]">
              <h1 className="mb-5 max-w-[640px] font-serif text-[clamp(28px,3.5vw,48px)] font-normal leading-[1.15] text-[#1A1A1A]">
                Your message has been sent to Bart.
              </h1>
              <p className="max-w-[520px] font-sans text-[16px] leading-[1.8] text-[#6B6B6B]">
                While that is being delivered, here are a few initial thoughts from Archy based on what you
                shared.
              </p>
            </div>
          </section>
          <section className="bg-[#FAFAF9] px-6 py-16 lg:px-10">
            <div className="mx-auto max-w-[1400px]">
              <div className="max-w-[860px]">
                <ChatApp key={chatKey} context="engagement-inquiry" initialMessage={archyInitialMessage} />
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
      <div className="min-h-screen bg-[#FAFAF9] font-inter antialiased">
        <section className="bg-[#2B2929] px-6 pb-20 pt-24 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
              Engagement Inquiry
            </p>
            <h1 className="mb-6 max-w-[680px] font-serif text-[clamp(36px,4.5vw,60px)] font-normal leading-[1.1] tracking-[-0.01em] text-white">
              The conversation starts here.
            </h1>
            <p className="max-w-[560px] font-sans text-[16px] leading-[1.8] text-white/65">
              This is not an application. It is a starting point. Your answers help Bart understand what you are
              carrying before any conversation begins. Takes about five minutes.
            </p>
          </div>
        </section>

        <div className="border-b-2 border-[#FAFAF9] bg-[#E1DED8] px-6 py-5 lg:px-10">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-8">
            {[
              'Sent directly to Bart',
              'No routing system',
              'Archy reflects your answers while you wait',
              'About five minutes',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 shrink-0 bg-[#DB0812]" aria-hidden />
                <span className="font-sans text-[13px] text-[#6B6B6B]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="bg-[#FAFAF9] py-[72px]">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-12 px-6 lg:grid-cols-[1fr_340px] lg:gap-20 lg:px-10">
            <form onSubmit={handleSubmit} className="relative flex flex-col gap-[2px]">
              <div
                className="absolute -left-[10000px] h-px w-px overflow-hidden opacity-0"
                aria-hidden="true"
              >
                <label htmlFor="engagement-form-trap">Leave this field blank</label>
                <input
                  id="engagement-form-trap"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={trapField}
                  onChange={(e) => setTrapField(e.target.value)}
                />
              </div>
              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <span className="mb-2.5 block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DB0812]">
                  01
                </span>
                <span className="mb-5 block font-sans text-[16px] font-medium leading-[1.5] text-[#1A1A1A]">
                  What prompted you to reach out at this point? <span className="text-[#DB0812]">*</span>
                </span>
                <textarea
                  value={formData.q1}
                  onChange={(e) => handleTextChange('q1', e.target.value)}
                  required
                  rows={5}
                  placeholder="Share what led you to reach out now..."
                  className={textareaClass}
                />
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <span className="mb-2.5 block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DB0812]">
                  02
                </span>
                <span className="mb-5 block font-sans text-[16px] font-medium leading-[1.5] text-[#1A1A1A]">
                  How would you describe your organization right now? <span className="text-[#DB0812]">*</span>
                  <span className="ml-2 font-sans text-[13px] font-normal text-[#6B6B6B]">(Select up to 2)</span>
                </span>
                <div className="flex flex-col gap-2">
                  {orgStateOptions.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-start gap-3 border border-[#1A1A1A]/10 bg-[#FAFAF9] px-4 py-3 transition-all hover:border-[#1A1A1A]/25 hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={formData.q2.includes(option)}
                        onChange={() => handleMultiSelect('q2', option, 2)}
                        disabled={!formData.q2.includes(option) && formData.q2.length >= 2}
                        className="mt-0.5 h-4 w-4 border-[#1A1A1A]/20 text-[#DB0812] focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                      <span className="font-sans text-[14px] leading-[1.5] text-[#1A1A1A]">{option}</span>
                    </label>
                  ))}
                </div>
                {formData.q2.includes('Other') && (
                  <input
                    type="text"
                    value={formData.q2Other}
                    onChange={(e) => handleTextChange('q2Other', e.target.value)}
                    placeholder="Briefly describe."
                    className="mt-4 w-full border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none"
                  />
                )}
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <span className="mb-2.5 block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DB0812]">
                  03
                </span>
                <span className="mb-5 block font-sans text-[16px] font-medium leading-[1.5] text-[#1A1A1A]">
                  What are you hoping an outside perspective would help you see or think through?{' '}
                  <span className="text-[#DB0812]">*</span>
                </span>
                <textarea
                  value={formData.q3}
                  onChange={(e) => handleTextChange('q3', e.target.value)}
                  required
                  rows={5}
                  placeholder="What clarity or perspective are you seeking?"
                  className={textareaClass}
                />
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <span className="mb-2.5 block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DB0812]">
                  04
                </span>
                <span className="mb-5 block font-sans text-[16px] font-medium leading-[1.5] text-[#1A1A1A]">
                  What type of leadership support are you most interested in exploring?{' '}
                  <span className="text-[#DB0812]">*</span>
                  <span className="ml-2 font-sans text-[13px] font-normal text-[#6B6B6B]">(Select up to 2)</span>
                </span>
                <div className="flex flex-col gap-2">
                  {supportOptions.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-start gap-3 border border-[#1A1A1A]/10 bg-[#FAFAF9] px-4 py-3 transition-all hover:border-[#1A1A1A]/25 hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={formData.q4.includes(option)}
                        onChange={() => handleMultiSelect('q4', option, 2)}
                        disabled={!formData.q4.includes(option) && formData.q4.length >= 2}
                        className="mt-0.5 h-4 w-4 border-[#1A1A1A]/20 text-[#DB0812] focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                      <span className="font-sans text-[14px] leading-[1.5] text-[#1A1A1A]">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <span className="mb-2.5 block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DB0812]">
                  05
                </span>
                <span className="mb-5 block font-sans text-[16px] font-medium leading-[1.5] text-[#1A1A1A]">
                  Looking ahead 6 to 12 months, what would meaningful progress look like to you?{' '}
                  <span className="text-[#DB0812]">*</span>
                </span>
                <textarea
                  value={formData.q5}
                  onChange={(e) => handleTextChange('q5', e.target.value)}
                  required
                  rows={5}
                  placeholder="Describe what success would look like..."
                  className={textareaClass}
                />
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <span className="mb-2.5 block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DB0812]">
                  06
                </span>
                <span className="mb-5 block font-sans text-[16px] font-medium leading-[1.5] text-[#1A1A1A]">
                  What is currently working well that you want to protect as things evolve?{' '}
                  <span className="text-[#DB0812]">*</span>
                </span>
                <textarea
                  value={formData.q6}
                  onChange={(e) => handleTextChange('q6', e.target.value)}
                  required
                  rows={5}
                  placeholder="What strengths or practices do you want to preserve?"
                  className={textareaClass}
                />
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <span className="mb-2.5 block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DB0812]">
                  07
                </span>
                <span className="mb-5 block font-sans text-[16px] font-medium leading-[1.5] text-[#1A1A1A]">
                  What level of partnership are you considering? <span className="text-[#DB0812]">*</span>
                </span>
                <div className="flex flex-col gap-2">
                  {partnershipOptions.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-start gap-3 border border-[#1A1A1A]/10 bg-[#FAFAF9] px-4 py-3.5 transition-all hover:border-[#1A1A1A]/25 hover:bg-white"
                    >
                      <input
                        type="radio"
                        name="q7"
                        value={option}
                        checked={formData.q7 === option}
                        onChange={(e) => handleSingleSelect('q7', e.target.value)}
                        className="mt-0.5 h-4 w-4 border-[#1A1A1A]/20 text-[#DB0812] focus:ring-0"
                      />
                      <span className="font-sans text-[14px] leading-[1.5] text-[#1A1A1A]">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-[#1A1A1A]/08 bg-[#E1DED8] p-8">
                <h3 className="mb-6 font-serif text-[18px] font-normal text-[#1A1A1A]">A bit of context</h3>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">Your role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleSingleSelect('role', e.target.value)}
                      className="w-full cursor-pointer appearance-none border border-[#1A1A1A]/15 bg-white px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors focus:border-[#1A1A1A] focus:outline-none"
                    >
                      <option value="">Select your role</option>
                      {roleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {formData.role === 'Other' && (
                      <input
                        type="text"
                        value={formData.roleOther}
                        onChange={(e) => handleTextChange('roleOther', e.target.value)}
                        placeholder="Your role"
                        className="mt-3 w-full border border-[#1A1A1A]/15 bg-white px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:outline-none"
                      />
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                      Organization size
                    </label>
                    <select
                      value={formData.orgSize}
                      onChange={(e) => handleSingleSelect('orgSize', e.target.value)}
                      className="w-full cursor-pointer appearance-none border border-[#1A1A1A]/15 bg-white px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors focus:border-[#1A1A1A] focus:outline-none"
                    >
                      <option value="">Select size</option>
                      {orgSizeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <span className="mb-2.5 block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DB0812]">
                  08
                </span>
                <span className="mb-5 block font-sans text-[16px] font-medium leading-[1.5] text-[#1A1A1A]">
                  Is there anything else you would like to share?
                </span>
                <textarea
                  value={formData.q8}
                  onChange={(e) => handleTextChange('q8', e.target.value)}
                  rows={5}
                  placeholder="Anything you think adds context, nuance, or helps us better understand you."
                  className={textareaClass}
                />
                <p className="mt-2 font-sans text-[13px] text-[#6B6B6B]">
                  Anything you think adds context, nuance, or helps us better understand you.
                </p>
              </div>

              <div className="flex flex-col gap-4 border border-[#1A1A1A]/08 bg-white p-8">
                {formStatus.error && (
                  <p className="font-sans text-[13px] text-[#DB0812]" role="alert">
                    {formStatus.error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={formStatus.loading}
                  className="inline-flex min-h-[44px] items-center justify-center self-start bg-[#DB0812] px-12 py-3.5 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formStatus.loading ? 'Sending...' : 'Send'}
                </button>
                <p className="font-sans text-[13px] leading-[1.65] text-[#6B6B6B]">
                  Your answers go directly to Bart. Archy will offer some initial reflections while you wait for a
                  personal response.
                </p>
              </div>
            </form>

            <div className="flex flex-col gap-[2px] lg:sticky lg:top-[88px]">
              <div className="border border-[#1A1A1A]/08 bg-white p-7">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  What happens next
                </p>
                <p className="mb-3 font-sans text-[13px] leading-[1.75] text-[#6B6B6B]">
                  Your answers go to Bart directly. While that is being delivered, Archy reads your submission and
                  offers some initial reflections.
                </p>
                <p className="font-sans text-[13px] leading-[1.75] text-[#6B6B6B]">
                  Bart responds personally, usually within a few business days.
                </p>
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-7">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  Why these questions
                </p>
                <div className="mb-4 border-l-2 border-[#DB0812] pl-4">
                  <p className="font-serif text-[15px] italic leading-[1.6] text-[#1A1A1A]">
                    Context matters more than credentials. What you are carrying and what you are trying to protect
                    tells Bart more than any resume would.
                  </p>
                </div>
                <p className="font-sans text-[13px] leading-[1.75] text-[#6B6B6B]">
                  The answers help make the first conversation actually useful rather than spent on orientation.
                </p>
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-7">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  Not ready for this?
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    ['/the-room', 'Read The Room first'],
                    ['/advisory', 'How advisory works'],
                    ['/contact', 'General contact form'],
                  ].map(([href, label]) => (
                    <a
                      key={href}
                      href={href}
                      onClick={(e) => go(e, href)}
                      className="flex items-center gap-1.5 font-sans text-[13px] font-medium text-[#DB0812] hover:text-[#b30610]"
                    >
                      {label} <span aria-hidden>&rarr;</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="bg-[#2B2929] p-7">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  Advisory
                </p>
                <p className="font-sans text-[13px] leading-[1.75] text-white/55">
                  Available to a limited number of leaders at any given time. That limit is intentional.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
