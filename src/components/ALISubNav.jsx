import React, { useState, useEffect, useRef } from 'react';

export default function ALISubNav() {
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleScroll = () => {
      // Only hide/show on mobile
      if (window.innerWidth < 768) {
        const currentScrollY = window.scrollY;
        
        // Show when scrolling up, hide when scrolling down
        if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          // Scrolling down - hide
          setIsVisible(false);
        } else if (currentScrollY < lastScrollY.current) {
          // Scrolling up - show
          setIsVisible(true);
        }
        
        lastScrollY.current = currentScrollY;
      } else {
        // Always visible on desktop
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const navItems = [
    { label: 'Overview', href: '/culture-science/ali' },
    { label: 'Why ALI Exists', href: '/culture-science/ali/why-ali-exists' },
    { label: 'The Method', href: '/culture-science/ali/method' },
    { label: 'Dashboard', href: '/culture-science/ali/dashboard' },
    { label: 'Six Conditions', href: '/culture-science/ali/six-leadership-conditions' },
    { label: 'Early Warning', href: '/culture-science/ali/early-warning' },
    { label: 'FAQs', href: '/faqs?category=ali' },
  ];

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const currentSearch = typeof window !== 'undefined' ? window.location.search : '';

  return (
    <nav className={`bg-[#FAFAF9] border-b border-[#1A1A1A]/10 sticky top-20 z-40 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-3 sm:py-4 scrollbar-hide">
          {navItems.map((item) => {
            // Check if active - handle both path and query params
            const isActive = item.href.includes('?') 
              ? currentPath + currentSearch === item.href
              : currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className={`whitespace-nowrap px-3 sm:px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#C85A3C] border-b-2 border-[#C85A3C]'
                    : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

