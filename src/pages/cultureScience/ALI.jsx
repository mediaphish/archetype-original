import React from "react";
import SEO from "../../components/SEO";

export default function ALI() {
  const dimensions = [
    {
      title: "Clarity",
      question: "Do people know what matters, why it matters, and where they fit?"
    },
    {
      title: "Empathy",
      question: "Do leaders listen to understand, or to respond?"
    },
    {
      title: "Humility",
      question: "Can leaders admit mistakes, ask for help, and share credit?"
    },
    {
      title: "Strength",
      question: "Do leaders make hard decisions with confidence and care?"
    },
    {
      title: "Accountability",
      question: "Do people own outcomes, or deflect responsibility?"
    },
    {
      title: "Trust",
      question: "Do people feel safe to speak up, take risks, and be human?"
    }
  ];

  const benefits = [
    {
      icon: "⚡",
      title: "First Access",
      description: "Get the tool before anyone else—and help shape what it becomes."
    },
    {
      icon: "$",
      title: "Discounted Pricing",
      description: "Pilot pricing is significantly lower than future rates—locked in for year one."
    },
    {
      icon: "💬",
      title: "Direct Support",
      description: "Work directly with me to interpret results and build action plans."
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Initial Conversation",
      description: "We'll talk about your business, your team, and whether ALI is the right fit for where you are."
    },
    {
      number: "2",
      title: "Team Assessment",
      description: "Your team completes a short, anonymous assessment. Takes about 15 minutes. No login required."
    },
    {
      number: "3",
      title: "Your Scorecard",
      description: "You get a detailed report showing how your leadership scores across the six dimensions—and what it means."
    },
    {
      number: "4",
      title: "Debrief & Action Plan",
      description: "We meet to review your results, identify patterns, and build a plan for what comes next."
    }
  ];

  return (
    <>
      <SEO pageKey="ali" />
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Section */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <div className="inline-block mb-6 sm:mb-8">
                <div className="px-3 py-1 border border-[#1A1A1A]/10">
                  <span className="text-xs font-medium tracking-wider text-[#C85A3C] uppercase">Pilot Phase In Development</span>
                </div>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                Join the ALI Pilot Program
              </h1>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-8 sm:mb-10 text-pretty">
                A servant leadership diagnostic for companies with 10–250 employees. Know where your leadership actually stands—not where you hope it is.
              </p>
            </div>
          </div>
        </section>

        {/* Info Banner */}
        <section className="py-8 sm:py-10 bg-[#FAFAF9] border-y border-[#1A1A1A]/10">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-center text-pretty">
                ALI is currently in pilot. We're building it alongside a small group of businesses (10–250 employees). If you're ready to measure what matters, join us.
              </p>
            </div>
          </div>
        </section>

        {/* What is ALI */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-start">
                <div className="space-y-6 sm:space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] font-serif tracking-tight text-balance">
                    What is ALI?
                  </h2>
                  
                  <div className="space-y-6 text-base sm:text-lg leading-relaxed text-[#6B6B6B]">
                    <p className="text-pretty">
                      ALI measures six dimensions of servant leadership: Clarity, Empathy, Humility, Strength, Accountability, and Trust.
                    </p>
                    
                    <p className="text-pretty">
                      It's not a personality test. It's not an engagement survey. It's a diagnostic that shows you how healthy your leadership culture feels from the inside out—based on what your team actually experiences.
                    </p>
                    
                    <p className="text-pretty">
                      You get a scorecard. Your team gets anonymity. You both get clarity.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center items-start">
                  <div className="w-full max-w-md h-96 bg-[#FAFAF9] border border-[#1A1A1A]/10 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📊</div>
                      <p className="text-sm text-[#6B6B6B]">Sample ALI Scorecard</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Six Dimensions */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-12 sm:mb-16 text-center text-[#1A1A1A] font-serif tracking-tight text-balance">
                Six Dimensions of Servant Leadership
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                {dimensions.map((dimension, idx) => (
                  <div
                    key={idx}
                    className="bg-white border-l-[6px] border-[#C85A3C] border border-[#1A1A1A]/10 p-8 sm:p-10"
                  >
                    <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                      {dimension.title}
                    </h3>
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                      {dimension.question}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Join the Pilot */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 sm:mb-6 text-center text-[#1A1A1A] font-serif tracking-tight text-balance">
                Why Join the Pilot?
              </h2>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12 sm:mb-16 text-center max-w-3xl mx-auto text-pretty">
                Pilot participants get early access, reduced pricing, and a direct line to the person building this.
              </p>
              
              <div className="grid md:grid-cols-3 gap-8 md:gap-12">
                {benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    className="bg-white border-l-[6px] border-[#C85A3C] border border-[#1A1A1A]/10 p-8 sm:p-10"
                  >
                    <div className="text-4xl mb-4">{benefit.icon}</div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight">
                      {benefit.title}
                    </h3>
                    <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                      {benefit.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Signup Form Section */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#FAFAF9]">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 sm:mb-6 text-[#1A1A1A] font-serif tracking-tight text-balance">
                Join the ALI Pilot
              </h2>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-8 sm:mb-10 text-pretty">
                Let's talk about where you are, what you're trying to build, and whether ALI is the right fit.
              </p>
              
              <div className="text-center mb-8 sm:mb-10">
                <a
                  href="/culture-science/ali/apply"
                  className="inline-block bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
                >
                  Start Your Application
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* What to Expect */}
        <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-12 sm:mb-16 text-center text-[#1A1A1A] font-serif tracking-tight text-balance">
                What to Expect
              </h2>
              
              <div className="space-y-8 sm:space-y-12">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-6 sm:gap-8 items-start">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-[#C85A3C] flex items-center justify-center">
                      <span className="text-white font-bold text-lg sm:text-xl">{step.number}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 sm:mb-4 font-serif tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] text-pretty">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
