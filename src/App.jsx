import React, { useState, useEffect, useRef } from "react";
import SEO from "./components/SEO";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ChatApp from "./app/ChatApp";
import Contact from "./components/Contact";
import FloatingArchyButton from "./components/FloatingArchyButton";
import Footer from "./components/Footer";
import HomeHero from "./components/home/HomeHero";
import MeetBart from "./components/home/MeetBart";
import MeetArchy from "./components/home/MeetArchy";
import WhatImBuilding from "./components/home/WhatImBuilding";
import AntiProjects from "./components/home/AntiProjects";
import WhyArchetypeOriginal from "./components/home/WhyArchetypeOriginal";
import JournalHighlights from "./components/home/JournalHighlights";
import FinalCTA from "./components/home/FinalCTA";
import Journal from "./pages/Journal";
import JournalPost from "./pages/JournalPost";
import AboutPage from "./pages/About";
import PhilosophyPage from "./pages/Philosophy";
import MethodsPage from "./pages/Methods";
import MentorshipPage from "./pages/methods/Mentorship";
import ConsultingPage from "./pages/methods/Consulting";
import SpeakingSeminarsPage from "./pages/methods/SpeakingSeminars";
import TrainingEducationPage from "./pages/methods/TrainingEducation";
import FractionalRolesPage from "./pages/methods/FractionalRoles";
import CCOPage from "./pages/methods/fractionalRoles/CCO";
import WhatIDoPage from "./pages/WhatIDo.jsx";
import ALI from "./pages/cultureScience/ALI";
import ALIApply from "./pages/cultureScience/ALIApply";
import ALIThanks from "./pages/cultureScience/ALIThanks";
import WhyALIExists from "./pages/cultureScience/WhyALIExists";
import ALIMethod from "./pages/cultureScience/ALIMethod";
import ALIEarlyWarning from "./pages/cultureScience/ALIEarlyWarning";
import ALIDashboard from "./pages/cultureScience/ALIDashboard";
import ALISixConditions from "./pages/cultureScience/ALISixConditions";
import ContactPage from "./pages/Contact";
import CultureSciencePage from "./pages/cultureScience/CultureScience";
import ScoreboardLeadership from "./pages/cultureScience/ScoreboardLeadership";
import BadLeaderProject from "./pages/cultureScience/BadLeaderProject";
import IndustryReports from "./pages/cultureScience/IndustryReports";
import Ethics from "./pages/cultureScience/Ethics";
import Research from "./pages/cultureScience/Research";
import ArchyPage from "./pages/archy/Archy";
import FAQsPage from "./pages/FAQs";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import TermsAndConditionsPage from "./pages/TermsAndConditions";
import EngagementInquiryPage from "./pages/EngagementInquiry";

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const isNavigatingBack = useRef(false);
  const previousPath = useRef(window.location.pathname);

  useEffect(() => {
    // Save scroll position before navigation
    const saveScrollPosition = () => {
      const path = window.location.pathname;
      const scrollY = window.scrollY;
      sessionStorage.setItem(`scrollPos:${path}`, scrollY.toString());
    };

    // Handle routing and redirects
    const handleRoute = () => {
      const path = window.location.pathname;
      
      // ALI redirects - redirect old routes to new canonical structure
      if (path === '/ali') {
        window.history.replaceState({}, '', '/culture-science/ali');
        setCurrentPage('ali');
        return;
      } else if (path === '/ali/apply') {
        window.history.replaceState({}, '', '/culture-science/ali/apply');
        setCurrentPage('ali-apply');
        return;
      } else if (path === '/ali/thanks') {
        window.history.replaceState({}, '', '/culture-science/ali/thanks');
        setCurrentPage('ali-thanks');
        return;
      }
      
      // Route detection
      if (path === '/' || path === '') {
        setCurrentPage('home');
      } else if (path === '/journal') {
        setCurrentPage('journal');
      } else if (path.startsWith('/journal/')) {
        setCurrentPage('journal-post');
      } else if (path === '/meet-bart') {
        setCurrentPage('about');
      } else if (path === '/about') {
        // Redirect old /about to /meet-bart
        window.history.replaceState({}, '', '/meet-bart');
        setCurrentPage('about');
        return;
      } else if (path === '/contact') {
        setCurrentPage('contact');
      } else if (path === '/faqs' || path.startsWith('/faqs')) {
        setCurrentPage('faqs');
      } else if (path === '/engagement-inquiry') {
        setCurrentPage('engagement-inquiry');
      } else if (path === '/privacy-policy' || path === '/privacy') {
        setCurrentPage('privacy-policy');
      } else if (path === '/terms-and-conditions' || path === '/terms' || path === '/terms-of-service') {
        setCurrentPage('terms-and-conditions');
      } else if (path === '/culture-science' || path.startsWith('/culture-science/')) {
        if (path === '/culture-science/ali' || path.startsWith('/culture-science/ali/')) {
          if (path === '/culture-science/ali/apply') {
            setCurrentPage('ali-apply');
          } else if (path === '/culture-science/ali/thanks') {
            setCurrentPage('ali-thanks');
          } else if (path === '/culture-science/ali/why-ali-exists') {
            setCurrentPage('why-ali-exists');
          } else if (path === '/culture-science/ali/method') {
            setCurrentPage('ali-method');
          } else if (path === '/culture-science/ali/early-warning' || path === '/culture-science/ali/early-warning-indicators') {
            setCurrentPage('ali-early-warning');
          } else if (path === '/culture-science/ali/dashboard' || path === '/culture-science/ali/dashboard/') {
            setCurrentPage('ali-dashboard');
          } else if (path === '/culture-science/ali/six-leadership-conditions' || path === '/culture-science/ali/six-leadership-conditions/') {
            setCurrentPage('ali-six-conditions');
          } else if (path === '/culture-science/ali/faqs') {
            // Redirect old ALI FAQs route to universal FAQs with category filter
            window.history.replaceState({}, '', '/faqs?category=ali');
            setCurrentPage('faqs');
          } else {
            setCurrentPage('ali');
          }
        } else if (path === '/culture-science/anti-projects/scoreboard-leadership') {
          setCurrentPage('scoreboard-leadership');
        } else if (path === '/culture-science/scoreboard-leadership') {
          setCurrentPage('scoreboard-leadership');
        } else if (path === '/culture-science/anti-projects/bad-leader-project') {
          setCurrentPage('bad-leader-project');
        } else if (path === '/culture-science/bad-leader-project') {
          setCurrentPage('bad-leader-project');
        } else if (path === '/culture-science/research') {
          setCurrentPage('culture-science-research');
        } else if (path === '/culture-science/industry-reports') {
          setCurrentPage('industry-reports');
        } else if (path === '/culture-science/ethics') {
          setCurrentPage('ethics');
        } else {
          setCurrentPage('culture-science');
        }
      } else if (path === '/archy' || path.startsWith('/archy/')) {
        // Only allow main Archy page - placeholder subpages removed
        setCurrentPage('archy');
      } else if (path === '/philosophy') {
        setCurrentPage('philosophy');
      } else if (path === '/methods' || path.startsWith('/methods/')) {
        if (path === '/methods/mentorship') {
          setCurrentPage('methods-mentorship');
        } else if (path === '/methods/consulting') {
          setCurrentPage('methods-consulting');
        } else if (path === '/methods/fractional-roles/cco') {
          setCurrentPage('methods-fractional-cco');
        } else if (path === '/methods/fractional-roles') {
          setCurrentPage('methods-fractional-roles');
        } else if (path === '/methods/speaking-seminars') {
          setCurrentPage('methods-speaking-seminars');
        } else if (path === '/methods/training-education') {
          setCurrentPage('methods-training-education');
        } else {
          setCurrentPage('methods');
        }
      } else if (path === '/what-i-do') {
        setCurrentPage('what-i-do');
      } else {
        setCurrentPage('home');
      }
    };

    // Listen for route changes
    const handlePopState = (e) => {
      const currentPath = window.location.pathname;
      // Check if we're navigating back by comparing paths
      // If the new path was visited before (has saved scroll), it's likely a back navigation
      const hasSavedScroll = sessionStorage.getItem(`scrollPos:${currentPath}`) !== null;
      isNavigatingBack.current = hasSavedScroll && currentPath !== previousPath.current;
      previousPath.current = currentPath;
      handleRoute();
    };

    window.addEventListener('popstate', handlePopState);
    handleRoute(); // Check initial route

    // Save scroll position before unload
    const handleBeforeUnload = () => {
      saveScrollPosition();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Save scroll position periodically while on page
    const scrollSaveInterval = setInterval(() => {
      saveScrollPosition();
    }, 1000);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(scrollSaveInterval);
    };
  }, []);

  // Handle scroll restoration when page changes
  useEffect(() => {
    const path = window.location.pathname;
    const savedScrollPos = sessionStorage.getItem(`scrollPos:${path}`);
    
    // If we have a saved scroll position (means we're returning to this page), restore it
    // This handles back navigation - when you go back, the saved position exists
    if (savedScrollPos !== null && !window.location.hash && isNavigatingBack.current) {
      const scrollY = parseInt(savedScrollPos, 10);
      // Use requestAnimationFrame to ensure DOM is ready, then restore scroll
      requestAnimationFrame(() => {
        // Double RAF to ensure layout is complete
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        });
      });
      // Clear the saved position so it doesn't interfere with future visits
      // sessionStorage.removeItem(`scrollPos:${path}`);
    } else if (!window.location.hash) {
      // Forward navigation or first visit - scroll to top
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
    }
    
    // Reset the flag after handling
    isNavigatingBack.current = false;
  }, [currentPage]);

  // Render About page
  if (currentPage === 'about') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <AboutPage />
        <Footer />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Philosophy page
  if (currentPage === 'philosophy') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <PhilosophyPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Methods page
  if (currentPage === 'methods') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <MethodsPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Methods Mentorship page
  if (currentPage === 'methods-mentorship') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <MentorshipPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Methods Consulting page
  if (currentPage === 'methods-consulting') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ConsultingPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Methods Speaking & Seminars page
  if (currentPage === 'methods-speaking-seminars') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <SpeakingSeminarsPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Methods Training & Education page
  if (currentPage === 'methods-training-education') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <TrainingEducationPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Methods Fractional Roles page
  if (currentPage === 'methods-fractional-roles') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <FractionalRolesPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Methods Fractional CCO page
  if (currentPage === 'methods-fractional-cco') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <CCOPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render What I Do page
  if (currentPage === 'what-i-do') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <WhatIDoPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Journal post page
  if (currentPage === 'journal-post') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <JournalPost />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Journal page
  if (currentPage === 'journal') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Journal />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render ALI landing page
  if (currentPage === 'ali') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ALI />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render ALI apply page
  if (currentPage === 'ali-apply') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ALIApply />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render ALI thanks page
  if (currentPage === 'ali-thanks') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ALIThanks />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Why ALI Exists page
  if (currentPage === 'why-ali-exists') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <WhyALIExists />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render ALI Method page
  if (currentPage === 'ali-method') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ALIMethod />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render ALI Early Warning page
  if (currentPage === 'ali-early-warning') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ALIEarlyWarning />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render ALI Dashboard page (elevated design)
  if (currentPage === 'ali-dashboard') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ALIDashboard />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render ALI Six Conditions page
  if (currentPage === 'ali-six-conditions') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ALISixConditions />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render FAQs page
  if (currentPage === 'faqs') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <FAQsPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Privacy Policy page
  if (currentPage === 'privacy-policy') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <PrivacyPolicyPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Terms and Conditions page
  if (currentPage === 'terms-and-conditions') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <TermsAndConditionsPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Engagement Inquiry page
  if (currentPage === 'engagement-inquiry') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <EngagementInquiryPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Contact page
  if (currentPage === 'contact') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ContactPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Mentoring pages

  // Render Culture Science pages
  if (currentPage === 'culture-science') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <CultureSciencePage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'scoreboard-leadership') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ScoreboardLeadership />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'bad-leader-project') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <BadLeaderProject />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'industry-reports') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <IndustryReports />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'ethics') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Ethics />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'culture-science-research') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Research />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Archy pages
  if (currentPage === 'archy') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ArchyPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Home page
  return (
    <>
      <SEO pageKey="default" />
      <main>
        <Header />
        <HomeHero />
        <MeetArchy />
        <MeetBart />
        <WhatImBuilding />
        <AntiProjects />
        <WhyArchetypeOriginal />
        <JournalHighlights />
        <FinalCTA />
        <Footer />
        <FloatingArchyButton />
      </main>
    </>
  );
}