'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  Baby,
  Calendar,
  Syringe,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Heart,
  FileText,
  Brain,
  ChevronDown,
  UserPlus,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/mother', icon: Home, roles: ['MOTHER'] },
  { label: 'Dashboard', href: '/midwife', icon: Home, roles: ['MIDWIFE'] },
  { label: 'Dashboard', href: '/admin', icon: Home, roles: ['ADMIN'] },
  { label: 'Midwives', href: '/midwives', icon: UserPlus, roles: ['ADMIN'] },
  { label: 'Mothers', href: '/mothers', icon: Users, roles: ['MIDWIFE', 'ADMIN'] },
  { label: 'My Pregnancy', href: '/pregnancies', icon: Heart, roles: ['MOTHER'] },
  { label: 'Pregnancies', href: '/pregnancies', icon: Heart, roles: ['MIDWIFE', 'ADMIN'] },
  { label: 'My Children', href: '/children', icon: Baby, roles: ['MOTHER'] },
  { label: 'Children', href: '/children', icon: Baby, roles: ['MIDWIFE', 'ADMIN'] },
  { label: 'My Visits', href: '/visits', icon: Calendar, roles: ['MOTHER'] },
  { label: 'Visits', href: '/visits', icon: Calendar, roles: ['MIDWIFE', 'ADMIN'] },
  { label: 'My Vaccinations', href: '/vaccinations', icon: Syringe, roles: ['MOTHER'] },
  { label: 'Vaccinations', href: '/vaccinations', icon: Syringe, roles: ['MIDWIFE', 'ADMIN'] },
  { label: 'AI Care', href: '/ai-care', icon: Brain, roles: ['MOTHER'] },
  { label: 'Chat', href: '/chat', icon: MessageSquare, roles: ['MOTHER', 'MIDWIFE'] },
  { label: 'Notifications', href: '/notifications', icon: Bell, roles: ['MOTHER', 'MIDWIFE', 'ADMIN'] },
  { label: 'Reports', href: '/reports', icon: FileText, roles: ['MIDWIFE', 'ADMIN'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['MOTHER', 'MIDWIFE', 'ADMIN'] },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'MOTHER';

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
            <Heart className="h-8 w-8 text-teal-600" />
            <span className="text-xl font-bold text-gray-900">CareNest</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-teal-700 font-medium">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{userRole}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
