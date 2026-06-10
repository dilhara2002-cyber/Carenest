"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  Users,
  Calendar,
  Syringe,
  Brain,
  Shield,
  ArrowRight,
  Sparkles,
  Activity,
} from "lucide-react";
import logo from "./logo.png";

// Helper component for fade-up/pop-up animation on scroll
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { 
        threshold: 0.05, 
        rootMargin: "0px 0px -40px 0px" 
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-[transform,opacity] ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ 
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans antialiased overflow-x-hidden selection:bg-[#2563EB]/10 selection:text-[#2563EB]">
      {/* Decorative Grid and Ambient Lights */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      
      {/* Top ambient lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[#FBCFE8] to-[#E0E7FF] blur-[150px] opacity-40 mix-blend-multiply pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[55%] rounded-full bg-gradient-to-br from-[#E0E7FF] to-[#D1FAE5] blur-[130px] opacity-40 mix-blend-multiply pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 bg-transparent pt-4">
        <nav className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-1.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#F472B6] opacity-0 group-hover:opacity-100 transition duration-500 blur-sm" />
              <Image 
                src={logo} 
                alt="CareNest Logo" 
                width={40} 
                height={40} 
                priority 
                style={{ width: "auto", height: "auto" }}
                className="relative" 
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#111827] bg-clip-text">
              CareNest
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="group text-sm font-medium text-[#6B7280] hover:text-[#111827] transition-colors duration-300 relative py-1"
            >
              <span>Log in</span>
              <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#2563EB] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ease-out" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-[#2563EB] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#1E40AF] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/15 active:translate-y-0 active:shadow-md transition-all duration-300 ease-out"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-20 sm:pt-28 lg:pt-36">
        <div className="text-center max-w-4xl mx-auto mb-16 sm:mb-20">
          <FadeIn delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1FAE5] text-[#10B981] text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm border border-[#10B981]/15">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
              Intelligent Maternal & Child Care
            </div>
          </FadeIn>
          
          <FadeIn delay={100}>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#111827] mb-6 leading-[1.15]">
              Elevating <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#F472B6]">Maternal Care</span><br className="hidden sm:block"/> for the Modern Era
            </h1>
          </FadeIn>
          
          <FadeIn delay={200}>
            <p className="text-base sm:text-lg text-[#6B7280] max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
              An intelligent, minimalist space for midwives and mothers to seamlessly track pregnancies, coordinate visits, and embrace AI-assisted wellness.
            </p>
          </FadeIn>
          
          <FadeIn delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white px-7 py-3 rounded-full font-medium hover:bg-[#1E40AF] transition-all duration-300 shadow-md shadow-blue-500/10 hover:scale-[1.02]"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-[#E5E7EB] text-[#111827] px-7 py-3 rounded-full font-medium hover:border-[#2563EB] hover:text-[#2563EB] transition-all duration-300 shadow-sm hover:scale-[1.02]"
              >
                Explore Features
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* Abstract Dashboard Mockup Container */}
        <FadeIn delay={450}>
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#F472B6] opacity-15 blur-lg" />
            <div className="relative rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-2xl">
              {/* Window bar */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3 bg-[#F9FAFB] rounded-t-xl">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#EF4444]/30" />
                  <span className="h-3 w-3 rounded-full bg-[#F59E0B]/30" />
                  <span className="h-3 w-3 rounded-full bg-[#10B981]/30" />
                </div>
                <div className="text-xs text-[#6B7280] font-medium tracking-wide bg-white border border-[#E5E7EB] px-6 py-1 rounded-full shadow-inner">
                  carenest.app/dashboard
                </div>
                <div className="w-14" />
              </div>

              {/* Dashboard Workspace Mockup */}
              <div className="grid grid-cols-1 md:grid-cols-4 min-h-[360px] rounded-b-xl overflow-hidden bg-white text-xs">
                {/* Mock Sidebar */}
                <div className="hidden md:flex flex-col border-r border-[#E5E7EB] bg-[#F9FAFB] p-4 gap-4">
                  <div className="flex items-center gap-2 text-[#2563EB] font-bold text-sm">
                    <Heart className="h-4 w-4 text-[#2563EB]" />
                    <span>CareNest</span>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <span className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#2563EB]/10 text-[#2563EB] font-semibold"><Activity className="h-3.5 w-3.5" /> Overview</span>
                    <span className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[#6B7280] hover:bg-gray-100"><Users className="h-3.5 w-3.5" /> Pregnancies</span>
                    <span className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[#6B7280] hover:bg-gray-100"><Calendar className="h-3.5 w-3.5" /> Appointments</span>
                    <span className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[#6B7280] hover:bg-gray-100"><Syringe className="h-3.5 w-3.5" /> Vaccinations</span>
                    <span className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[#6B7280] hover:bg-gray-100"><Brain className="h-3.5 w-3.5" /> AI Care Guidance</span>
                  </div>
                </div>

                {/* Mock Main Content */}
                <div className="md:col-span-3 p-5 sm:p-6 bg-white flex flex-col gap-5">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-4">
                    <div>
                      <h3 className="text-base font-bold text-[#111827]">Welcome back, Sarah 👋</h3>
                      <p className="text-[#6B7280]">Your pregnancy progress looks healthy and on track.</p>
                    </div>
                    <div className="flex items-center gap-2 text-2xs bg-[#D1FAE5] text-[#10B981] px-2.5 py-1 rounded-full font-bold self-start sm:self-auto">
                      Active Care Plan
                    </div>
                  </div>

                  {/* Grid Widgets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pregnancy Progress Card */}
                    <div className="border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-3 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-br from-white to-[#F9FAFB]">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-500">Pregnancy Journey</span>
                        <span className="text-[#F472B6] font-bold text-xs">Week 24</span>
                      </div>
                      <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#F472B6] rounded-full" style={{ width: "65%" }} />
                      </div>
                      <p className="text-2xs text-[#6B7280] leading-snug">
                        🍈 Your baby is the size of a <span className="font-semibold text-[#111827]">cantaloupe</span>. Lungs are starting to develop.
                      </p>
                    </div>

                    {/* Vitals Summary Card */}
                    <div className="border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-2 bg-[#F9FAFB]/50">
                      <span className="font-semibold text-gray-500">Recent Vitals</span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-white border border-[#E5E7EB] rounded-lg p-2 text-center">
                          <span className="text-3xs text-[#6B7280] block">Blood Pressure</span>
                          <span className="text-xs font-bold text-[#111827]">118/76 mmHg</span>
                        </div>
                        <div className="bg-white border border-[#E5E7EB] rounded-lg p-2 text-center">
                          <span className="text-3xs text-[#6B7280] block">Fetal Heart Rate</span>
                          <span className="text-xs font-bold text-[#10B981]">142 bpm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Guidance Highlight Row */}
                  <div className="border border-[#3B82F6]/25 bg-[#3B82F6]/5 rounded-xl p-4 flex items-start gap-3 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-[#3B82F6]/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="p-1.5 rounded-lg bg-white border border-[#3B82F6]/25 shadow-2xs">
                      <Sparkles className="h-4 w-4 text-[#2563EB]" />
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-[#2563EB] flex items-center gap-1">
                        AI Daily Wellness Tip
                      </span>
                      <p className="text-2xs text-[#6B7280] mt-1 leading-relaxed">
                        Staying well-hydrated is crucial today to support amniotic fluid volume. Aim for 8-10 glasses of water. Include foods rich in iron, such as fresh spinach or lentils.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 bg-white border-t border-[#E5E7EB]/70 py-24 sm:py-32">
        {/* Subtle grid lines in section */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px)] bg-[size:6rem] opacity-20 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <FadeIn delay={0}>
              <span className="text-[#2563EB] text-xs font-bold uppercase tracking-wider bg-[#2563EB]/10 px-3.5 py-1.5 rounded-full">
                Comprehensive Platform
              </span>
            </FadeIn>
            <FadeIn delay={100}>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#111827] mt-4 mb-4 tracking-tight">
                Intelligently Designed for Modern Care
              </h2>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="text-[#6B7280] text-base font-light max-w-lg mx-auto">
                Everything you need to provide exceptional care, thoughtfully balanced in one comprehensive, minimalist dashboard.
              </p>
            </FadeIn>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FadeIn delay={0}>
              <FeatureCard
                icon={<Users className="h-5 w-5 text-[#2563EB]" />}
                title="Holistic Management"
                description="Unified health records for mothers and children, cleanly organized and instantly accessible."
                accentColor="bg-blue-50"
                borderColor="hover:border-[#2563EB]/35"
              />
            </FadeIn>
            <FadeIn delay={100}>
              <FeatureCard
                icon={<Calendar className="h-5 w-5 text-[#F472B6]" />}
                title="Smart Scheduling"
                description="Frictionless appointment tracking and automated reminders that respect your time."
                accentColor="bg-pink-50"
                borderColor="hover:border-[#F472B6]/35"
              />
            </FadeIn>
            <FadeIn delay={200}>
              <FeatureCard
                icon={<Syringe className="h-5 w-5 text-[#10B981]" />}
                title="Vaccine Tracking"
                description="Clear, proactive schedules for immunizations, ensuring peace of mind at every step."
                accentColor="bg-emerald-50"
                borderColor="hover:border-[#10B981]/35"
              />
            </FadeIn>
            <FadeIn delay={100}>
              <FeatureCard
                icon={<Brain className="h-5 w-5 text-[#3B82F6]" />}
                title="AI-Assisted Guidance"
                description="Context-aware insights and gentle, personalized wellness suggestions powered by intelligence."
                accentColor="bg-blue-50"
                borderColor="hover:border-[#3B82F6]/35"
                isSpecial
              />
            </FadeIn>
            <FadeIn delay={200}>
              <FeatureCard
                icon={<Heart className="h-5 w-5 text-[#EF4444]" />}
                title="Milestone Monitoring"
                description="A beautiful week-by-week visual journey of pregnancy progress and key health indicators."
                accentColor="bg-red-50"
                borderColor="hover:border-[#EF4444]/35"
              />
            </FadeIn>
            <FadeIn delay={300}>
              <FeatureCard
                icon={<Shield className="h-5 w-5 text-[#F59E0B]" />}
                title="Secure Collaboration"
                description="Encrypted, private messaging bridging the gap between care providers and families."
                accentColor="bg-amber-50"
                borderColor="hover:border-[#F59E0B]/35"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 bg-[#111827] overflow-hidden text-center">
        {/* Subtle grid and glows */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:3rem] opacity-30 pointer-events-none" />
        <div className="absolute top-0 right-[-10%] w-[50%] h-[120%] bg-gradient-to-l from-[#2563EB]/15 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-[-10%] w-[50%] h-[120%] bg-gradient-to-r from-[#F472B6]/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <FadeIn delay={0}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" /> Simple, Secure setup
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
              Ready to shape the future of care?
            </h2>
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-[#6B7280] text-base sm:text-lg mb-10 max-w-xl mx-auto font-light leading-relaxed">
              Experience the harmony of intelligent tools and compassionate design with CareNest. Join our growing network today.
            </p>
          </FadeIn>
          <FadeIn delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-white text-[#111827] px-8 py-3.5 rounded-full font-medium hover:bg-[#F9FAFB] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg"
              >
                Create Your Free Account
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-white border border-white/10 bg-white/5 backdrop-blur-xs px-8 py-3.5 rounded-full font-medium hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                Sign In to Your Workspace
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-[#F9FAFB] border-t border-[#E5E7EB] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <Heart className="h-5 w-5 text-[#2563EB]" />
                <span className="text-lg font-bold text-[#111827] tracking-tight">CareNest</span>
              </div>
              <p className="text-[#6B7280] text-sm leading-relaxed max-w-sm">
                Next-generation care platform bridging the gap between care providers and families with intelligent tools and modern layouts.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <span className="text-[#111827] font-semibold text-sm">Platform</span>
              <Link href="#features" className="text-sm text-[#6B7280] hover:text-[#2563EB] transition-colors">Features</Link>
              <Link href="/register" className="text-sm text-[#6B7280] hover:text-[#2563EB] transition-colors">Sign Up</Link>
              <Link href="/login" className="text-sm text-[#6B7280] hover:text-[#2563EB] transition-colors">Login</Link>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[#111827] font-semibold text-sm">Legal & Community</span>
              <span className="text-sm text-[#6B7280] cursor-default">Privacy Policy</span>
              <span className="text-sm text-[#6B7280] cursor-default">Terms of Service</span>
              <span className="text-sm text-[#6B7280] cursor-default">Support</span>
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#6B7280]">
            <p>© {new Date().getFullYear()} CareNest. All rights reserved.</p>
            <p>Inspired by Sabaragamuwa University of Sri Lanka.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accentColor,
  borderColor,
  isSpecial,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  borderColor: string;
  isSpecial?: boolean;
}) {
  return (
    <div
      className={`group relative p-8 bg-white border border-[#E5E7EB]/85 rounded-2xl ${borderColor} transition-all duration-500 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1.5 flex flex-col gap-4 overflow-hidden`}
    >
      {isSpecial && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#3B82F6]/5 to-transparent rounded-bl-full pointer-events-none" />
      )}
      
      {/* Icon frame */}
      <div
        className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${accentColor} border border-white shadow-2xs group-hover:scale-110 transition-transform duration-500 self-start`}
      >
        {icon}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold text-[#111827] tracking-tight flex items-center gap-1.5">
          {title}
          {isSpecial && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-3xs font-semibold text-[#2563EB] bg-[#2563EB]/10 rounded-full">
              <Sparkles className="w-2 h-2" /> AI
            </span>
          )}
        </h3>
        <p className="text-[#6B7280] text-sm leading-relaxed font-light">
          {description}
        </p>
      </div>

      {/* Modern subtle arrow link on hover */}
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-2xs font-semibold text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span>Learn more</span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  );
}
