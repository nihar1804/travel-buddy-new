import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Calendar, 
  Wallet, 
  Bike, 
  Train, 
  Compass, 
  Heart, 
  Download, 
  Share2, 
  Menu, 
  X, 
  ChevronRight, 
  Sun, 
  Navigation,
  Utensils,
  Camera,
  Info,
  Send,
  LogOut,
  User,
  LayoutDashboard,
  Hotel,
  Moon
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { AlertTriangle } from 'lucide-react';
import { generateTripItinerary, generateBudgetInsights } from './services/geminiService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-slate-950 p-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-red-100 dark:border-red-900/30 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-4">Application Error</h2>
            <p className="text-stone-600 dark:text-slate-400 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-stone-900 dark:bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-stone-800 dark:hover:bg-emerald-700 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Constants ---
const GOOGLE_MAPS_KEY = 'АlzaSyCsМ-ЕАPхYUNnТLА1MovaqW4p2_LeQ2ok';

const MOCK_HOTELS = [
  {
    id: '1',
    name: 'The Grand Indian Heritage',
    price: 2500,
    rating: 4.5,
    location: 'Jaipur, Rajasthan',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    link: 'https://www.booking.com'
  },
  {
    id: '2',
    name: 'Ocean Breeze Resort',
    price: 1800,
    rating: 4.2,
    location: 'Goa',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    link: 'https://www.agoda.com'
  },
  {
    id: '3',
    name: 'Mountain View Inn',
    price: 1200,
    rating: 4.0,
    location: 'Manali, Himachal Pradesh',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    link: 'https://www.makemytrip.com'
  },
  {
    id: '4',
    name: 'City Center Budget Stay',
    price: 900,
    rating: 3.8,
    location: 'New Delhi',
    image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=800&q=80',
    link: 'https://www.booking.com'
  },
  {
    id: '5',
    name: 'Backpackers Paradise',
    price: 600,
    rating: 4.3,
    location: 'Rishikesh, Uttarakhand',
    image: 'https://images.unsplash.com/photo-1555854816-808226a3f14b?auto=format&fit=crop&w=800&q=80',
    link: 'https://www.agoda.com'
  }
];

// --- Components ---

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-slate-950 p-6 transition-colors duration-300">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl border border-stone-200 dark:border-slate-800 text-center"
    >
      <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
        <Compass size={32} />
      </div>
      <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-2">Welcome to TravelBuddy</h1>
      <p className="text-stone-600 dark:text-slate-400 mb-10">Your AI-powered companion for exploring the beauty of the world.</p>
      
      <button 
        onClick={onLogin}
        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 py-4 rounded-2xl font-bold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 transition-all shadow-sm"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
        Continue with Google
      </button>
      
      <p className="mt-8 text-xs text-stone-400">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
    </motion.div>
  </div>
);

const Navbar = ({ user, onLogout, currentView, setView, theme, toggleTheme }: { user: any, onLogout: () => void, currentView: string, setView: (v: string) => void, theme: string, toggleTheme: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: <Sun size={18} /> },
    { id: 'planner', label: 'Trip Planner', icon: <Compass size={18} /> },
    { id: 'budget', label: 'Budget Tracker', icon: <Wallet size={18} /> },
    { id: 'hotels', label: 'Hotel Search', icon: <Hotel size={18} /> },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-stone-200 dark:border-slate-800 px-6 py-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md">
            <Compass size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">TravelBuddy</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                currentView === item.id 
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                : 'text-stone-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-700 transition-all"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div className="relative ml-4">
            <button 
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1 pr-3 rounded-full border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 transition-all"
            >
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
              <Menu size={18} className="text-stone-500" />
            </button>
            
            <AnimatePresence>
              {showProfile && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-stone-100 dark:border-slate-800 p-2"
                >
                  <div className="p-3 border-b border-stone-100 dark:border-slate-800 mb-2">
                    <p className="font-bold text-stone-900 dark:text-white truncate">{user.displayName}</p>
                    <p className="text-xs text-stone-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-all"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-4 md:hidden">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="text-stone-900 dark:text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xl"
          >
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => { setView(item.id); setIsOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  currentView === item.id 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                  : 'text-stone-600 dark:text-slate-400'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button onClick={() => { onLogout(); setIsOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 font-medium text-left">
              <LogOut size={18} /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const TripPlanner = ({ onGenerate }: { onGenerate: (data: any) => void }) => {
  const [source, setSource] = useState('New Delhi');
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState<number>(2);
  const [budget, setBudget] = useState(5000);
  const [travelStyle, setTravelStyle] = useState('bike');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duration <= 0) {
      alert("Please enter a valid duration.");
      return;
    }
    setLoading(true);
    try {
      const itineraryData = await generateTripItinerary({ source, destination, duration, budget, travelStyle });
      const fullTripData = { ...itineraryData, source, destination, duration, budget, travelStyle };
      
      // Save to Firestore if user is logged in
      if (auth.currentUser) {
        try {
          const docRef = await addDoc(collection(db, 'trips'), {
            ...fullTripData,
            userId: auth.currentUser.uid,
            createdAt: serverTimestamp()
          });
          onGenerate({ id: docRef.id, ...fullTripData });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'trips');
        }
      } else {
        onGenerate(fullTripData);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="planner" className="py-24 px-6 bg-stone-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-stone-900 dark:text-white mb-4">AI Trip Planner</h2>
          <p className="text-stone-600 dark:text-slate-400">Plan your next getaway with AI precision.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-2">
              <Navigation size={16} className="text-emerald-600" /> Source
            </label>
            <input 
              type="text" 
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. New Delhi"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600" /> Destination
            </label>
            <input 
              type="text" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Manali"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-2">
              <Calendar size={16} className="text-emerald-600" /> Trip Duration (Days)
            </label>
            <input 
              type="number" 
              min="1"
              max="30"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              placeholder="Enter number of days"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-2">
              <Wallet size={16} className="text-emerald-600" /> Budget (₹)
            </label>
            <input 
              type="number" 
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-2">
              <Bike size={16} className="text-emerald-600" /> Travel Mode
            </label>
            <div className="grid grid-cols-3 gap-4">
              {['bike', 'train', 'car'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTravelStyle(mode)}
                  className={`py-3 rounded-xl border font-medium transition-all flex items-center justify-center gap-2 ${
                    travelStyle === mode 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' 
                    : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700 hover:border-emerald-600'
                  }`}
                >
                  {mode === 'bike' && <Bike size={18} />}
                  {mode === 'train' && <Train size={18} />}
                  {mode === 'car' && <Navigation size={18} />}
                  <span className="capitalize">{mode}</span>
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="md:col-span-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Compass size={24} />
                Generate My Trip
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
};

const ItineraryView = ({ data, onSave, onTrackBudget }: { data: any, onSave: () => void, onTrackBudget: () => void }) => {
  const itineraryRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!itineraryRef.current) return;
    const canvas = await html2canvas(itineraryRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`trip-to-${data.destination}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-3xl font-bold text-stone-900 dark:text-white">Your Custom Itinerary</h3>
        <div className="flex gap-3">
          <button 
            onClick={onTrackBudget} 
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md"
          >
            <Wallet size={18} /> Track Budget
          </button>
          <button onClick={onSave} className="p-3 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-stone-600 dark:text-slate-400 hover:text-emerald-600 transition-all shadow-sm">
            <Heart size={20} />
          </button>
          <button onClick={downloadPDF} className="p-3 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-stone-600 dark:text-slate-400 hover:text-emerald-600 transition-all shadow-sm">
            <Download size={20} />
          </button>
        </div>
      </div>

      <div ref={itineraryRef} className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-stone-200 dark:border-slate-800">
        <div className="relative h-64 bg-emerald-900">
          <img 
            src={`https://picsum.photos/seed/${data.destination}/1200/600`} 
            alt={data.destination} 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-emerald-950/80 to-transparent">
            <h4 className="text-4xl font-bold text-white mb-2">{data.source} to {data.destination}</h4>
            <div className="flex gap-6 text-emerald-50">
              <span className="flex items-center gap-2"><Calendar size={16} /> {data.duration}</span>
              <span className="flex items-center gap-2"><Wallet size={16} /> ₹{data.budget}</span>
              <span className="flex items-center gap-2 capitalize"><Bike size={16} /> {data.travelStyle}</span>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {data.dayWiseItinerary?.map((day: any, idx: number) => (
              <div key={idx} className="relative pl-8 border-l-2 border-emerald-100 dark:border-slate-800">
                <div className="absolute -left-[9px] top-0 w-4 h-4 bg-emerald-600 rounded-full border-4 border-white dark:border-slate-900 shadow-sm" />
                <h5 className="text-xl font-bold text-stone-900 dark:text-white mb-4">{day.day}</h5>
                <ul className="space-y-4">
                  {day.activities?.map((activity: string, aIdx: number) => (
                    <li key={aIdx} className="flex gap-4 text-stone-600 dark:text-slate-400">
                      <div className="w-2 h-2 bg-emerald-200 dark:bg-emerald-800 rounded-full mt-2 shrink-0" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
              <h5 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                <Info size={20} className="text-emerald-600" /> Travel Tips
              </h5>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.travelTips?.map((tip: string, idx: number) => (
                  <li key={idx} className="text-sm text-stone-600 flex gap-2">
                    <ChevronRight size={14} className="text-emerald-400 shrink-0 mt-1" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
              <h5 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                <Navigation size={20} /> Scenic Stops
              </h5>
              <div className="space-y-3">
                {data.scenicStops?.map((stop: string, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-emerald-100 text-sm text-emerald-800 font-medium shadow-sm">
                    {stop}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
              <h5 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                <Utensils size={20} /> Food Recommendations
              </h5>
              <div className="space-y-3">
                {data.foodRecommendations?.map((food: string, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-orange-100 text-sm text-orange-800 font-medium shadow-sm">
                    {food}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stone-900 p-6 rounded-2xl text-white">
              <h5 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Wallet size={20} /> Cost Breakdown
              </h5>
              <div className="space-y-3 text-stone-400 text-sm">
                <div className="flex justify-between">
                  <span>Transport</span>
                  <span className="text-white">₹{data.estimatedCostBreakdown?.transport || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accommodation</span>
                  <span className="text-white">₹{data.estimatedCostBreakdown?.hotel || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Food & Others</span>
                  <span className="text-white">₹{data.estimatedCostBreakdown?.food || 0}</span>
                </div>
                <div className="pt-3 border-t border-stone-700 flex justify-between font-bold text-lg text-white">
                  <span>Total Estimate</span>
                  <span className="text-emerald-400">₹{data.estimatedCostBreakdown?.total || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BookingRequest = ({ destination }: { destination: string }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, checkIn, checkOut, destination })
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        if (auth.currentUser) {
          try {
            await addDoc(collection(db, 'bookings'), {
              userId: auth.currentUser.uid,
              name,
              email,
              checkIn,
              checkOut,
              destination,
              status: 'pending',
              createdAt: serverTimestamp()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'bookings');
          }
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to send booking request.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-3xl text-center border border-emerald-100 dark:border-emerald-800/30">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send size={32} />
        </div>
        <h4 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400 mb-2">Request Sent!</h4>
        <p className="text-emerald-700 dark:text-emerald-300">Our team will contact you shortly at {email}.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800 transition-colors duration-300">
      <h4 className="text-2xl font-bold text-stone-900 dark:text-white mb-6">Request Booking Assistance</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">Check-in Date</label>
            <input 
              type="date" 
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">Check-out Date</label>
            <input 
              type="date" 
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-stone-900 dark:bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-stone-800 dark:hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Request"}
        </button>
      </form>
    </div>
  );
};

const BudgetTracker = ({ user, activeTrip, savedTrips }: { user: any, activeTrip: any, savedTrips: any[] }) => {
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [reason, setReason] = useState('');
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Sync with activeTrip if provided
  useEffect(() => {
    if (activeTrip && activeTrip.id) {
      setSelectedTripId(activeTrip.id);
    } else if (savedTrips.length > 0 && !selectedTripId) {
      setSelectedTripId(savedTrips[0].id);
    }
  }, [activeTrip, savedTrips]);

  // Fetch current trip details and its expenses from Firestore in real-time
  useEffect(() => {
    if (user && selectedTripId) {
      const trip = savedTrips.find(t => t.id === selectedTripId || t._id === selectedTripId);
      setCurrentTrip(trip);

      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        where('tripId', '==', selectedTripId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const expenseList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setExpenses(expenseList);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'expenses');
      });

      return () => unsubscribe();
    }
  }, [user, selectedTripId, savedTrips]);

  const addExpense = async () => {
    if (!selectedTripId || !amount || Number(amount) <= 0 || !name) return;
    
    // Simple category inference
    const nameLower = name.toLowerCase();
    let inferredCategory = 'misc';
    if (nameLower.includes('fuel') || nameLower.includes('gas') || nameLower.includes('petrol') || nameLower.includes('diesel') || nameLower.includes('car') || nameLower.includes('transport')) inferredCategory = 'fuel';
    else if (nameLower.includes('hotel') || nameLower.includes('stay') || nameLower.includes('room') || nameLower.includes('resort') || nameLower.includes('hostel')) inferredCategory = 'hotel';
    else if (nameLower.includes('food') || nameLower.includes('dinner') || nameLower.includes('lunch') || nameLower.includes('breakfast') || nameLower.includes('meal') || nameLower.includes('restaurant') || nameLower.includes('cafe')) inferredCategory = 'food';

    try {
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        tripId: selectedTripId,
        name: name,
        amount: Number(amount),
        reason: reason || 'No reason provided',
        category: inferredCategory,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      
      setAmount('');
      setName('');
      setReason('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'expenses');
    }
  };

  const getInsights = async () => {
    if (!currentTrip || expenses.length === 0) return;
    setLoadingInsights(true);
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    try {
      const res = await generateBudgetInsights({
        totalBudget: currentTrip.budget,
        totalSpent,
        expenses: expenses
      });
      setInsights(res);
    } catch (e) { console.error(e); }
    finally { setLoadingInsights(false); }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const budget = currentTrip?.budget || 0;
  const remaining = budget - totalSpent;
  const usagePercent = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;

  const pieData = [
    { name: 'Fuel', value: expenses.filter(e => e.category === 'fuel').reduce((s, e) => s + e.amount, 0) },
    { name: 'Hotel', value: expenses.filter(e => e.category === 'hotel').reduce((s, e) => s + e.amount, 0) },
    { name: 'Food', value: expenses.filter(e => e.category === 'food').reduce((s, e) => s + e.amount, 0) },
    { name: 'Misc', value: expenses.filter(e => e.category === 'misc').reduce((s, e) => s + e.amount, 0) },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'Budget', amount: budget },
    { name: 'Spent', amount: totalSpent },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="max-w-7xl mx-auto py-12 px-6 dark:bg-slate-950 transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-4xl font-bold text-stone-900 dark:text-white mb-2">Budget Tracker</h2>
          <p className="text-stone-500 dark:text-slate-400">Track your spending for {currentTrip ? `${currentTrip.source} to ${currentTrip.destination}` : 'your trip'}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800">
          <span className="text-sm font-bold text-stone-400 dark:text-slate-500 ml-2 uppercase tracking-wider">Select Trip:</span>
          <select 
            value={selectedTripId} 
            onChange={e => setSelectedTripId(e.target.value)}
            className="bg-stone-50 dark:bg-slate-800 border-none outline-none px-4 py-2 rounded-xl font-bold text-stone-700 dark:text-slate-200"
          >
            {savedTrips.map(trip => (
              <option key={trip.id || trip._id} value={trip.id || trip._id}>{trip.source} to {trip.destination}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats and Add Expense */}
        <div className="lg:col-span-1 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800 text-center">
              <p className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-stone-900 dark:text-white">₹{budget}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800 text-center">
              <p className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{totalSpent}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800 text-center">
              <p className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase mb-1">Remaining</p>
              <p className={`text-2xl font-bold ${remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>₹{remaining}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800 text-center">
              <p className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase mb-1">Usage</p>
              <p className="text-2xl font-bold text-stone-900 dark:text-white">{usagePercent}%</p>
            </div>
          </div>

          {/* Add Expense Form */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-stone-900 dark:text-white">
              <Wallet size={20} className="text-emerald-600 dark:text-emerald-400" /> Add New Expense
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase">Expense Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Hotel, Fuel" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase">Amount (₹)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 500" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase">Reason / Note (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 1 night stay" 
                  value={reason} 
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button 
                onClick={addExpense} 
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Send size={18} /> Add Expense
              </button>
            </div>
          </div>

          {/* AI Insights Button */}
          <button 
            onClick={getInsights}
            disabled={loadingInsights || expenses.length === 0}
            className="w-full flex items-center justify-center gap-3 bg-stone-900 dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-emerald-700 transition-all shadow-xl disabled:opacity-50"
          >
            {loadingInsights ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Compass size={20} />
                Get AI Financial Insights
              </>
            )}
          </button>
        </div>

        {/* Right Column: Charts and History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800">
              <h4 className="font-bold text-stone-900 dark:text-white mb-6">Spending by Category</h4>
              <div className="h-64 w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-stone-400 dark:text-slate-500 italic">No expenses yet</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800">
              <h4 className="font-bold text-stone-900 dark:text-white mb-6">Budget vs Spent</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <Tooltip cursor={{fill: '#f8f8f8'}} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#e2e8f0' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Insights Display */}
          <AnimatePresence>
            {insights && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 20 }}
                className="p-8 bg-emerald-50 dark:bg-slate-900 rounded-3xl border border-emerald-100 dark:border-slate-800 shadow-sm"
              >
                <div className="flex justify-between items-start mb-6">
                  <h4 className="text-xl font-bold text-emerald-900 dark:text-emerald-400 flex items-center gap-2">
                    <Compass size={24} /> AI Financial Analysis
                  </h4>
                  <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm ${
                    insights.status === 'Overspending' ? 'bg-red-100 text-red-600' : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {insights.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-emerald-800 dark:text-slate-300 font-medium leading-relaxed">"{insights.prediction}"</p>
                    {insights.warning && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-sm flex gap-3">
                        <span className="text-lg">⚠️</span>
                        {insights.warning}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Recommendations</p>
                    <ul className="space-y-2">
                      {insights.suggestions.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-emerald-700 dark:text-slate-400 flex gap-3">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expense History */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800">
            <h4 className="font-bold text-stone-900 dark:text-white mb-6">Recent Expenses</h4>
            <div className="space-y-4">
              {expenses.length > 0 ? (
                expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp, idx) => (
                  <div key={exp.id || idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-stone-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-stone-100 dark:hover:border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        exp.category === 'food' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                        exp.category === 'fuel' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        exp.category === 'hotel' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                        'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400'
                      }`}>
                        {exp.category === 'food' && <Utensils size={18} />}
                        {exp.category === 'fuel' && <Navigation size={18} />}
                        {exp.category === 'hotel' && <Hotel size={18} />}
                        {exp.category === 'misc' && <Wallet size={18} />}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 dark:text-white capitalize">{exp.name || exp.category}</p>
                        <p className="text-xs text-stone-400 dark:text-slate-500">{exp.reason || exp.description || 'No details'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-stone-900 dark:text-white">₹{exp.amount}</p>
                      <p className="text-[10px] text-stone-400 dark:text-slate-500 uppercase font-bold">{format(new Date(exp.date), 'MMM dd, HH:mm')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-stone-400 dark:text-slate-500">
                  <Wallet size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No expenses recorded for this trip yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HotelSearch = () => {
  const [dest, setDest] = useState('');
  const [budget, setBudget] = useState(5000);
  const [filteredHotels, setFilteredHotels] = useState(MOCK_HOTELS);

  const handleSearch = () => {
    const filtered = MOCK_HOTELS.filter(h => 
      h.price <= budget && 
      (dest === '' || h.location.toLowerCase().includes(dest.toLowerCase()))
    );
    setFilteredHotels(filtered);
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-6 dark:bg-slate-950 transition-colors duration-300">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-stone-900 dark:text-white mb-4">Find Budget Hotels</h2>
        <p className="text-stone-600 dark:text-slate-400">Best stays across India within your budget.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-800 mb-12 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase">Destination</label>
          <input 
            type="text" value={dest} onChange={e => setDest(e.target.value)} placeholder="Where are you going?"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase">Max Budget: ₹{budget}</label>
          <input 
            type="range" min="500" max="10000" step="500" value={budget} onChange={e => setBudget(Number(e.target.value))}
            className="w-full h-2 bg-stone-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>
        <button onClick={handleSearch} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg">
          Search Hotels
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredHotels.map(hotel => (
          <motion.div key={hotel.id} whileHover={{ y: -5 }} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-stone-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
            <div className="relative h-48">
              <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-md">
                ⭐ {hotel.rating}
              </div>
            </div>
            <div className="p-6">
              <h4 className="text-xl font-bold text-stone-900 dark:text-white mb-1">{hotel.name}</h4>
              <p className="text-stone-500 dark:text-slate-400 text-sm mb-4 flex items-center gap-1"><MapPin size={14} /> {hotel.location}</p>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-2xl font-bold text-stone-900 dark:text-white">₹{hotel.price}</span>
                  <span className="text-stone-400 dark:text-slate-500 text-xs ml-1">/ night</span>
                </div>
                <a 
                  href={hotel.link} target="_blank" rel="noreferrer"
                  className="bg-stone-900 dark:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-800 dark:hover:bg-emerald-700 transition-all"
                >
                  View Deal
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ExploreSection = () => {
  const categories = [
    { name: 'Beaches', icon: <Sun size={20} />, items: ['Goa', 'Varkala', 'Gokarna', 'Puri'] },
    { name: 'Hills', icon: <Navigation size={20} />, items: ['Manali', 'Munnar', 'Leh', 'Daringbadi'] },
    { name: 'Temples', icon: <Compass size={20} />, items: ['Varanasi', 'Amritsar', 'Madurai', 'Konark'] },
    { name: 'Hidden Gems', icon: <Camera size={20} />, items: ['Spiti Valley', 'Ziro', 'Majuli', 'Gandikota'] }
  ];

  return (
    <section id="explore" className="py-24 px-6 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-bold text-stone-900 dark:text-white mb-4">Explore India</h2>
            <p className="text-stone-600 dark:text-slate-400">Discover the soul of India through our curated categories.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((cat, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                {cat.icon}
              </div>
              <h4 className="text-xl font-bold text-stone-900 dark:text-white mb-4">{cat.name}</h4>
              <ul className="space-y-3">
                {cat.items.map((item, i) => (
                  <li key={i} className="text-stone-500 dark:text-slate-400 flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors">
                    <ChevronRight size={14} /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home');
  const [itinerary, setItinerary] = useState<any>(null);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Sync user profile to Firestore
        try {
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: u.uid,
              displayName: u.displayName,
              email: u.email,
              photoURL: u.photoURL,
              role: 'user', // Default role
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'users');
        }

        // Real-time trips listener
        const q = query(collection(db, 'trips'), where('userId', '==', u.uid));
        const tripsUnsubscribe = onSnapshot(q, (snapshot) => {
          const trips = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSavedTrips(trips);
          if (trips.length > 0 && !itinerary) {
            setItinerary(trips[0]);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'trips');
        });

        return () => {
          tripsUnsubscribe();
        };
      }
    });
    return () => unsubscribe();
  }, [itinerary]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setView('home');
  };

  const saveTrip = async () => {
    if (!user || !itinerary) return;
    try {
      await addDoc(collection(db, 'trips'), {
        ...itinerary,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      alert("Trip saved!");
    } catch (error) { 
      handleFirestoreError(error, OperationType.CREATE, 'trips');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-stone-50 dark:bg-slate-950 transition-colors duration-300"><div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <ErrorBoundary>
      <APIProvider apiKey="АlzaSyCsМ-ЕАPхYUNnТLА1MovaqW4p2_LeQ2ok" version="weekly">
        <div className="min-h-screen bg-stone-50 dark:bg-slate-950 font-sans text-stone-900 dark:text-white transition-colors duration-300">
        <Navbar user={user} onLogout={handleLogout} currentView={view} setView={setView} theme={theme} toggleTheme={toggleTheme} />

        <main className="pt-20">
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 z-0">
                    <img 
                      src="https://picsum.photos/seed/india/1920/1080" 
                      alt="India Landscape" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                  </div>

                  <div className="relative z-10 text-center px-6 max-w-4xl">
                    <motion.h1 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight"
                    >
                      Your AI Travel Buddy for <span className="text-emerald-400">India</span>
                    </motion.h1>
                    <motion.p 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-xl text-stone-200 mb-10 max-w-2xl mx-auto"
                    >
                      Discover hidden gems, plan scenic routes, and optimize your budget across India with our AI travel expert.
                    </motion.p>
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                      <button onClick={() => setView('planner')} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl">Start Planning</button>
                      <button onClick={() => setView('hotels')} className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all">Find Hotels</button>
                    </motion.div>
                  </div>
                </section>

                <ExploreSection />

                {savedTrips.length > 0 && (
                  <section className="py-24 px-6 bg-white dark:bg-slate-900 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto">
                      <h3 className="text-3xl font-bold text-stone-900 dark:text-white mb-12">Your Saved Trips</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {savedTrips.map((trip) => (
                          <div 
                            key={trip.id} 
                            className="bg-stone-50 dark:bg-slate-800 rounded-3xl overflow-hidden border border-stone-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer"
                            onClick={() => { setItinerary(trip); setView('planner'); }}
                          >
                            <img src={`https://picsum.photos/seed/${trip.destination}/600/300`} className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
                            <div className="p-6">
                              <h4 className="text-xl font-bold text-stone-900 dark:text-white mb-2">{trip.source} to {trip.destination}</h4>
                              <div className="flex justify-between items-center text-stone-500 dark:text-slate-400 text-sm">
                                <span>{trip.duration}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{trip.budget}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </motion.div>
            )}

            {view === 'planner' && (
              <motion.div key="planner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TripPlanner onGenerate={(data) => {
                  setItinerary(data);
                }} />
                {itinerary && (
                  <div className="bg-white dark:bg-slate-950 pb-24 transition-colors duration-300">
                    <ItineraryView 
                      data={itinerary} 
                      onSave={saveTrip} 
                      onTrackBudget={() => setView('budget')}
                    />
                    <div className="max-w-5xl mx-auto px-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="h-[500px] rounded-3xl overflow-hidden shadow-xl border border-stone-200 dark:border-slate-800">
                          <Map
                            defaultCenter={{ lat: 20.5937, lng: 78.9629 }}
                            defaultZoom={5}
                            mapId="DEMO_MAP_ID"
                            {...({ internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] } as any)}
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                        <BookingRequest destination={itinerary.destination} />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'budget' && (
              <motion.div key="budget" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BudgetTracker user={user} activeTrip={itinerary} savedTrips={savedTrips} />
              </motion.div>
            )}

            {view === 'hotels' && (
              <motion.div key="hotels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HotelSearch />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="bg-stone-900 dark:bg-slate-950 text-white py-12 px-6 border-t border-stone-800 dark:border-slate-800 transition-colors duration-300">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Compass size={24} className="text-emerald-400" />
                <span className="text-xl font-bold tracking-tight">TravelBuddy</span>
              </div>
              <p className="text-stone-400 dark:text-slate-500">Your local AI expert for exploring the scenic beauty of the world.</p>
            </div>
            <div>
              <h5 className="font-bold mb-6">Quick Links</h5>
              <ul className="space-y-4 text-stone-400 dark:text-slate-500">
                <li><button onClick={() => setView('home')} className="hover:text-emerald-400 transition-colors">Home</button></li>
                <li><button onClick={() => setView('planner')} className="hover:text-emerald-400 transition-colors">Trip Planner</button></li>
                <li><button onClick={() => setView('budget')} className="hover:text-emerald-400 transition-colors">Budget Tracker</button></li>
                <li><button onClick={() => setView('hotels')} className="hover:text-emerald-400 transition-colors">Hotel Search</button></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6">Contact Us</h5>
              <p className="text-stone-400 dark:text-slate-500 mb-4">Email: support@travelbuddy.ai</p>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all cursor-pointer">
                  <Share2 size={18} />
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all cursor-pointer">
                  <Navigation size={18} />
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-12 pt-12 border-t border-stone-800 dark:border-slate-800 text-center text-stone-500 text-sm">
            © {new Date().getFullYear()} TravelBuddy AI. All rights reserved.
          </div>
        </footer>
      </div>
    </APIProvider>
    </ErrorBoundary>
  );
}
