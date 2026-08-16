import { useState } from 'react';
import { Link } from 'react-router-dom';

const linkBase = 'flex items-center gap-3 px-6 py-3.5 rounded-lg transition-all duration-200 mx-3';
const linkActive = 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]';
const linkInactive = 'text-white/70 hover:bg-white/8 hover:text-white';

interface SidebarItemProps {
  item: {
    label: string;
    icon?: string;
    path?: string;
    submenu?: { label: string; path: string }[];
  };
  pathname: string;
}

export default function SidebarItem({ item, pathname }: SidebarItemProps) {
  const [open, setOpen] = useState(false);
  const hasSub = item.submenu && item.submenu.length > 0;
  const isActive = hasSub
    ? item.submenu!.some((s) => pathname === s.path)
    : pathname === item.path;

  if (hasSub) {
    const isOpen = open || isActive;
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`${linkBase} w-full text-left ${isActive ? linkActive : linkInactive}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <i className={`fa-solid ${item.icon} w-5 text-center shrink-0 ${isActive ? 'drop-shadow-[0_2px_4px_rgba(255,255,255,0.3)]' : ''}`} />
            <span className="font-medium truncate">{item.label}</span>
          </div>
          <i className={`fa-solid fa-chevron-down text-[10px] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
          <ul className="space-y-0.5 ml-2">
            {item.submenu.map((sub) => (
              <li key={sub.path}>
                <Link
                  to={sub.path}
                  className={`flex items-center gap-3 px-9 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                    pathname === sub.path ? linkActive : 'text-white/60 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                  <span className="truncate">{sub.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        to={item.path!}
        className={`${linkBase} ${isActive ? `${linkActive} font-semibold` : linkInactive}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <i className={`fa-solid ${item.icon} w-5 text-center shrink-0 ${isActive ? 'drop-shadow-[0_2px_4px_rgba(255,255,255,0.3)]' : ''}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />}
      </Link>
    </li>
  );
}