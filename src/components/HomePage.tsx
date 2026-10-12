"use client";

import Link from "next/link";
import {
  Heart,
  Users,
  Pill,
  Activity,
  Calendar,
  FileText,
  Bell,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Star,
  Quote,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Multi-Patient Profiles",
    description:
      "Manage health records for every dependent in one place — parents, siblings, or anyone you care for.",
  },
  {
    icon: Pill,
    title: "Medication Tracking",
    description:
      "Track doses, adherence, and refill alerts so no prescription is missed or forgotten.",
  },
  {
    icon: Activity,
    title: "Vitals & Symptoms",
    description:
      "Log blood pressure, blood sugar, heart rate, and mood trends over time with clear charts.",
  },
  {
    icon: Calendar,
    title: "Doctor Visits",
    description:
      "Schedule appointments and prepare with pre-visit checklists tailored to each patient.",
  },
  {
    icon: FileText,
    title: "Doctor Summary Reports",
    description:
      "Generate printable 30-day summaries with adherence rates and vitals for every visit.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Get notified about missed medications, low refills, abnormal vitals, and upcoming appointments.",
  },
];

const highlights = [
  "One dashboard for all dependents",
  "Secure caregiver-scoped records",
  "Print-ready doctor reports",
  "Email alert notifications",
];

const reviews = [
  {
    name: "Sarah Vance",
    role: "Primary caregiver for her mother & brother",
    rating: 5,
    quote:
      "I used to juggle three different notebooks and phone reminders. CareCircle let me track my mom's diabetes meds and my brother's asthma inhaler in one place. The doctor summary report saved me hours before every visit.",
    avatarColor: "#6366f1",
  },
  {
    name: "Michael Torres",
    role: "Caring for his father with hypertension",
    rating: 5,
    quote:
      "The refill alerts alone are worth it. I got notified when my dad's blood pressure medication was running low — before he would have missed a dose. Simple, clear, and exactly what a family caregiver needs.",
    avatarColor: "#7c3aed",
  },
  {
    name: "Priya Sharma",
    role: "Managing care for both parents",
    rating: 5,
    quote:
      "Switching between patient profiles is seamless. I log vitals for my parents every morning and print a 30-day trend chart for their cardiologist. It feels like a tool built by someone who actually understands caregiving.",
    avatarColor: "#e11d48",
  },
  {
    name: "James Okonkwo",
    role: "Long-distance caregiver for his aunt",
    rating: 4,
    quote:
      "I live in another city but stay on top of my aunt's appointments and medication schedule through CareCircle. The missed-dose alerts give me peace of mind when I can't be there in person.",
    avatarColor: "#0891b2",
  },
  {
    name: "Emily Chen",
    role: "Caregiver for her grandmother",
    rating: 5,
    quote:
      "The appointment checklists are a game-changer. Before each visit I know exactly what questions to ask and what logs to bring. My grandmother's doctor even commented on how organized our records are now.",
    avatarColor: "#059669",
  },
  {
    name: "David Miller",
    role: "Coordinating care with siblings",
    rating: 5,
    quote:
      "My siblings and I share one CareCircle account for our dad. Everyone can see what's been taken, what's upcoming, and what alerts need attention. It stopped the confusion and duplicate phone calls between us.",
    avatarColor: "#d97706",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating
              ? "text-amber-400 fill-amber-400"
              : "text-slate-200 fill-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export function HomePage() {
  return (
    <div className="min-h-screen bg-violet-50 text-slate-900 overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-violet-400/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-rose-400/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-indigo-100/80 bg-white/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-700 via-violet-600 to-rose-500 bg-clip-text text-transparent">
              CareCircle
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="text-sm font-bold text-white px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/30 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Family Caregiver Platform
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            For the ones who care,{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500 bg-clip-text text-transparent">
              at home and from the heart.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            CareCircle is a unified dashboard for family caregivers managing multiple
            patients — medications, vitals, appointments, and doctor-ready reports in one
            place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base shadow-xl shadow-indigo-500/30 transition-all group"
            >
              Start Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white border-2 border-indigo-200 text-indigo-700 font-bold text-base hover:bg-indigo-50 hover:border-indigo-300 transition-all"
            >
              Try Demo Account
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 bg-white/60 border-y border-indigo-100/80 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Everything a caregiver needs
            </h2>
            <p className="mt-3 text-slate-600 max-w-xl mx-auto">
              From daily medication logs to printable doctor summaries — built for real
              family caregiving workflows.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl bg-white border border-indigo-100 shadow-sm hover:shadow-md hover:border-violet-200 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500 p-8 sm:p-12 text-center text-white shadow-2xl shadow-indigo-500/30">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Ready to simplify caregiving?
            </h2>
            <p className="text-indigo-100 max-w-lg mx-auto mb-8">
              Create your free account or launch the demo with two pre-loaded patient
              profiles — Margaret and Leo — to explore the full dashboard instantly.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Go to Login
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="relative z-10 bg-white/60 border-t border-indigo-100/80 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-200/80">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Customer Reviews
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Trusted by family caregivers
            </h2>
            <p className="mt-3 text-slate-600 max-w-xl mx-auto">
              Hear from people who use CareCircle every day to coordinate care for the
              ones they love.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="font-bold text-slate-900">4.9</span>
              <span>out of 5</span>
              <span className="text-slate-400">·</span>
              <span>500+ caregivers</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div
                key={review.name}
                className="relative p-6 rounded-2xl bg-white border border-indigo-100 shadow-sm hover:shadow-md hover:border-violet-200 transition-all flex flex-col"
              >
                <Quote className="absolute top-5 right-5 w-8 h-8 text-indigo-100" />
                <StarRating rating={review.rating} />
                <p className="mt-4 text-sm text-slate-600 leading-relaxed flex-1">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3 pt-4 border-t border-indigo-50">
                  <div
                    className="w-10 h-10 rounded-xl text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: review.avatarColor }}
                  >
                    {review.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm">{review.name}</div>
                    <div className="text-xs text-slate-500 truncate">{review.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-indigo-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span className="font-semibold text-slate-700">CareCircle</span>
            <span>— Caregiver Coordination Dashboard</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-indigo-600 transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="hover:text-indigo-600 transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
