import React from 'react'
import {
  Building2, Users, HeartPulse, CalendarDays, Briefcase, ShoppingCart,
  Globe, Utensils, TrendingUp, ShieldAlert, Lightbulb, Database, BarChart3,
  ChefHat, PoundSterling, FileText, Sparkles, Megaphone, ShieldCheck, Truck,
  ClipboardList, Mail, Presentation, MapPin, Mic, MessageSquare, ListChecks,
  Store, Package, Coffee, Wrench, Heart, Star, Target, Zap, Leaf,
} from 'lucide-react'

// The backend (LLM + MongoDB) stores icon references as plain strings, e.g.
// "Building2". Components must resolve those strings back to lucide React
// components. Anything unknown falls back to a neutral dot icon.
const ICONS = {
  Building2, Users, HeartPulse, CalendarDays, Briefcase, ShoppingCart,
  Globe, Utensils, TrendingUp, ShieldAlert, Lightbulb, Database, BarChart3,
  ChefHat, PoundSterling, FileText, Sparkles, Megaphone, ShieldCheck, Truck,
  ClipboardList, Mail, Presentation, MapPin, Mic, MessageSquare, ListChecks,
  Store, Package, Coffee, Wrench, Heart, Star, Target, Zap, Leaf,
}

export function DynIcon({ name, fallback = Sparkles, ...props }) {
  // Accept either a string name or an already-resolved component (for the
  // few places that still pass lucide components directly).
  if (typeof name === 'function') {
    const Comp = name
    return <Comp {...props} />
  }
  const Comp = ICONS[name] || fallback
  return <Comp {...props} />
}

export function resolveIcon(name, fallback = Sparkles) {
  if (typeof name === 'function') return name
  return ICONS[name] || fallback
}
