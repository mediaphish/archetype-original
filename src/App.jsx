import React, { useState, useEffect } from "react";
import SEO from "./components/SEO";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ChatApp from "./app/ChatApp";
import Contact from "./components/Contact";
import FloatingArchyButton from "./components/FloatingArchyButton";
import HomeHero from "./components/home/HomeHero";
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
import AntiProjectsPage from "./pages/cultureScience/AntiProjects";
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
      if (path === '/journal') {
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
          } else {
            setCurrentPage('ali');
          }
        } else if (path === '/culture-science/anti-projects') {
          setCurrentPage('anti-projects');
        } else if (path === '/culture-science/scoreboard-leadership') {
          setCurrentPage('scoreboard-leadership');
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

  // Render About page
  if (currentPage === 'about') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <AboutPage />
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
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-1-1') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Mentoring1on1 />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-team-culture') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <TeamCulture />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-workshops') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Workshops />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-speaking') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <SpeakingPage />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'mentoring-testimonials') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Testimonials />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'consulting') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Consulting />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'speaking') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <SpeakingPage />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'fractional') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Fractional />
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
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'anti-projects') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <AntiProjectsPage />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'scoreboard-leadership') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ScoreboardLeadership />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'bad-leader-project') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <BadLeaderProject />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'industry-reports') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <IndustryReports />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'ethics') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Ethics />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'culture-science-research') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Research />
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
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'archy-how-it-works') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ArchyHowItWorks />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'archy-corpus') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ArchyCorpus />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'archy-ask') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <ArchyAsk />
        <FloatingArchyButton />
      </main>
    );
  }
  if (currentPage === 'playbooks') {
    return (
      <main className="bg-warm-offWhite text-warm-charcoal">
        <Header />
        <Playbooks />
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
        <WhatImBuilding />
        <AntiProjects />
        <WhyArchetypeOriginal />
        <JournalHighlights />
        <FinalCTA />
        <FloatingArchyButton />
      </main>
    </>
  );
}