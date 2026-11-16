import {
  UserPlus, GitBranch, ClipboardList, CalendarClock, Hourglass, Gauge, Radio, ListChecks, AtSign, Mail, CheckSquare,
  ArrowRightCircle, Flag, StickyNote, Sparkles, Zap,
} from 'lucide-react';

const ICONS = { UserPlus, GitBranch, ClipboardList, CalendarClock, Hourglass, Gauge, Radio, ListChecks, AtSign, Mail, CheckSquare, ArrowRightCircle, Flag, StickyNote, Sparkles };

export const blockIcon = (name) => ICONS[name] || Zap;
