"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Users, Calendar, Syringe, Brain, Shield, ArrowRight } from "lucide-react";
import logo from "./logo.png";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans overflow-hidden">
      {/* Background decorations for a creative touch */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FBCFE8] blur-[120px] opacity-40 mix-blend-multiply pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-[30%] h-[40%] rounded-full bg-[#E0E7FF] blur-[100px] opacity-60 mix-blend-multiply pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-50 bg-transparent pt-4">
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src={logo} alt="CareNest Logo" width={48} height={48} priority style={{ width: "auto", height: "auto" }} />
            <span className="text-2xl font-bold tracking-tight text-[#111827]">CareNest</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-[#6B7280] hover:text-[#2563EB] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-[#111827] text-white px-5 py-2.5 rounded-full hover:bg-[#2563EB] transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 sm:pt-40 sm:pb-32 lg:pb-40">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1FAE5] text-[#10B981] text-xs font-semibold tracking-wide uppercase mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
            </span>
            Next-gen care platform
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#111827] mb-8 leading-[1.1]">
            Elevating <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F472B6]">Maternal Care</span><br className="hidden sm:block"/> for the Modern Era
          </h1>
          <p className="text-lg sm:text-xl text-[#6B7280] max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            An intelligent, minimalist space for midwives and mothers to seamlessly track pregnancies, coordinate visits, and embrace AI-assisted wellness.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white px-8 py-3.5 rounded-full font-medium hover:bg-[#1E40AF] transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-[#E5E7EB] text-[#111827] px-8 py-3.5 rounded-full font-medium hover:border-[#2563EB] hover:text-[#2563EB] transition-all duration-300 shadow-sm"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 bg-white border-t border-[#E5E7EB] py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#111827] mb-4">Intelligently Designed</h2>
            <p className="text-[#6B7280] text-lg font-light">Everything you need to provide exceptional care, thoughtfully balanced in one comprehensive dashboard.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Users className="h-6 w-6 text-[#2563EB]" />}
              title="Holistic Management"
              description="Unified health records for mothers and children, cleanly organized and instantly accessible."
              accentColor="bg-blue-50"
            />
            <FeatureCard
              icon={<Calendar className="h-6 w-6 text-[#F472B6]" />}
              title="Smart Scheduling"
              description="Frictionless appointment tracking and automated reminders that respect your time."
              accentColor="bg-pink-50"
            />
            <FeatureCard
              icon={<Syringe className="h-6 w-6 text-[#10B981]" />}
              title="Vaccine Tracking"
              description="Clear, proactive schedules for immunizations, ensuring peace of mind at every step."
              accentColor="bg-emerald-50"
            />
            <FeatureCard
              icon={<Brain className="h-6 w-6 text-[#3B82F6]" />}
              title="AI-Assisted Guidance"
              description="Context-aware insights and gentle, personalized wellness suggestions powered by intelligence."
              accentColor="bg-blue-50"
            />
            <FeatureCard
              icon={<Heart className="h-6 w-6 text-[#EF4444]" />}
              title="Milestone Monitoring"
              description="A beautiful week-by-week visual journey of pregnancy progress and key health indicators."
              accentColor="bg-red-50"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-[#F59E0B]" />}
              title="Secure Collaboration"
              description="Encrypted, private messaging bridging the gap between care providers and families."
              accentColor="bg-amber-50"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 bg-[#111827] overflow-hidden">
        {/* Subtle dark mode creative accents */}
        <div className="absolute top-0 right-0 w-[50%] h-[100%] bg-gradient-to-l from-[#1E40AF]/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[100%] bg-gradient-to-r from-[#F472B6]/10 to-transparent pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 tracking-tight">
            Ready to shape the future of care?
          </h2>
          <p className="text-lg text-[#6B7280] mb-10 font-light max-w-xl mx-auto">
            Experience the harmony of intelligent tools and compassionate design with CareNest.
          </p>
          <Link
            href="/register"
            className="inline-block bg-[#2563EB] text-white px-10 py-4 rounded-full font-medium hover:bg-white hover:text-[#111827] transition-all duration-300"
          >
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      {/* <footer className="relative z-10 bg-[#F9FAFB] border-t border-[#E5E7EB] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-[#2563EB]" />
              <span className="text-lg font-bold text-[#111827] tracking-tight">CareNest</span>
            </div>
            <p className="text-[#6B7280] text-sm">
              © {new Date().getFullYear()} CareNest - Inspired by Sabaragamuwa University of Sri Lanka.
            </p>
          </div>
        </div>
      </footer> */}
      
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
}) {
  return (
    <div className="group p-8 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl hover:border-[#3B82F6]/30 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-6 ${accentColor} group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-[#111827] mb-3 tracking-tight">{title}</h3>
      <p className="text-[#6B7280] font-light leading-relaxed">{description}</p>
    </div>
  );
}
