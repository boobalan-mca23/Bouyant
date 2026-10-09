import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { PublicNavbar } from '../../../components/layout/PublicNavbar';
import { PublicFooter } from '../../../components/layout/PublicFooter';
import { EventCountdownTimer } from '../../../components/ui/EventCountdownTimer';
import { formatDisplayDate } from '../../../utils/date';
import {
  Calendar,
  MapPin,
  ArrowRight,
  Building,
  Users,
  Award,
  LayoutGrid,
  CheckCircle2,
  Search,
  MousePointerClick,
  FileCheck2,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchExhibitions() {
    try {
      setLoading(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data || []);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExhibitions();
  }, []);

  // Active / Flagship upcoming event strictly from database exhibitions
  const featuredEvent: Exhibition | null = React.useMemo(() => {
    if (!exhibitions || exhibitions.length === 0) return null;
    const activeUpcoming = exhibitions
      .filter((e) => e.status === 'PUBLISHED' && new Date(e.endDate) >= new Date())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return activeUpcoming[0] || exhibitions[0] || null;
  }, [exhibitions]);

  if (loading || !featuredEvent) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 text-[#121B3D] dark:text-slate-100 font-sans flex flex-col justify-between">
        <PublicNavbar />
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-4 border-[#1E3FA0] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Loading upcoming exhibitions...</p>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-[#121B3D] dark:text-slate-100 font-sans flex flex-col justify-between selection:bg-[#0E8074] selection:text-white">
      <PublicNavbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION — SOFT BLUE BACKDROP WITH DOT MATRIX */}
        {/* ========================================================================= */}
        <section className="bg-[#F4F8FD] dark:bg-slate-900/90 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-b border-[#E6EAF0] dark:border-slate-800">
          {/* Architectural Dot Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#1E3FA0 1.2px, transparent 1.2px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
            {/* Left Content (6 Spans) */}
            <div className="lg:col-span-6 space-y-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1B37A0] dark:text-blue-400 leading-[1.12] tracking-tight">
                {featuredEvent.title}
              </h1>

              <div className="flex flex-wrap gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-0.5">
                <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#E6EAF0] dark:border-slate-700 shadow-xs">
                  <Calendar className="w-4 h-4 text-[#0E8074] dark:text-teal-400" />
                  <span>
                     Start Date : {formatDisplayDate(featuredEvent.startDate)} – End Date : {formatDisplayDate(featuredEvent.endDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#E6EAF0] dark:border-slate-700 shadow-xs">
                  <MapPin className="w-4 h-4 text-[#0E8074] dark:text-teal-400" />
                  <span>{featuredEvent.venue}, {featuredEvent.city}</span>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
                {featuredEvent.description}
              </p>

              {/* Modern Light Glass Countdown Timer Container */}
              <div className="max-w-md bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-[#1E3FA0]/15 dark:border-slate-700 space-y-2.5">
                <EventCountdownTimer targetDate={featuredEvent.startDate} />
              </div>

              {/* Action Button */}
              <div className="pt-1 flex flex-wrap items-center gap-4">
                <Link to={`/exhibitions/${featuredEvent.slug}`}>
                  <button className="inline-flex items-center gap-2 bg-[#1E3FA0] hover:bg-[#152B75] text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5">
                    Book Your Stall <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>

              {/* Trust & Guarantee Highlights Bar */}
              <div className="pt-3 border-t border-slate-300/60 dark:border-slate-800 flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5 text-[#0E8074] dark:text-teal-400">
                  <CheckCircle2 className="w-4 h-4 text-[#0E8074] dark:text-teal-400" /> Official Buoyant Event
                </span>
                <span className="flex items-center gap-1.5 text-[#1E3FA0] dark:text-blue-400">
                  <CheckCircle2 className="w-4 h-4 text-[#1E3FA0] dark:text-blue-400" /> Real-time Interactive Floor Plan
                </span>
                <span className="flex items-center gap-1.5 text-[#0E8074] dark:text-teal-400">
                  <CheckCircle2 className="w-4 h-4 text-[#0E8074] dark:text-teal-400" /> Instant Online Reservation
                </span>
              </div>
            </div>

            {/* Right Single-Image Featured Exhibition Showcase (6 Spans) */}
            <div className="lg:col-span-6 relative">
              {/* Decorative Background Glow Plate */}
              <div className="absolute -inset-2 bg-gradient-to-r from-[#1E3FA0]/15 to-[#0E8074]/15 dark:from-[#1E3FA0]/30 dark:to-[#0E8074]/30 rounded-3xl blur-xl opacity-70 pointer-events-none" />

              {/* Featured Event Image Display Container */}
              <div className="w-full h-72 sm:h-[380px] lg:h-[430px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg relative border-3 border-white dark:border-slate-800 bg-white dark:bg-slate-900 group">
                <img
                  src={featuredEvent.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop'}
                  alt={featuredEvent.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Category Pill Tag Top Left */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="px-3.5 py-1.5 bg-[#0E8074] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-full shadow-xs backdrop-blur-md">
                    {featuredEvent.category || 'Upcoming Event'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. SECTION BELOW HERO — MORE ABOUT THIS PARTICULAR EVENT */}
        {/* ========================================================================= */}
        <section className="py-16 px-6 lg:px-12 bg-white dark:bg-slate-950 border-b border-[#E6EAF0] dark:border-slate-800">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0E8074] dark:text-teal-400">
                Event Spotlight
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B37A0] dark:text-blue-400 tracking-tight">
                About {featuredEvent.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Get an exclusive glimpse into the venue infrastructure, expected trade footfall, and key sector highlights for our upcoming flagship exhibition.
              </p>
            </div>

            {/* Event Key Statistics Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 bg-[#EEF4FC] dark:bg-slate-900 rounded-2xl border border-[#E6EAF0] dark:border-slate-800 space-y-1 text-center">
                <Users className="w-6 h-6 text-[#0E8074] dark:text-teal-400 mx-auto mb-2" />
                <span className="text-2xl font-black text-[#121B3D] dark:text-slate-100 block">15,000+</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">B2B Trade Buyers</span>
              </div>

              <div className="p-6 bg-[#EEF4FC] dark:bg-slate-900 rounded-2xl border border-[#E6EAF0] dark:border-slate-800 space-y-1 text-center">
                <Building className="w-6 h-6 text-[#1E3FA0] dark:text-blue-400 mx-auto mb-2" />
                <span className="text-2xl font-black text-[#121B3D] dark:text-slate-100 block">250+</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Exhibiting Brands</span>
              </div>

              <div className="p-6 bg-[#EEF4FC] dark:bg-slate-900 rounded-2xl border border-[#E6EAF0] dark:border-slate-800 space-y-1 text-center">
                <LayoutGrid className="w-6 h-6 text-[#0E8074] dark:text-teal-400 mx-auto mb-2" />
                <span className="text-2xl font-black text-[#121B3D] dark:text-slate-100 block">100,000</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sq.Ft Air-Conditioned</span>
              </div>

              <div className="p-6 bg-[#EEF4FC] dark:bg-slate-900 rounded-2xl border border-[#E6EAF0] dark:border-slate-800 space-y-1 text-center">
                <Award className="w-6 h-6 text-[#84CC16] mx-auto mb-2" />
                <span className="text-2xl font-black text-[#121B3D] dark:text-slate-100 block">Grade A+</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">International Complex</span>
              </div>
            </div>

            {/* Event Authentic Photography Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative h-64 rounded-2xl overflow-hidden shadow-md group border border-slate-200 dark:border-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop"
                  alt="Exhibition Shell Schemes"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/90 dark:from-slate-950/90 via-[#121B3D]/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase text-[#84CC16] block">Exhibition Hall</span>
                  <h3 className="text-sm font-bold">State-of-the-Art Shell Schemes</h3>
                </div>
              </div>

              <div className="relative h-64 rounded-2xl overflow-hidden shadow-md group border border-slate-200 dark:border-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop"
                  alt="Verified Buyer Footfall"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/90 dark:from-slate-950/90 via-[#121B3D]/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase text-[#84CC16] block">Trade Footfall</span>
                  <h3 className="text-sm font-bold">Verified Buyer & Dealer Delegation</h3>
                </div>
              </div>

              <div className="relative h-64 rounded-2xl overflow-hidden shadow-md group border border-slate-200 dark:border-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=800&auto=format&fit=crop"
                  alt="Live Product Demos"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121B3D]/90 dark:from-slate-950/90 via-[#121B3D]/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase text-[#84CC16] block">Product Launches</span>
                  <h3 className="text-sm font-bold">Live Demos & Technical Seminars</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2.5 INFOGRAPHIC SECTION — HOW ONLINE STALL BOOKING WORKS */}
        {/* ========================================================================= */}
        <section className="py-16 px-6 lg:px-12 bg-gradient-to-b from-white to-[#F4F8FD] dark:from-slate-950 dark:to-slate-900 border-b border-[#E6EAF0] dark:border-slate-800">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0E8074] dark:text-teal-400">
                Seamless Booking Experience
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B37A0] dark:text-blue-400 tracking-tight">
                How Online Stall Hold & Reservation Works
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Reserve your exhibition booth in 3 simple steps on Buoyant Media digital booking portal.
              </p>
            </div>

            {/* Step Infographic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all space-y-4 text-center relative group">
                <div className="w-16 h-16 bg-[#EEF4FC] dark:bg-slate-800 text-[#1E3FA0] dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Search className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#0E8074] dark:text-teal-400 uppercase tracking-wider block">Step 01</span>
                  <h3 className="text-lg font-bold text-[#121B3D] dark:text-slate-100">Select Trade Fair</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Browse upcoming exhibitions by sector, dates, and venue specs across major industrial hubs.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all space-y-4 text-center relative group">
                <div className="w-16 h-16 bg-[#E4F5F2] dark:bg-slate-800 text-[#0E8074] dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <MousePointerClick className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#0E8074] dark:text-teal-400 uppercase tracking-wider block">Step 02</span>
                  <h3 className="text-lg font-bold text-[#121B3D] dark:text-slate-100">Choose Stall on Live Map</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    View real-time stall availability, dimensions, premium corner slots, and shell scheme pricing.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white dark:bg-slate-900 border border-[#E6EAF0] dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all space-y-4 text-center relative group">
                <div className="w-16 h-16 bg-[#F3FCE8] dark:bg-slate-800 text-[#73b510] dark:text-lime-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <FileCheck2 className="w-8 h-8 text-[#0E8074] dark:text-teal-400" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#0E8074] dark:text-teal-400 uppercase tracking-wider block">Step 03</span>
                  <h3 className="text-lg font-bold text-[#121B3D] dark:text-slate-100">Instant Hold & Invoice</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Lock your booth instantly with a 15-minute online hold, submit company details, and receive GST invoice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


      </main>

      <PublicFooter />
    </div>
  );
};
