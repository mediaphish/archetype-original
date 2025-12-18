/**
 * Contact Page
 * 
 * Strategic 2-column layout: Archy AI chat (primary) + Contact form (secondary)
 * Reduces friction while maintaining human accessibility
 */
import React, { useState } from 'react';
import SEO from '../components/SEO';
import ChatApp from '../app/ChatApp';

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({
    loading: false,
    success: false,
    error: null
  });
  const [archyInitialMessage, setArchyInitialMessage] = useState('');
  const [chatKey, setChatKey] = useState(0);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });

      const data = await res.json();

      if (res.ok) {
        setFormStatus({ loading: false, success: true, error: null });
        setFormState({ name: '', email: '', company: '', phone: '', message: '' });
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

  const calendlyUrl = process.env.REACT_APP_CALENDLY_SCHEDULING_URL || process.env.NEXT_PUBLIC_CALENDLY_SCHEDULING_URL;
  const contactEmail = process.env.REACT_APP_CONTACT_EMAIL || 'bart@archetypeoriginal.com';

  return (
    <>
      <SEO pageKey="contact" />
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section */}
        <section className="bg-white py-16 sm:py-20 md:py-24 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-5xl mx-auto text-center space-y-4 sm:space-y-6 md:space-y-8">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A] break-words">
                Start a Conversation
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light break-words">
                Leadership carries weight. If you need clarity or direction, I'm here to help.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content - Two Column Layout */}
        <section className="py-12 sm:py-16 md:py-20 bg-[#FAFAF9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
              
              {/* LEFT COLUMN: Archy AI Chat */}
              <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col h-full order-2 lg:order-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A] mb-2 break-words">
                      Ask Archy Anything
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-[#6B6B6B] leading-relaxed break-words">
                      Bart has loaded decades of leadership experience into Archy's knowledge base. Ask questions about culture, leadership, servant leadership, methods, or what might work for your specific situation. If Archy can't help, we'll get you to the right person.
                    </p>
                  </div>
                  <span className="text-xs bg-[#C85A3C]/10 text-[#C85A3C] px-3 py-1 rounded-full whitespace-nowrap ml-4">
                    Instant Answers
                  </span>
                </div>

                {/* Embedded Archy Chat Interface */}
                <div className="flex-1 flex flex-col min-h-[400px] sm:min-h-[500px] max-h-[500px] sm:max-h-[600px] border border-[#1A1A1A]/10 rounded-md overflow-hidden">
                  <div className="h-full">
                    <ChatApp key={chatKey} context="contact" initialMessage={archyInitialMessage} />
                  </div>
                </div>

                {/* Optional Starter Questions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setArchyInitialMessage('What is servant leadership?');
                      setChatKey(prev => prev + 1);
                    }}
                      className="text-xs px-3 py-2 border border-[#1A1A1A]/20 rounded-md text-[#1A1A1A] hover:bg-[#FAFAF9] transition-colors min-h-[44px] flex items-center justify-center"
                  >
                    What is servant leadership?
                  </button>
                  <button
                    onClick={() => {
                      setArchyInitialMessage('How does mentorship work?');
                      setChatKey(prev => prev + 1);
                    }}
                      className="text-xs px-3 py-2 border border-[#1A1A1A]/20 rounded-md text-[#1A1A1A] hover:bg-[#FAFAF9] transition-colors min-h-[44px] flex items-center justify-center"
                  >
                    How does mentorship work?
                  </button>
                  <button
                    onClick={() => {
                      setArchyInitialMessage('What offering fits my situation?');
                      setChatKey(prev => prev + 1);
                    }}
                      className="text-xs px-3 py-2 border border-[#1A1A1A]/20 rounded-md text-[#1A1A1A] hover:bg-[#FAFAF9] transition-colors min-h-[44px] flex items-center justify-center"
                  >
                    What offering fits my situation?
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Contact Form */}
              <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col h-full order-1 lg:order-2">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A] mb-2 break-words">
                      Or Reach Out Directly
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-[#6B6B6B] leading-relaxed break-words">
                      Prefer to start with a human conversation? Fill out the form below and I'll get back to you personally.
                    </p>
                  </div>
                  <span className="text-xs text-[#6B6B6B] whitespace-nowrap ml-4">
                    Direct Contact
                  </span>
                </div>

                <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      Name <span className="text-[#C85A3C]">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-md bg-white text-[#1A1A1A] placeholder:text-[#6B6B6B]/50 focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent transition-colors"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      Email <span className="text-[#C85A3C]">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-md bg-white text-[#1A1A1A] placeholder:text-[#6B6B6B]/50 focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent transition-colors"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formState.company}
                      onChange={(e) => setFormState(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Your organization (optional)"
                      className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-md bg-white text-[#1A1A1A] placeholder:text-[#6B6B6B]/50 focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent transition-colors"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formState.phone}
                      onChange={(e) => setFormState(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Your phone number (optional)"
                      className="w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-md bg-white text-[#1A1A1A] placeholder:text-[#6B6B6B]/50 focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent transition-colors"
                    />
                  </div>

                  {/* Message */}
                  <div className="flex-1 flex flex-col">
                    <label htmlFor="message" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      Message <span className="text-[#C85A3C]">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formState.message}
                      onChange={(e) => setFormState(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tell me what you're facing or what kind of support you need..."
                      className="flex-1 w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-md bg-white text-[#1A1A1A] placeholder:text-[#6B6B6B]/50 focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent transition-colors resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={formStatus.loading}
                    className="w-full bg-[#1A1A1A] text-white py-3 px-10 font-medium text-base rounded-md hover:bg-[#1A1A1A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
                  >
                    {formStatus.loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Send Message'
                    )}
                  </button>

                  {/* Status Messages */}
                  {formStatus.success && (
                    <p className="text-sm text-green-600 text-center" role="alert">
                      Message sent successfully! I'll get back to you soon.
                    </p>
                  )}
                  {formStatus.error && (
                    <p className="text-sm text-red-600 text-center" role="alert">
                      {formStatus.error}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Alternative Options Section */}
        <section className="py-12 sm:py-16 md:py-20 bg-[#FAFAF9]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12 text-center">
            <p className="text-sm text-[#6B6B6B] mb-6">Other ways to connect:</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {calendlyUrl && (
                <a
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3 border-2 border-[#1A1A1A] text-[#1A1A1A] font-medium rounded-md hover:bg-[#1A1A1A] hover:text-white transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Schedule a Call
                </a>
              )}
              <a
                href={`mailto:${contactEmail}`}
                className="px-8 py-3 border-2 border-[#1A1A1A] text-[#1A1A1A] font-medium rounded-md hover:bg-[#1A1A1A] hover:text-white transition-colors min-h-[44px] flex items-center justify-center"
              >
                Send Email
              </a>
            </div>
          </div>
        </section>

        {/* Footer Navigation Section */}
        <section className="py-12 sm:py-16 bg-[#FAFAF9] border-t border-[#1A1A1A]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
            <p className="text-sm text-[#6B6B6B] text-center mb-6">Explore what I offer:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/methods/mentorship"
                className="text-sm text-[#1A1A1A] hover:text-[#C85A3C] hover:underline transition-colors"
              >
                Mentorship
              </a>
              <a
                href="/methods/consulting"
                className="text-sm text-[#1A1A1A] hover:text-[#C85A3C] hover:underline transition-colors"
              >
                Consulting
              </a>
              <a
                href="/methods/fractional-roles"
                className="text-sm text-[#1A1A1A] hover:text-[#C85A3C] hover:underline transition-colors"
              >
                Fractional Roles
              </a>
              <a
                href="/methods/training-education"
                className="text-sm text-[#1A1A1A] hover:text-[#C85A3C] hover:underline transition-colors"
              >
                Training & Education
              </a>
              <a
                href="/methods/speaking-seminars"
                className="text-sm text-[#1A1A1A] hover:text-[#C85A3C] hover:underline transition-colors"
              >
                Speaking & Seminars
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
