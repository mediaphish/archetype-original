import React, { useState, useEffect } from "react";
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
import ContactPage from "./pages/Contact";
import MentoringPage from "./pages/mentoring/Mentoring";
import Mentoring1on1 from "./pages/mentoring/Mentoring1on1";
import TeamCulture from "./pages/mentoring/TeamCulture";
import Workshops from "./pages/mentoring/Workshops";
import SpeakingPage from "./pages/mentoring/Speaking";
import Testimonials from "./pages/mentoring/Testimonials";
import Consulting from "./pages/mentoring/Consulting";
import Fractional from "./pages/mentoring/Fractional";
import CultureSciencePage from "./pages/cultureScience/CultureScience";
import ScoreboardLeadership from "./pages/cultureScience/ScoreboardLeadership";
import BadLeaderProject from "./pages/cultureScience/BadLeaderProject";
import IndustryReports from "./pages/cultureScience/IndustryReports";
import Ethics from "./pages/cultureScience/Ethics";
import Research from "./pages/cultureScience/Research";
import ArchyPage from "./pages/archy/Archy";
import ArchyHowItWorks from "./pages/archy/HowItWorks";
import ArchyCorpus from "./pages/archy/Corpus";
import ArchyAsk from "./pages/archy/Ask";
import Playbooks from "./pages/Playbooks";

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
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
      } else if (path === '/about') {
        setCurrentPage('about');
      } else if (path === '/contact') {
        setCurrentPage('contact');
      } else if (path === '/mentoring' || path.startsWith('/mentoring/')) {
        // Handle mentoring sub-routes
        if (path === '/mentoring/1-1') {
          setCurrentPage('mentoring-1-1');
        } else if (path === '/mentoring/team-culture') {
          setCurrentPage('mentoring-team-culture');
        } else if (path === '/mentoring/workshops') {
          setCurrentPage('mentoring-workshops');
        } else if (path === '/mentoring/speaking') {
          setCurrentPage('mentoring-speaking');
        } else if (path === '/mentoring/testimonials') {
          setCurrentPage('mentoring-testimonials');
        } else {
          setCurrentPage('mentoring');
        }
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
          } else if (path === '/culture-science/ali/dashboard') {
            setCurrentPage('ali-dashboard');
          } else if (path === '/culture-science/ali/six-leadership-conditions') {
            setCurrentPage('ali-six-conditions');
          } else if (path === '/culture-science/ali/faqs') {
            setCurrentPage('ali-faqs');
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
        if (path === '/archy/how-it-works') {
          setCurrentPage('archy-how-it-works');
        } else if (path === '/archy/corpus') {
          setCurrentPage('archy-corpus');
        } else if (path === '/archy/ask') {
          setCurrentPage('archy-ask');
        } else {
          setCurrentPage('archy');
        }
      } else if (path === '/philosophy') {
        setCurrentPage('philosophy');
      } else if (path === '/playbooks') {
        setCurrentPage('playbooks');
      } else if (path === '/consulting') {
        setCurrentPage('consulting');
      } else if (path === '/speaking') {
        setCurrentPage('speaking');
      } else if (path === '/fractional') {
        setCurrentPage('fractional');
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
    window.addEventListener('popstate', handleRoute);
    handleRoute(); // Check initial route

    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  // Scroll to top when page changes (but not for hash links)
  useEffect(() => {
    // Only scroll if there's no hash in the URL (anchor links should handle their own scrolling)
    if (!window.location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
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

  // Render ALI Dashboard page
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
  if (currentPage === 'mentoring') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <MentoringPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-1-1') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Mentoring1on1 />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-team-culture') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <TeamCulture />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-workshops') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Workshops />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-speaking') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <SpeakingPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-testimonials') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Testimonials />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'consulting') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Consulting />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'speaking') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <SpeakingPage />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'fractional') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Fractional />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }

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
  if (currentPage === 'archy-how-it-works') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ArchyHowItWorks />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'archy-corpus') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ArchyCorpus />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'archy-ask') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ArchyAsk />
        <Footer />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'playbooks') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Playbooks />
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