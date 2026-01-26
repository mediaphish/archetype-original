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
import DevotionalPost from "./pages/DevotionalPost";
import Faith from "./pages/Faith";
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
// Culture Science ALI marketing pages (remain under /culture-science/ali/*)
import ALI from "./pages/cultureScience/ALI";
import ALIApply from "./pages/cultureScience/ALIApply";
import ALIThanks from "./pages/cultureScience/ALIThanks";
import WhyALIExists from "./pages/cultureScience/WhyALIExists";
import ALIMethod from "./pages/cultureScience/ALIMethod";
import ALIEarlyWarning from "./pages/cultureScience/ALIEarlyWarning";
import ALIDashboard from "./pages/cultureScience/ALIDashboard";
import ALISixConditions from "./pages/cultureScience/ALISixConditions";

// Standalone ALI SaaS pages (under /ali/*)
import ALILanding from "./pages/ali/Landing";
import ALILogin from "./pages/ali/Login";
import ALISignup from "./pages/ali/Signup";
import ALIVerifyEmail from "./pages/ali/VerifyEmail";
import ALISetupAccount from "./pages/ali/SetupAccount";
import ALIDashboardSaaS from "./pages/ali/Dashboard";
import ALIDeploy from "./pages/ali/Deploy";
import ALISettings from "./pages/ali/Settings";
import ALIBilling from "./pages/ali/Billing";
import ALIReports from "./pages/ali/Reports";
import ReportsHub from "./pages/ali/ReportsHub";
import ReportsZones from "./pages/ali/ReportsZones";
import ReportsMirror from "./pages/ali/ReportsMirror";
import ALISurvey from "./pages/ali/Survey";
import SuperAdminOverview from "./pages/ali/SuperAdminOverview";
import SuperAdminIntelligence from "./pages/ali/SuperAdminIntelligence";
import SuperAdminTenants from "./pages/ali/SuperAdminTenants";
import SuperAdminDeletions from "./pages/ali/SuperAdminDeletions";
import SuperAdminAuditLog from "./pages/ali/SuperAdminAuditLog";
// Operators pages
import OperatorsEvents from "./pages/operators/Events";
import OperatorsEventDetail from "./pages/operators/EventDetail";
import OperatorsDashboard from "./pages/operators/Dashboard";
import OperatorsAdmin from "./pages/operators/Admin";
import OperatorsCandidates from "./pages/operators/Candidates";
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
import ALIEULAPage from "./pages/ALIEULA.jsx";
import EngagementInquiryPage from "./pages/EngagementInquiry";

export default function App() {
  // Initialize currentPage based on initial pathname
  const getInitialPage = () => {
    const path = window.location.pathname;
    if (path === '/faith') return 'faith';
    if (path === '/journal') return 'journal';
    if (path.startsWith('/journal/')) return 'journal-post';
    if (path === '/meet-bart' || path === '/about') return 'about';
    if (path === '/contact') return 'contact';
    if (path === '/faqs' || path.startsWith('/faqs')) return 'faqs';
    if (path === '/engagement-inquiry') return 'engagement-inquiry';
    if (path === '/privacy-policy' || path === '/privacy') return 'privacy-policy';
    if (path === '/terms-and-conditions' || path === '/terms' || path === '/terms-of-service') return 'terms-and-conditions';
    if (path === '/ali-eula' || path === '/eula') return 'ali-eula';
    // Standalone ALI SaaS routes (not under culture-science)
    if (path === '/ali') {
      return 'ali-landing';
    }
    if (path.startsWith('/ali/')) {
      if (path === '/ali/login') return 'ali-login';
      if (path === '/ali/signup') return 'ali-signup';
      if (path === '/ali/verify-email') return 'ali-verify-email';
      if (path === '/ali/setup-account') return 'ali-setup-account';
      if (path === '/ali/dashboard') return 'ali-dashboard';
      if (path === '/ali/deploy') return 'ali-deploy';
      if (path === '/ali/settings') return 'ali-settings';
      if (path === '/ali/billing') return 'ali-billing';
      if (path === '/ali/reports') return 'ali-reports';
      if (path === '/ali/reports/zones') return 'ali-reports-zones';
      if (path === '/ali/reports/mirror') return 'ali-reports-mirror';
      if (path.startsWith('/ali/survey/')) return 'ali-survey';
      if (path.startsWith('/ali/super-admin/')) {
        if (path === '/ali/super-admin/overview') return 'ali-super-admin-overview';
        if (path === '/ali/super-admin/intelligence') return 'ali-super-admin-intelligence';
        if (path === '/ali/super-admin/tenants') return 'ali-super-admin-tenants';
        if (path === '/ali/super-admin/deletions') return 'ali-super-admin-deletions';
        if (path === '/ali/super-admin/audit-log') return 'ali-super-admin-audit-log';
        // Default Super Admin route to overview
        return 'ali-super-admin-overview';
      }
      // Unknown /ali/* route - redirect to landing
      return 'ali-landing';
    }
    if (path === '/culture-science' || path.startsWith('/culture-science/')) {
      return 'culture-science';
    }
    if (path === '/archy' || path.startsWith('/archy/')) return 'archy';
    if (path === '/philosophy') return 'philosophy';
    if (path === '/methods' || path.startsWith('/methods/')) return 'methods';
    if (path === '/what-i-do') return 'what-i-do';
    return 'home';
  };
  
  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const isNavigatingBack = useRef(false);
  const previousPath = useRef(window.location.pathname);

  useEffect(() => {
    // Disable scroll restoration globally for journal pages
    if ('scrollRestoration' in window.history) {
      const path = window.location.pathname;
      const isJournalPage = path === '/journal' || path.startsWith('/journal/');
      if (isJournalPage) {
        window.history.scrollRestoration = 'manual';
      }
    }
    
    // Save scroll position before navigation
    const saveScrollPosition = () => {
      const path = window.location.pathname;
      // Don't save scroll positions for journal pages - they should always start at top
      const isJournalPage = path === '/journal' || path.startsWith('/journal/');
      if (!isJournalPage) {
        const scrollY = window.scrollY;
        sessionStorage.setItem(`scrollPos:${path}`, scrollY.toString());
      } else {
        // Clear any saved scroll position for journal pages
        sessionStorage.removeItem(`scrollPos:${path}`);
      }
    };

    // Handle routing and redirects
    const handleRoute = () => {
      const path = window.location.pathname;
      
      // Standalone ALI SaaS routes
      if (path === '/ali') {
        setCurrentPage('ali-landing');
        return;
      }
      if (path.startsWith('/ali/')) {
        if (path === '/ali/login') {
          setCurrentPage('ali-login');
        } else if (path === '/ali/signup') {
          setCurrentPage('ali-signup');
        } else if (path === '/ali/verify-email') {
          setCurrentPage('ali-verify-email');
        } else if (path === '/ali/setup-account') {
          setCurrentPage('ali-setup-account');
        } else if (path === '/ali/dashboard') {
          setCurrentPage('ali-dashboard');
        } else if (path === '/ali/deploy') {
          setCurrentPage('ali-deploy');
        } else if (path === '/ali/settings') {
          setCurrentPage('ali-settings');
        } else if (path === '/ali/billing') {
          setCurrentPage('ali-billing');
        } else if (path === '/ali/reports') {
          setCurrentPage('ali-reports');
        } else if (path === '/ali/reports/zones') {
          setCurrentPage('ali-reports-zones');
        } else if (path === '/ali/reports/mirror') {
          setCurrentPage('ali-reports-mirror');
        } else if (path.startsWith('/ali/survey/')) {
          setCurrentPage('ali-survey');
        } else if (path.startsWith('/ali/super-admin/')) {
          if (path === '/ali/super-admin/overview') {
            setCurrentPage('ali-super-admin-overview');
          } else if (path === '/ali/super-admin/intelligence') {
            setCurrentPage('ali-super-admin-intelligence');
          } else if (path === '/ali/super-admin/tenants') {
            setCurrentPage('ali-super-admin-tenants');
          } else if (path === '/ali/super-admin/deletions') {
            setCurrentPage('ali-super-admin-deletions');
          } else if (path === '/ali/super-admin/audit-log') {
            setCurrentPage('ali-super-admin-audit-log');
          } else {
            // Default Super Admin route to overview
            window.history.replaceState({}, '', '/ali/super-admin/overview');
            setCurrentPage('ali-super-admin-overview');
          }
        } else {
          // Unknown /ali/* route - redirect to landing
          window.history.replaceState({}, '', '/ali');
          setCurrentPage('ali-landing');
        }
        return;
      }
      
      // Handle Operators routes
      if (path.startsWith('/operators/')) {
        if (path === '/operators/events') {
          setCurrentPage('operators-events');
        } else if (path.startsWith('/operators/events/')) {
          const eventId = path.replace('/operators/events/', '');
          if (eventId && eventId !== 'new') {
            setCurrentPage('operators-event-detail');
          } else {
            setCurrentPage('operators-events');
          }
        } else if (path === '/operators/dashboard') {
          setCurrentPage('operators-dashboard');
        } else if (path === '/operators/admin') {
          setCurrentPage('operators-admin');
        } else if (path === '/operators/candidates') {
          setCurrentPage('operators-candidates');
        } else {
          // Default Operators route to events
          window.history.replaceState({}, '', '/operators/events');
          setCurrentPage('operators-events');
        }
        return;
      }
      
      // Redirect old culture-science/ali routes to standalone /ali routes (preserve existing marketing pages)
      if (path === '/culture-science/ali' || path.startsWith('/culture-science/ali/')) {
        // Keep marketing pages under culture-science, only redirect SaaS routes
        if (path === '/culture-science/ali/apply') {
          window.history.replaceState({}, '', '/ali/signup');
          setCurrentPage('ali-signup');
        } else if (path === '/culture-science/ali/thanks') {
          // Keep thanks page or redirect appropriately
          setCurrentPage('ali-thanks');
        } else {
          // All other culture-science/ali/* remain as marketing pages
          if (path === '/culture-science/ali/why-ali-exists') {
            setCurrentPage('why-ali-exists');
          } else if (path === '/culture-science/ali/method') {
            setCurrentPage('ali-method');
          } else if (path === '/culture-science/ali/early-warning' || path === '/culture-science/ali/early-warning-indicators') {
            setCurrentPage('ali-early-warning');
          } else if (path === '/culture-science/ali/dashboard' || path === '/culture-science/ali/dashboard/') {
            window.history.replaceState({}, '', '/ali/dashboard');
            setCurrentPage('ali-dashboard');
          } else if (path === '/culture-science/ali/six-leadership-conditions' || path === '/culture-science/ali/six-leadership-conditions/') {
            setCurrentPage('ali-six-conditions');
          } else if (path === '/culture-science/ali/faqs') {
            window.history.replaceState({}, '', '/faqs?category=ali');
            setCurrentPage('faqs');
          } else {
            setCurrentPage('ali');
          }
        }
        return;
      }
      
      // Route detection
      if (path === '/' || path === '') {
        setCurrentPage('home');
      } else if (path === '/faith') {
        setCurrentPage('faith');
      } else if (path === '/journal') {
        setCurrentPage('journal');
      } else if (path.startsWith('/journal/')) {
        // Check if it's a devotional or journal post
        // We'll determine this in the component based on the post type
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
      
      // If navigating to a journal page, immediately disable scroll restoration and scroll to top
      const isJournalPage = currentPath === '/journal' || currentPath.startsWith('/journal/');
      if (isJournalPage) {
        // Disable scroll restoration immediately
        if ('scrollRestoration' in window.history) {
          window.history.scrollRestoration = 'manual';
        }
        // Force scroll to top immediately - multiple attempts
        window.scrollTo(0, 0);
        // Use requestAnimationFrame for additional attempts
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          requestAnimationFrame(() => {
            window.scrollTo(0, 0);
          });
        });
        // Additional delayed attempts
        setTimeout(() => window.scrollTo(0, 0), 0);
        setTimeout(() => window.scrollTo(0, 0), 10);
        setTimeout(() => window.scrollTo(0, 0), 50);
        setTimeout(() => window.scrollTo(0, 0), 100);
        // Clear any saved scroll position
        sessionStorage.removeItem(`scrollPos:${currentPath}`);
      }
      
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
    
    // Journal pages should always scroll to top (both forward and back navigation)
    const isJournalPage = path === '/journal' || path.startsWith('/journal/');
    
    if (isJournalPage) {
      // Ensure scroll restoration is disabled
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      
      // Always scroll to top for journal pages - use multiple attempts to ensure it sticks
      const scrollToTop = () => window.scrollTo(0, 0);
      
      // Immediate scroll (synchronous)
      scrollToTop();
      
      // Multiple delayed attempts to catch any late scroll restoration
      requestAnimationFrame(() => {
        scrollToTop();
        requestAnimationFrame(() => {
          scrollToTop();
        });
      });
      
      // Additional delayed attempts - more aggressive
      const timers = [0, 10, 50, 100, 200, 300, 500].map(delay => 
        setTimeout(scrollToTop, delay)
      );
      
      // Clear any saved scroll position for journal pages
      sessionStorage.removeItem(`scrollPos:${path}`);
      
      return () => {
        timers.forEach(clearTimeout);
      };
    } else {
      // For other pages, use normal scroll restoration
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
      } else if (!window.location.hash) {
        // Forward navigation or first visit - scroll to top
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
        });
      }
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

  // Render Faith page
  if (currentPage === 'faith') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Faith />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

  // Render Journal post page (handles both journal posts and devotionals)
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

  // Render standalone ALI SaaS pages (no Header/Footer/Archy)
  if (currentPage === 'ali-landing') {
    return <ALILanding />;
  }

  if (currentPage === 'ali-login') {
    return <ALILogin />;
  }

  if (currentPage === 'ali-signup') {
    return <ALISignup />;
  }

  if (currentPage === 'ali-verify-email') {
    return <ALIVerifyEmail />;
  }

  if (currentPage === 'ali-setup-account') {
    return <ALISetupAccount />;
  }

  if (currentPage === 'ali-dashboard') {
    return <ALIDashboardSaaS />;
  }

  if (currentPage === 'ali-deploy') {
    return <ALIDeploy />;
  }

  if (currentPage === 'ali-settings') {
    return <ALISettings />;
  }

  if (currentPage === 'ali-billing') {
    return <ALIBilling />;
  }

  if (currentPage === 'ali-reports') {
    return <ReportsHub />;
  }

  if (currentPage === 'ali-reports-zones') {
    return <ReportsZones />;
  }

  if (currentPage === 'ali-reports-mirror') {
    return <ReportsMirror />;
  }

  if (currentPage === 'ali-survey') {
    return <ALISurvey />;
  }

  if (currentPage === 'ali-super-admin-overview') {
    return <SuperAdminOverview />;
  }

  if (currentPage === 'ali-super-admin-intelligence') {
    return <SuperAdminIntelligence />;
  }

  if (currentPage === 'ali-super-admin-tenants') {
    return <SuperAdminTenants />;
  }

  if (currentPage === 'ali-super-admin-deletions') {
    return <SuperAdminDeletions />;
  }

  if (currentPage === 'ali-super-admin-audit-log') {
    return <SuperAdminAuditLog />;
  }

  // Render Operators pages
  if (currentPage === 'operators-events') {
    return <OperatorsEvents />;
  }

  if (currentPage === 'operators-event-detail') {
    return <OperatorsEventDetail />;
  }

  if (currentPage === 'operators-dashboard') {
    return <OperatorsDashboard />;
  }

  if (currentPage === 'operators-admin') {
    return <OperatorsAdmin />;
  }

  if (currentPage === 'operators-candidates') {
    return <OperatorsCandidates />;
  }

  // Render ALI Dashboard page (elevated design) - OLD route under culture-science
  if (currentPage === 'ali-dashboard-old') {
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

  // Render ALI EULA page
  if (currentPage === 'ali-eula') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ALIEULAPage />
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