import React from 'react';

export default function ALISubNav() {
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
    { label: 'FAQs', href: '/culture-science/ali/faqs' },
  ];

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <nav className="bg-[#FAFAF9] border-b border-[#1A1A1A]/10 sticky top-20 z-40">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-3 sm:py-4 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
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

