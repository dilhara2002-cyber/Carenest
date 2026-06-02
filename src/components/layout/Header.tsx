'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell, Search, Calendar, MessageSquare, Syringe, Info, AlertTriangle, Check, ChevronRight, X } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Modal } from '@/components/ui';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: 'READ' | 'UNREAD';
  link: string | null;
  createdAt: string;
}

interface MotherProfile {
  id: string;
  mohRegistrationNumber: string | null;
  nicNumber: string | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  user: {
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
  };
}

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [motherProfile, setMotherProfile] = useState<MotherProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=5');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchMotherProfile = async () => {
    if (!session?.user?.motherId) return;
    
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/mothers/${session.user.motherId}`);
      if (res.ok) {
        const data = await res.json();
        setMotherProfile(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch mother profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileClick = () => {
    setIsProfileOpen(true);
    if (!motherProfile) {
      fetchMotherProfile();
    }
  };

  const handleEditProfile = () => {
    setIsProfileOpen(false);
    router.push('/settings');
  };

  useEffect(() => {
    if (session) {
      fetchUnreadCount();
      fetchNotifications();
      // Poll every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      fetchUnreadCount();
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === 'UNREAD') {
      await markAsRead(notification.id);
    }
    setShowDropdown(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'VISIT_REMINDER':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'VACCINATION_REMINDER':
        return <Syringe className="h-4 w-4 text-purple-500" />;
      case 'CHAT':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'ALERT':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-teal-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Search */}
        <div className="flex-1 max-w-md ml-12 lg:ml-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center text-xs text-white bg-red-500 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 border-b cursor-pointer transition-colors ${
                          notification.status === 'UNREAD' 
                            ? 'bg-teal-50 hover:bg-teal-100' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-white rounded-full shadow-sm">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </p>
                              {notification.status === 'UNREAD' && (
                                <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDateTime(notification.createdAt)}
                            </p>
                          </div>
                          {notification.link && (
                            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications</p>
                    </div>
                  )}
                </div>

                <Link
                  href="/notifications"
                  onClick={() => setShowDropdown(false)}
                  className="block p-3 text-center text-sm text-teal-600 hover:bg-gray-50 border-t font-medium"
                >
                  View All Notifications
                </Link>
              </div>
            )}
          </div>

          {/* User info - Clickable profile */}
          <div onClick={handleProfileClick} className="hidden md:flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer rounded-lg p-2 -mr-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
              <p className="text-xs text-gray-500">{session?.user?.role}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-teal-700 font-medium">
                {session?.user?.name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} size="lg">
        {profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
          </div>
        ) : motherProfile ? (
          <div className="space-y-6">
            {/* Avatar and Name Header */}
            <div className="flex flex-col items-center space-y-3">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center border-2 border-teal-300">
                <span className="text-teal-700 font-bold text-3xl">
                  {motherProfile.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">{motherProfile.user.name}</h2>
                <p className="text-sm text-gray-600 mt-1">MOTHER</p>
              </div>
            </div>

            {/* MOH Registration Number - Prominent Badge */}
            {motherProfile.mohRegistrationNumber && (
              <div className="bg-teal-50 border-2 border-teal-200 p-4 rounded-lg text-center">
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-widest mb-2">MOH Registration Number</p>
                <p className="text-2xl font-bold text-teal-900">{motherProfile.mohRegistrationNumber}</p>
                <p className="text-xs text-teal-600 mt-2">H 502 Registry Serial</p>
              </div>
            )}

            {/* Profile Details - 2 Column Grid */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              {/* Email */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Email</p>
                <p className="text-sm text-gray-900 font-medium">{motherProfile.user.email}</p>
              </div>

              {/* Phone Number */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Phone Number</p>
                <p className="text-sm text-gray-900 font-medium">{motherProfile.user.phone || '-'}</p>
              </div>

              {/* Date of Birth */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Date of Birth</p>
                <p className="text-sm text-gray-900 font-medium">
                  {motherProfile.dateOfBirth 
                    ? new Date(motherProfile.dateOfBirth).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : '-'}
                </p>
              </div>

              {/* Blood Group */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Blood Group</p>
                {motherProfile.bloodGroup ? (
                  <span className="inline-block bg-red-50 text-red-800 text-sm font-bold px-3 py-1 rounded-md border border-red-200">
                    {motherProfile.bloodGroup}
                  </span>
                ) : (
                  <p className="text-sm text-gray-900 font-medium">-</p>
                )}
              </div>

              {/* Address - Full Width */}
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Address</p>
                <p className="text-sm text-gray-900 font-medium">{motherProfile.user.address || '-'}</p>
              </div>

              {/* NIC Number - If Available */}
              {motherProfile.nicNumber && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">NIC Number</p>
                  <p className="text-sm text-gray-900 font-medium">{motherProfile.nicNumber}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 border-t pt-4">
              <button
                onClick={() => setIsProfileOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleEditProfile}
                className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-600">Failed to load profile</p>
          </div>
        )}
      </Modal>
    </header>
  );
}
