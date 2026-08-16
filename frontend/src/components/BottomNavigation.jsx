import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const tabs = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 01-.53 1.28h-1.44v7.44a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-7.44H2.31a.75.75 0 01-.53-1.28l8.69-8.69z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        )}
      </svg>
    ),
  },
  {
    to: '/activity',
    label: 'Activity',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path fillRule="evenodd" d="M2.625 3.75a1.125 1.125 0 0 1 1.125-1.125h12.5a1.125 1.125 0 0 1 1.125 1.125v16.5A1.125 1.125 0 0 1 16.25 21.375H3.75a1.125 1.125 0 0 1-1.125-1.125V3.75Zm4.875 4.875a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Zm0 3.75a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Zm0 3.75a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        )}
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0ZM12.75 3a.75.75 0 0 0-.75.75v8.25h8.25a.75.75 0 0 0 .75-.75A8.25 8.25 0 0 0 12.75 3Z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6ZM13.5 3.75a7.5 7.5 0 0 1 7.5 7.5h-7.5V3.75Z" />
        )}
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        )}
      </svg>
    ),
  },
];

export default function BottomNavigation() {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-surface-900/95 backdrop-blur-xl border-t border-white/8"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="tablist"
      aria-label={t('general.loadingContent')}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const labelKey = `nav.${tab.label.toLowerCase()}`;
          const localizedLabel = t(labelKey);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className="flex-1"
              role="tab"
              aria-label={localizedLabel}
            >
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-0.5 py-2 relative">
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-liv-500"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={isActive ? 'text-liv-400' : 'text-white/30'}>
                    {tab.icon(isActive)}
                  </span>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-liv-400' : 'text-white/30'}`}>
                    {localizedLabel}
                  </span>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
