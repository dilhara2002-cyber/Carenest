'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  MessageCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssignedMidwife {
  id: string;
  userId: string;
  licenseNumber: string | null;
  specialization: string | null;
  workArea: string | null;
  experience: number | null;
  user: {
    name: string;
    email: string;
    phone: string | null;
    profileImage: string | null;
    isActive: boolean;
  };
}

interface AssignedMidwifeCardProps {
  midwife: AssignedMidwife | null;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function MidwifeAvatar({
  name,
  profileImage,
}: {
  name: string;
  profileImage: string | null;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={name}
        className="h-14 w-14 rounded-full object-cover ring-2 ring-teal-100"
      />
    );
  }

  return (
    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center ring-2 ring-teal-100 shrink-0">
      <span className="text-white text-lg font-bold">{initials}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Info Row
// ---------------------------------------------------------------------------

function InfoRow({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// No Midwife State
// ---------------------------------------------------------------------------

function NoMidwifeState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <User className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600">No midwife assigned yet</p>
      <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
        An administrator will assign a midwife to your profile shortly.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AssignedMidwifeCard({ midwife }: AssignedMidwifeCardProps) {
  return (
    <div className="w-full md:w-1/2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <User className="h-5 w-5 text-teal-600" />
            </div>
            My Midwife
          </CardTitle>
        </CardHeader>

        <CardContent>
          {!midwife ? (
            <NoMidwifeState />
          ) : (
            <div className="space-y-4">
              {/* Top: Avatar + name + status */}
              <div className="flex items-center gap-3">
                <MidwifeAvatar
                  name={midwife.user.name}
                  profileImage={midwife.user.profileImage}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-base leading-tight">
                      {midwife.user.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        midwife.user.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          midwife.user.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      {midwife.user.isActive ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <p className="text-sm text-teal-600 font-medium mt-0.5">
                    {midwife.specialization ?? 'Midwife'}
                  </p>
                  {midwife.licenseNumber && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Lic. {midwife.licenseNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Details */}
              <div className="space-y-2">
                <InfoRow
                  icon={<Phone className="h-3.5 w-3.5" />}
                  value={midwife.user.phone}
                />
                <InfoRow
                  icon={<Mail className="h-3.5 w-3.5" />}
                  value={midwife.user.email}
                />
                <InfoRow
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  value={midwife.workArea}
                />
                <InfoRow
                  icon={<Briefcase className="h-3.5 w-3.5" />}
                  value={
                    midwife.experience
                      ? `${midwife.experience} year${midwife.experience > 1 ? 's' : ''} experience`
                      : null
                  }
                />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Message button */}
              <Link href="/chat">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}