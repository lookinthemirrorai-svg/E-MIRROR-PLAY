import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Mic, MicOff, Send, Play, Pause, ChevronRight, ChevronLeft,
  Home, Target, Users, ShoppingBag, User, Trophy, Flame, Star,
  MessageCircle, Heart, Share2, Gift, Volume2, VolumeX, Settings,
  Award, Zap, Book, Calendar, TrendingUp, Clock, Check, X,
  Plus, Search, Filter, BarChart2, Sparkles, RefreshCw, Copy,
  UserPlus, Globe, Snowflake, Sun, Leaf, Cloud, PenTool, Radio
} from 'lucide-react';

// Use REACT_APP_BACKEND_URL or fall back to /api for same-origin requests
const API_BASE = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// ============ ZUSTAND STORE ============
const useStore = create((set, get) => ({
  user: null,
  currentTab: 'practice',
  scenarios: [],
  activeSession: null,
  messages: [],
  toneAnalysis: null,
  emotionalState: { intensity: 0.5, emotion: 'calm' },
  isListening: false,
  isSpeaking: false,
  soundEnabled: true,
  dailyPrompt: null,
  challenges: [],
  posts: [],
  leaderboard: [],
  friends: [],
  achievements: { unlocked: [], locked: [] },
  journalEntries: [],
  marketplaceItems: [],
  userStats: null,
  
  setUser: (user) => set({ user }),
  setCurrentTab: (tab) => set({ currentTab: tab }),
  setScenarios: (scenarios) => set({ scenarios }),
  setActiveSession: (session) => set({ activeSession: session }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setToneAnalysis: (analysis) => set({ toneAnalysis: analysis }),
  setEmotionalState: (state) => set({ emotionalState: state }),
  setIsListening: (val) => set({ isListening: val }),
  setIsSpeaking: (val) => set({ isSpeaking: val }),
  setSoundEnabled: (val) => set({ soundEnabled: val }),
  setDailyPrompt: (prompt) => set({ dailyPrompt: prompt }),
  setChallenges: (challenges) => set({ challenges }),
  setPosts: (posts) => set({ posts }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setFriends: (friends) => set({ friends }),
  setAchievements: (achievements) => set({ achievements }),
  setJournalEntries: (entries) => set({ journalEntries: entries }),
  setMarketplaceItems: (items) => set({ marketplaceItems: items }),
  setUserStats: (stats) => set({ userStats: stats }),
  
  updateUserXP: (xp) => set((state) => {
    if (!state.user) return state;
    const newXP = state.user.xp + xp;
    const newLevel = Math.floor(newXP / 100) + 1;
    return { user: { ...state.user, xp: newXP, level: newLevel } };
  }),
}));

// ============ API FUNCTIONS ============
const api = {
  async createUser(username, email) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email })
    });
    return res.json();
  },
  
  async getUser(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}`);
    return res.json();
  },
  
  async getUserStats(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}/stats`);
    return res.json();
  },
  
  async claimDailyReward(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}/claim-daily`, { method: 'POST' });
    return res.json();
  },
  
  async getScenarios(category = null) {
    const url = category ? `${API_BASE}/scenarios?category=${category}` : `${API_BASE}/scenarios`;
    const res = await fetch(url);
    return res.json();
  },
  
  async createSession(userId, scenarioId) {
    const res = await fetch(`${API_BASE}/sessions?user_id=${userId}&scenario_id=${scenarioId}`, {
      method: 'POST'
    });
    return res.json();
  },
  
  async sendMessage(sessionId, message, userId) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message, user_id: userId })
    });
    return res.json();
  },
  
  async completeSession(sessionId, duration) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/complete?duration=${duration}`, {
      method: 'POST'
    });
    return res.json();
  },
  
  async getDailyPrompt() {
    const res = await fetch(`${API_BASE}/daily-prompt`);
    return res.json();
  },
  
  async getPosts() {
    const res = await fetch(`${API_BASE}/posts`);
    return res.json();
  },
  
  async createPost(userId, content) {
    const res = await fetch(`${API_BASE}/posts?user_id=${userId}&content=${encodeURIComponent(content)}`, {
      method: 'POST'
    });
    return res.json();
  },
  
  async likePost(postId, userId) {
    const res = await fetch(`${API_BASE}/posts/${postId}/like?user_id=${userId}`, { method: 'POST' });
    return res.json();
  },
  
  async getLeaderboard() {
    const res = await fetch(`${API_BASE}/leaderboard`);
    return res.json();
  },
  
  async getChallenges() {
    const res = await fetch(`${API_BASE}/challenges/active`);
    return res.json();
  },
  
  async getAchievements(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}/achievements`);
    return res.json();
  },
  
  async getJournal(userId) {
    const res = await fetch(`${API_BASE}/journal/${userId}`);
    return res.json();
  },
  
  async createJournalEntry(userId, content, type, mood) {
    const res = await fetch(`${API_BASE}/journal?user_id=${userId}&content=${encodeURIComponent(content)}&entry_type=${type}&mood=${mood || ''}`, {
      method: 'POST'
    });
    return res.json();
  },
  
  async getMarketplace() {
    const res = await fetch(`${API_BASE}/marketplace`);
    return res.json();
  },
  
  async purchaseItem(userId, itemId) {
    const res = await fetch(`${API_BASE}/marketplace/purchase?user_id=${userId}&item_id=${itemId}`, {
      method: 'POST'
    });
    return res.json();
  },
  
  async getFriends(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}/friends`);
    return res.json();
  },
  
  async getUserSessions(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}/sessions`);
    return res.json();
  },
  
  // Community Scenarios
  async getCommunityScenarios(category = null, sortBy = 'recent') {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('sort_by', sortBy);
    const res = await fetch(`${API_BASE}/community-scenarios?${params}`);
    return res.json();
  },
  
  async createCommunityScenario(data) {
    const params = new URLSearchParams(data);
    const res = await fetch(`${API_BASE}/community-scenarios?${params}`, { method: 'POST' });
    return res.json();
  },
  
  async rateCommunityScenario(scenarioId, rating, userId) {
    const res = await fetch(`${API_BASE}/community-scenarios/${scenarioId}/rate?rating=${rating}&user_id=${userId}`, { method: 'POST' });
    return res.json();
  },
  
  async likeCommunityScenario(scenarioId, userId) {
    const res = await fetch(`${API_BASE}/community-scenarios/${scenarioId}/like?user_id=${userId}`, { method: 'POST' });
    return res.json();
  },
  
  // Weekly Challenges
  async getWeeklyChallenges() {
    const res = await fetch(`${API_BASE}/weekly-challenges`);
    return res.json();
  },
  
  async joinWeeklyChallenge(challengeId, userId) {
    const res = await fetch(`${API_BASE}/weekly-challenges/${challengeId}/join?user_id=${userId}`, { method: 'POST' });
    return res.json();
  },
  
  async getWeeklyChallengeLeaderboard(challengeId) {
    const res = await fetch(`${API_BASE}/weekly-challenges/${challengeId}/leaderboard`);
    return res.json();
  },
  
  // Voice Journaling
  async createVoiceJournalEntry(userId, transcript, duration, mood, entryType) {
    const params = new URLSearchParams({
      user_id: userId,
      transcript,
      duration: duration.toString(),
      entry_type: entryType
    });
    if (mood) params.append('mood', mood);
    const res = await fetch(`${API_BASE}/voice-journal?${params}`, { method: 'POST' });
    return res.json();
  },
  
  async getVoiceJournalEntries(userId, limit = 30, entryType = null) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (entryType) params.append('entry_type', entryType);
    const res = await fetch(`${API_BASE}/voice-journal/${userId}?${params}`);
    return res.json();
  },
  
  async getVoiceJournalStats(userId) {
    const res = await fetch(`${API_BASE}/voice-journal/${userId}/stats`);
    return res.json();
  },
  
  // Partner Practice
  async createPartnerSession(creatorId, scenarioId) {
    const res = await fetch(`${API_BASE}/partner-practice/create?creator_id=${creatorId}&scenario_id=${scenarioId}`, { method: 'POST' });
    return res.json();
  },
  
  async joinPartnerSession(inviteCode, partnerId) {
    const res = await fetch(`${API_BASE}/partner-practice/join?invite_code=${inviteCode}&partner_id=${partnerId}`, { method: 'POST' });
    return res.json();
  },
  
  async getPartnerSession(sessionId) {
    const res = await fetch(`${API_BASE}/partner-practice/${sessionId}`);
    return res.json();
  },
  
  async sendPartnerMessage(sessionId, userId, content) {
    const res = await fetch(`${API_BASE}/partner-practice/${sessionId}/message?user_id=${userId}&content=${encodeURIComponent(content)}`, { method: 'POST' });
    return res.json();
  },
  
  async completePartnerSession(sessionId) {
    const res = await fetch(`${API_BASE}/partner-practice/${sessionId}/complete`, { method: 'POST' });
    return res.json();
  },
  
  async getUserPartnerSessions(userId) {
    const res = await fetch(`${API_BASE}/partner-practice/user/${userId}`);
    return res.json();
  },
  
  // Seasonal Events
  async getSeasonalEvents() {
    const res = await fetch(`${API_BASE}/seasonal-events`);
    return res.json();
  },
  
  async participateInEvent(eventId, userId) {
    const res = await fetch(`${API_BASE}/seasonal-events/${eventId}/participate?user_id=${userId}`, { method: 'POST' });
    return res.json();
  },
  
  async getEventProgress(eventId, userId) {
    const res = await fetch(`${API_BASE}/seasonal-events/${eventId}/progress/${userId}`);
    return res.json();
  },
  
  async getEventLeaderboard(eventId) {
    const res = await fetch(`${API_BASE}/seasonal-events/${eventId}/leaderboard`);
    return res.json();
  }
};

// ============ 3D LIGHT CORE COMPONENT ============
function LightCore({ emotionalState, isListening, isSpeaking }) {
  const coreRef = useRef();
  const innerRef = useRef();
  const ringsRef = useRef([]);
  const particlesRef = useRef();
  
  const emotionColors = {
    calm: new THREE.Color(0x8b5cf6),
    confident: new THREE.Color(0x06b6d4),
    anxious: new THREE.Color(0xfbbf24),
    empathetic: new THREE.Color(0xec4899),
    frustrated: new THREE.Color(0xef4444),
    happy: new THREE.Color(0x22c55e),
  };
  
  const targetColor = useMemo(() => {
    return emotionColors[emotionalState.emotion] || emotionColors.calm;
  }, [emotionalState.emotion]);
  
  useFrame((state, delta) => {
    if (coreRef.current) {
      // Pulse based on intensity
      const pulseSpeed = 1 + emotionalState.intensity * 2;
      const pulseScale = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.1 * emotionalState.intensity;
      coreRef.current.scale.setScalar(pulseScale);
      
      // Rotate slowly
      coreRef.current.rotation.y += delta * 0.2;
      coreRef.current.rotation.x += delta * 0.1;
      
      // Listening animation
      if (isListening) {
        coreRef.current.scale.y = pulseScale * (1 + Math.sin(state.clock.elapsedTime * 8) * 0.15);
      }
      
      // Speaking animation
      if (isSpeaking) {
        coreRef.current.scale.x = pulseScale * (1 + Math.sin(state.clock.elapsedTime * 6) * 0.1);
      }
    }
    
    // Inner core glow
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.5;
      const glowIntensity = 0.5 + emotionalState.intensity * 0.5;
      innerRef.current.material.emissiveIntensity = glowIntensity + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
    
    // Animate rings
    ringsRef.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.z += delta * (0.3 + i * 0.1) * (i % 2 === 0 ? 1 : -1);
        ring.rotation.x = Math.sin(state.clock.elapsedTime + i) * 0.3;
      }
    });
    
    // Particle animation
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.1;
    }
  });
  
  const particles = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 1.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);
  
  return (
    <group>
      {/* Ambient light */}
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={2} color={targetColor} distance={10} />
      
      {/* Main Core */}
      <group ref={coreRef}>
        <Sphere args={[1, 64, 64]}>
          <MeshDistortMaterial
            color={targetColor}
            emissive={targetColor}
            emissiveIntensity={0.8}
            roughness={0.1}
            metalness={0.8}
            distort={0.3 + emotionalState.intensity * 0.2}
            speed={2 + emotionalState.intensity * 3}
            transparent
            opacity={0.9}
          />
        </Sphere>
      </group>
      
      {/* Inner Glow */}
      <Sphere ref={innerRef} args={[0.5, 32, 32]}>
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={1}
          transparent
          opacity={0.6}
        />
      </Sphere>
      
      {/* Orbiting Rings */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => (ringsRef.current[i] = el)}
          rotation={[Math.PI / 2 + i * 0.5, i * 0.3, 0]}
        >
          <torusGeometry args={[1.5 + i * 0.3, 0.02, 16, 100]} />
          <meshStandardMaterial
            color={targetColor}
            emissive={targetColor}
            emissiveIntensity={0.5}
            transparent
            opacity={0.6 - i * 0.15}
          />
        </mesh>
      ))}
      
      {/* Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color={targetColor}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// ============ SPEECH HOOKS ============
function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);
  
  return { transcript, isListening, startListening, stopListening, setTranscript };
}

function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const speak = useCallback((text, onEnd = null) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);
  
  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);
  
  return { speak, stop, isSpeaking };
}

// ============ COMPONENTS ============

// Navigation
function Navigation() {
  const { currentTab, setCurrentTab, user } = useStore();
  
  const tabs = [
    { id: 'practice', icon: Target, label: 'Practice' },
    { id: 'journey', icon: TrendingUp, label: 'Journey' },
    { id: 'community', icon: Users, label: 'Community' },
    { id: 'marketplace', icon: ShoppingBag, label: 'Shop' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-900/95 backdrop-blur-lg border-t border-white/10 z-50" data-testid="main-navigation">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex justify-around items-center py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                currentTab === tab.id
                  ? 'text-primary-400 bg-primary-500/10'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid={`nav-${tab.id}`}
            >
              <tab.icon size={22} />
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// Header
function Header() {
  const { user, soundEnabled, setSoundEnabled } = useStore();
  
  return (
    <header className="fixed top-0 left-0 right-0 bg-dark-900/90 backdrop-blur-lg border-b border-white/10 z-50" data-testid="app-header">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">Mirror Play</h1>
            <p className="text-xs text-gray-400">Emotional Intelligence</p>
          </div>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5">
              <Flame size={16} className="text-orange-400" />
              <span className="text-sm font-semibold" data-testid="streak-count">{user.streak || 0}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-sm font-semibold" data-testid="coins-count">{user.coins || 0}</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition"
              data-testid="sound-toggle"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

// Onboarding Component
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    if (!username.trim() || !email.trim()) return;
    
    setLoading(true);
    try {
      const user = await api.createUser(username.trim(), email.trim());
      localStorage.setItem('mirrorplay_user_id', user.id);
      onComplete(user);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
    setLoading(false);
  };
  
  const slides = [
    {
      title: "Welcome to Mirror Play",
      description: "Build real-world communication skills through guided practice and immediate feedback.",
      icon: <Sparkles size={48} className="text-primary-400" />
    },
    {
      title: "Meet Mirror AI",
      description: "Your practice partner responds in real-time to your voice, tone, and emotional intensity.",
      icon: <Target size={48} className="text-accent-400" />
    },
    {
      title: "Track Your Growth",
      description: "Earn XP, unlock achievements, and watch your emotional intelligence improve over time.",
      icon: <TrendingUp size={48} className="text-green-400" />
    }
  ];
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" data-testid="onboarding-screen">
      <div className="w-full max-w-md">
        {step < 3 ? (
          <div className="text-center">
            <div className="mb-8 flex justify-center">{slides[step].icon}</div>
            <h2 className="text-2xl font-bold mb-4">{slides[step].title}</h2>
            <p className="text-gray-400 mb-8">{slides[step].description}</p>
            
            <div className="flex justify-center gap-2 mb-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === step ? 'w-8 bg-primary-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={() => setStep(step + 1)}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold hover:opacity-90 transition"
              data-testid="onboarding-next"
            >
              {step === 2 ? 'Get Started' : 'Continue'}
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-2 text-center">Create Your Profile</h2>
            <p className="text-gray-400 mb-6 text-center">Let's personalize your experience</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary-500 transition"
                  data-testid="username-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary-500 transition"
                  data-testid="email-input"
                />
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={loading || !username.trim() || !email.trim()}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                data-testid="create-profile-btn"
              >
                {loading ? 'Creating...' : 'Start Your Journey'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Scenario Card
function ScenarioCard({ scenario, onSelect }) {
  const difficultyColors = {
    beginner: 'bg-green-500/20 text-green-400',
    intermediate: 'bg-yellow-500/20 text-yellow-400',
    advanced: 'bg-red-500/20 text-red-400'
  };
  
  return (
    <div
      onClick={() => onSelect(scenario)}
      className="glass-card rounded-2xl p-5 cursor-pointer hover:bg-white/10 transition-all hover:scale-[1.02]"
      data-testid={`scenario-card-${scenario.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg">{scenario.title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[scenario.difficulty]}`}>
          {scenario.difficulty}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-4">{scenario.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400" />
            {scenario.rating?.toFixed(1) || '4.5'}
          </span>
          <span>{scenario.plays?.toLocaleString() || '0'} plays</span>
        </div>
        <ChevronRight size={20} className="text-primary-400" />
      </div>
    </div>
  );
}

// Practice Session Component
function PracticeSession({ scenario, onEnd }) {
  const { user, emotionalState, setEmotionalState, soundEnabled } = useStore();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [finalAnalysis, setFinalAnalysis] = useState(null);
  const messagesEndRef = useRef(null);
  
  const { transcript, isListening, startListening, stopListening, setTranscript } = useSpeechRecognition();
  const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis();
  
  useEffect(() => {
    const initSession = async () => {
      if (user) {
        const session = await api.createSession(user.id, scenario.id);
        setSessionId(session.id);
        
        // Add initial AI greeting
        const greeting = `Hello! I'm ready for our practice session. ${scenario.context} Let's begin whenever you're ready.`;
        setMessages([{ role: 'assistant', content: greeting }]);
        if (soundEnabled) speak(greeting);
      }
    };
    initSession();
    
    return () => stopSpeaking();
  }, [user, scenario]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (transcript && !isListening) {
      setInputText(transcript);
    }
  }, [transcript, isListening]);
  
  const sendMessage = async (text) => {
    if (!text.trim() || !sessionId || isLoading) return;
    
    setIsLoading(true);
    setInputText('');
    setTranscript('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    
    try {
      const response = await api.sendMessage(sessionId, text, user.id);
      
      // Update emotional state from analysis
      if (response.tone_analysis) {
        const emotion = response.tone_analysis.dominant_emotion || 'calm';
        const intensity = (response.tone_analysis.overall_score || 70) / 100;
        setEmotionalState({ emotion, intensity });
      }
      
      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.ai_response.content,
        tone_analysis: response.tone_analysis
      }]);
      
      if (soundEnabled) {
        speak(response.ai_response.content);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    
    setIsLoading(false);
  };
  
  const endSession = async () => {
    if (!sessionId) return;
    
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
    const result = await api.completeSession(sessionId, duration);
    setFinalAnalysis(result);
    setShowAnalysis(true);
  };
  
  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      if (transcript) {
        sendMessage(transcript);
      }
    } else {
      startListening();
    }
  };
  
  if (showAnalysis && finalAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6" data-testid="session-results">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center animate-pulse-glow">
            <Trophy size={40} className="text-white" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-gray-400 mb-6">Great practice session. Here's how you did:</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-3xl font-bold text-primary-400">{finalAnalysis.analysis?.overall_score || 0}</p>
              <p className="text-sm text-gray-400">Overall Score</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-3xl font-bold text-accent-400">+{finalAnalysis.xp_earned || 0}</p>
              <p className="text-sm text-gray-400">XP Earned</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            {['empathy', 'assertiveness', 'warmth', 'clarity'].map((metric) => (
              <div key={metric} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-28 text-left capitalize">{metric}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                    style={{ width: `${finalAnalysis.analysis?.[metric] || 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-10">{finalAnalysis.analysis?.[metric] || 0}</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={onEnd}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold hover:opacity-90 transition"
            data-testid="back-to-scenarios"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-180px)]" data-testid="practice-session">
      {/* Session Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <h2 className="font-semibold">{scenario.title}</h2>
          <p className="text-sm text-gray-400">{scenario.category}</p>
        </div>
        <button
          onClick={endSession}
          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition"
          data-testid="end-session-btn"
        >
          End Session
        </button>
      </div>
      
      {/* 3D Core Display */}
      <div className="h-48 relative">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <Suspense fallback={null}>
            <LightCore
              emotionalState={emotionalState}
              isListening={isListening}
              isSpeaking={isSpeaking}
            />
            <OrbitControls enableZoom={false} enablePan={false} />
          </Suspense>
        </Canvas>
        
        {/* Emotion indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs">
          <span className="capitalize">{emotionalState.emotion}</span>
          <span className="text-gray-400 ml-2">{Math.round(emotionalState.intensity * 100)}%</span>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary-500/30 text-white'
                  : 'bg-white/10 text-white'
              }`}
            >
              <p>{msg.content}</p>
              {msg.tone_analysis && (
                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-400">
                  Score: {msg.tone_analysis.overall_score} • {msg.tone_analysis.feedback}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleMicToggle}
            className={`p-3 rounded-full transition ${
              isListening
                ? 'bg-red-500 animate-pulse'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            data-testid="mic-button"
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputText)}
            placeholder={isListening ? 'Listening...' : 'Type or speak your message...'}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary-500 transition"
            data-testid="message-input"
          />
          
          <button
            onClick={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            className="p-3 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 hover:opacity-90 transition disabled:opacity-50"
            data-testid="send-button"
          >
            <Send size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Practice Tab
function PracticeTab() {
  const { user, scenarios, setScenarios, dailyPrompt, setDailyPrompt } = useStore();
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  
  const categories = ['all', 'workplace', 'family', 'dating', 'relationships', 'career', 'friendship'];
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [scenariosData, promptData] = await Promise.all([
          api.getScenarios(),
          api.getDailyPrompt()
        ]);
        setScenarios(scenariosData);
        setDailyPrompt(promptData);
      } catch (error) {
        console.error('Failed to load practice data:', error);
      }
      setLoading(false);
    };
    loadData();
  }, []);
  
  const filteredScenarios = useMemo(() => {
    if (selectedCategory === 'all') return scenarios;
    return scenarios.filter(s => s.category === selectedCategory);
  }, [scenarios, selectedCategory]);
  
  if (selectedScenario) {
    return (
      <PracticeSession
        scenario={selectedScenario}
        onEnd={() => setSelectedScenario(null)}
      />
    );
  }
  
  return (
    <div className="p-4 pb-24" data-testid="practice-tab">
      {/* Daily Prompt */}
      {dailyPrompt && (
        <div className="glass-card rounded-2xl p-5 mb-6 glow-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-full bg-accent-500/20">
              <Sparkles size={20} className="text-accent-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Today's Focus</p>
              <h3 className="font-semibold">{dailyPrompt.focus}</h3>
            </div>
          </div>
          <p className="text-gray-300 text-sm">{dailyPrompt.prompt}</p>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          className="glass-card rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition"
          onClick={() => setSelectedScenario(scenarios[Math.floor(Math.random() * scenarios.length)])}
          data-testid="quick-practice-btn"
        >
          <div className="p-2 rounded-full bg-primary-500/20">
            <Zap size={20} className="text-primary-400" />
          </div>
          <div className="text-left">
            <p className="font-medium">Quick Practice</p>
            <p className="text-xs text-gray-400">5 min session</p>
          </div>
        </button>
        <button
          className="glass-card rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition"
          onClick={() => setShowJournalModal(true)}
          data-testid="voice-journal-btn"
        >
          <div className="p-2 rounded-full bg-accent-500/20">
            <Book size={20} className="text-accent-400" />
          </div>
          <div className="text-left">
            <p className="font-medium">Voice Journal</p>
            <p className="text-xs text-gray-400">Reflect & grow</p>
          </div>
        </button>
        <button
          className="glass-card rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition"
          onClick={() => setShowPartnerModal(true)}
          data-testid="partner-practice-btn"
        >
          <div className="p-2 rounded-full bg-green-500/20">
            <UserPlus size={20} className="text-green-400" />
          </div>
          <div className="text-left">
            <p className="font-medium">Partner Practice</p>
            <p className="text-xs text-gray-400">Practice with a friend</p>
          </div>
        </button>
        <button
          className="glass-card rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition"
          data-testid="breathing-btn"
        >
          <div className="p-2 rounded-full bg-blue-500/20">
            <Cloud size={20} className="text-blue-400" />
          </div>
          <div className="text-left">
            <p className="font-medium">Breathing</p>
            <p className="text-xs text-gray-400">Calm & center</p>
          </div>
        </button>
      </div>
      </div>
      
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-primary-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            data-testid={`category-${cat}`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Scenarios */}
      <h2 className="text-lg font-semibold mb-4">Practice Scenarios</h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="animate-spin text-primary-400" size={32} />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onSelect={setSelectedScenario}
            />
          ))}
        </div>
      )}
      
      {/* Voice Journal Modal */}
      <VoiceJournalingModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        userId={user?.id}
      />
      
      {/* Partner Practice Modal */}
      <PartnerPracticeModal
        isOpen={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
        userId={user?.id}
        scenarios={scenarios}
      />
    </div>
  );
}

// Journey Tab
function JourneyTab() {
  const { user, userStats, setUserStats, achievements, setAchievements } = useStore();
  const [loading, setLoading] = useState(true);
  const [recentSessions, setRecentSessions] = useState([]);
  
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [stats, achievementsData, sessions] = await Promise.all([
          api.getUserStats(user.id),
          api.getAchievements(user.id),
          api.getUserSessions(user.id)
        ]);
        setUserStats(stats);
        setAchievements(achievementsData);
        setRecentSessions(sessions.slice(0, 5));
      } catch (error) {
        console.error('Failed to load journey data:', error);
      }
      setLoading(false);
    };
    loadData();
  }, [user]);
  
  const xpForNextLevel = useMemo(() => {
    if (!user) return 100;
    const currentLevelXP = (user.level - 1) * 100;
    const nextLevelXP = user.level * 100;
    return { current: user.xp - currentLevelXP, needed: 100 };
  }, [user]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <RefreshCw className="animate-spin text-primary-400" size={32} />
      </div>
    );
  }
  
  return (
    <div className="p-4 pb-24" data-testid="journey-tab">
      {/* Level Progress */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-400">Your Level</p>
            <h2 className="text-3xl font-bold gradient-text">Level {user?.level || 1}</h2>
          </div>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold">
            {user?.level || 1}
          </div>
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>{xpForNextLevel.current} XP</span>
            <span>{xpForNextLevel.needed} XP</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
              style={{ width: `${(xpForNextLevel.current / xpForNextLevel.needed) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card rounded-xl p-4">
          <Target size={24} className="text-primary-400 mb-2" />
          <p className="text-2xl font-bold">{userStats?.total_sessions || 0}</p>
          <p className="text-sm text-gray-400">Sessions</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <Clock size={24} className="text-accent-400 mb-2" />
          <p className="text-2xl font-bold">{userStats?.total_practice_minutes || 0}</p>
          <p className="text-sm text-gray-400">Minutes</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <Flame size={24} className="text-orange-400 mb-2" />
          <p className="text-2xl font-bold">{userStats?.streak || 0}</p>
          <p className="text-sm text-gray-400">Day Streak</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <BarChart2 size={24} className="text-green-400 mb-2" />
          <p className="text-2xl font-bold">{userStats?.average_score || 0}</p>
          <p className="text-sm text-gray-400">Avg Score</p>
        </div>
      </div>
      
      {/* Achievements */}
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Award size={20} className="text-yellow-400" />
        Achievements
      </h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {achievements.unlocked?.slice(0, 4).map((achievement) => (
          <div
            key={achievement.id}
            className="glass-card rounded-xl p-3 text-center"
            data-testid={`achievement-${achievement.id}`}
          >
            <span className="text-2xl">{achievement.icon}</span>
            <p className="text-xs mt-1 truncate">{achievement.name}</p>
          </div>
        ))}
        {achievements.locked?.slice(0, 4 - (achievements.unlocked?.length || 0)).map((achievement) => (
          <div
            key={achievement.id}
            className="glass-card rounded-xl p-3 text-center opacity-40"
          >
            <span className="text-2xl grayscale">{achievement.icon}</span>
            <p className="text-xs mt-1 truncate">{achievement.name}</p>
          </div>
        ))}
      </div>
      
      {/* Recent Activity */}
      <h2 className="text-lg font-semibold mb-4">Recent Practice</h2>
      <div className="space-y-3">
        {recentSessions.length > 0 ? (
          recentSessions.map((session) => (
            <div key={session.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{session.scenario_id}</p>
                <p className="text-sm text-gray-400">
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary-400">+{session.xp_earned || 0} XP</p>
                <p className="text-sm text-gray-400">Score: {session.analysis?.overall_score || '-'}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-8">No practice sessions yet. Start your journey!</p>
        )}
      </div>
    </div>
  );
}

// Community Tab
function CommunityTab() {
  const { user, posts, setPosts, leaderboard, setLeaderboard } = useStore();
  const [activeSection, setActiveSection] = useState('feed');
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [weeklyChallenges, setWeeklyChallenges] = useState([]);
  const [communityScenarios, setCommunityScenarios] = useState([]);
  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeLeaderboard, setChallengeLeaderboard] = useState([]);
  const [seasonalEvents, setSeasonalEvents] = useState({ active: [], upcoming: [] });
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [postsData, leaderboardData, weeklyChallengesData, communityData, eventsData] = await Promise.all([
          api.getPosts(),
          api.getLeaderboard(),
          api.getWeeklyChallenges(),
          api.getCommunityScenarios(),
          api.getSeasonalEvents()
        ]);
        setPosts(postsData);
        setLeaderboard(leaderboardData);
        setWeeklyChallenges(weeklyChallengesData);
        setCommunityScenarios(communityData);
        setSeasonalEvents(eventsData);
      } catch (error) {
        console.error('Failed to load community data:', error);
      }
      setLoading(false);
    };
    loadData();
  }, []);
  
  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;
    try {
      await api.createPost(user.id, newPostContent);
      const updatedPosts = await api.getPosts();
      setPosts(updatedPosts);
      setNewPostContent('');
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };
  
  const handleLikePost = async (postId) => {
    if (!user) return;
    try {
      await api.likePost(postId, user.id);
      const updatedPosts = await api.getPosts();
      setPosts(updatedPosts);
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };
  
  const handleJoinChallenge = async (challengeId) => {
    if (!user) return;
    try {
      await api.joinWeeklyChallenge(challengeId, user.id);
      const updatedChallenges = await api.getWeeklyChallenges();
      setWeeklyChallenges(updatedChallenges);
    } catch (error) {
      console.error('Failed to join challenge:', error);
    }
  };
  
  const loadChallengeLeaderboard = async (challenge) => {
    setSelectedChallenge(challenge);
    try {
      const lb = await api.getWeeklyChallengeLeaderboard(challenge.id);
      setChallengeLeaderboard(lb);
    } catch (error) {
      console.error('Failed to load challenge leaderboard:', error);
    }
  };
  
  const handleJoinEvent = async (eventId) => {
    if (!user) return;
    try {
      await api.participateInEvent(eventId, user.id);
    } catch (error) {
      console.error('Failed to join event:', error);
    }
  };
  
  return (
    <div className="p-4 pb-24" data-testid="community-tab">
      {/* Section Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {['feed', 'scenarios', 'challenges', 'events', 'leaderboard'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 rounded-xl font-medium transition whitespace-nowrap ${
              activeSection === section
                ? 'bg-primary-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            data-testid={`section-${section}`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="animate-spin text-primary-400" size={32} />
        </div>
      ) : (
        <>
          {activeSection === 'feed' && (
            <div>
              {/* Create Post */}
              <div className="glass-card rounded-xl p-4 mb-6">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share your progress or insights..."
                  className="w-full bg-transparent border-none focus:outline-none resize-none text-white placeholder-gray-500"
                  rows={3}
                  data-testid="new-post-input"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim()}
                    className="px-4 py-2 bg-primary-500 rounded-lg text-sm font-medium hover:bg-primary-600 transition disabled:opacity-50"
                    data-testid="create-post-btn"
                  >
                    Post
                  </button>
                </div>
              </div>
              
              {/* Posts */}
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="glass-card rounded-xl p-4" data-testid={`post-${post.id}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        {post.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium">{post.username || 'User'}</p>
                        <p className="text-xs text-gray-400">Level {post.user_level || 1}</p>
                      </div>
                    </div>
                    <p className="text-gray-200 mb-4">{post.content}</p>
                    <div className="flex items-center gap-4 text-gray-400">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1 hover:text-red-400 transition ${
                          post.likes?.includes(user?.id) ? 'text-red-400' : ''
                        }`}
                        data-testid={`like-post-${post.id}`}
                      >
                        <Heart size={18} fill={post.likes?.includes(user?.id) ? 'currentColor' : 'none'} />
                        <span>{post.likes?.length || 0}</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-primary-400 transition">
                        <MessageCircle size={18} />
                        <span>{post.comments?.length || 0}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeSection === 'scenarios' && (
            <div>
              {/* Create Scenario Button */}
              <button
                onClick={() => setShowCreateScenario(!showCreateScenario)}
                className="w-full glass-card rounded-xl p-4 mb-6 flex items-center justify-center gap-2 hover:bg-white/10 transition"
              >
                <Plus size={20} />
                <span>Create Community Scenario</span>
              </button>
              
              {showCreateScenario && (
                <CreateScenarioForm 
                  userId={user?.id}
                  onClose={() => setShowCreateScenario(false)}
                  onCreated={async () => {
                    const updated = await api.getCommunityScenarios();
                    setCommunityScenarios(updated);
                    setShowCreateScenario(false);
                  }}
                />
              )}
              
              {/* Community Scenarios */}
              <div className="space-y-4">
                {communityScenarios.length > 0 ? communityScenarios.map((scenario) => (
                  <div key={scenario.id} className="glass-card rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{scenario.title}</h3>
                        <p className="text-sm text-gray-400">by {scenario.author_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        scenario.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                        scenario.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {scenario.difficulty}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{scenario.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-400" />
                          {scenario.rating?.toFixed(1) || '0.0'}
                        </span>
                        <span>{scenario.plays || 0} plays</span>
                        <span className="flex items-center gap-1">
                          <Heart size={14} />
                          {scenario.likes?.length || 0}
                        </span>
                      </div>
                      <button className="px-3 py-1.5 bg-primary-500 rounded-lg text-sm font-medium hover:bg-primary-600 transition">
                        Practice
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-gray-400">
                    <Globe size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No community scenarios yet</p>
                    <p className="text-sm">Be the first to create one!</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeSection === 'challenges' && (
            <div>
              {selectedChallenge ? (
                <div>
                  <button 
                    onClick={() => setSelectedChallenge(null)}
                    className="flex items-center gap-2 text-gray-400 mb-4 hover:text-white transition"
                  >
                    <ChevronLeft size={20} />
                    Back to Challenges
                  </button>
                  
                  <div className="glass-card rounded-xl p-5 mb-6">
                    <h2 className="text-xl font-bold mb-2">{selectedChallenge.title}</h2>
                    <p className="text-gray-400 mb-4">{selectedChallenge.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Target size={16} className="text-primary-400" />
                        Score {selectedChallenge.target}+ on {selectedChallenge.metric}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap size={16} className="text-yellow-400" />
                        {selectedChallenge.rewards?.xp} XP
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4">Leaderboard</h3>
                  <div className="space-y-3">
                    {challengeLeaderboard.map((entry, i) => (
                      <div key={entry.user_id} className={`glass-card rounded-xl p-4 flex items-center gap-4 ${i < 3 ? 'border border-yellow-500/30' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-600' : 'bg-white/10'
                        }`}>
                          {entry.rank}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                          {entry.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{entry.username}</p>
                          <p className="text-sm text-gray-400">{entry.qualifying_sessions} qualifying sessions</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary-400">{entry.best_score}</p>
                          {entry.completed && <span className="text-xs text-green-400">Completed!</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Weekly Challenges</h2>
                  {weeklyChallenges.length > 0 ? weeklyChallenges.map((challenge) => (
                    <div key={challenge.id} className="glass-card rounded-xl p-5" data-testid={`challenge-${challenge.id}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{challenge.title}</h3>
                          <p className="text-sm text-gray-400">{challenge.description}</p>
                        </div>
                        <div className="bg-accent-500/20 text-accent-400 px-3 py-1 rounded-full text-sm font-medium">
                          Active
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Users size={16} />
                          {challenge.participants?.length || 0} joined
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap size={16} className="text-yellow-400" />
                          {challenge.rewards?.xp || 100} XP + {challenge.rewards?.coins || 50} coins
                        </span>
                        <span className="flex items-center gap-1">
                          <Target size={16} />
                          {challenge.sessions_required} sessions
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleJoinChallenge(challenge.id)}
                          className="flex-1 px-4 py-2 bg-primary-500 rounded-lg text-sm font-medium hover:bg-primary-600 transition"
                        >
                          Join Challenge
                        </button>
                        <button 
                          onClick={() => loadChallengeLeaderboard(challenge)}
                          className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition"
                        >
                          <Trophy size={18} />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-gray-400">
                      <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No active challenges</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeSection === 'events' && (
            <div>
              {/* Active Seasonal Events */}
              {seasonalEvents.active?.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles size={20} className="text-yellow-400" />
                    Active Events
                  </h2>
                  {seasonalEvents.active.map((event) => (
                    <div 
                      key={event.id} 
                      className="glass-card rounded-xl p-5 mb-4"
                      style={{ borderColor: event.color, borderWidth: 2 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{event.icon}</span>
                        <div>
                          <h3 className="font-bold text-lg">{event.name}</h3>
                          <p className="text-sm text-gray-400">{event.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Zap size={16} className="text-yellow-400" />
                          {event.bonus_xp_multiplier}x XP Bonus
                        </span>
                        <span className="flex items-center gap-1">
                          <Gift size={16} className="text-pink-400" />
                          {event.exclusive_rewards?.length || 0} Exclusive Rewards
                        </span>
                      </div>
                      <div className="flex gap-2 mb-4">
                        {event.exclusive_rewards?.map((reward) => (
                          <div key={reward.id} className="bg-white/10 rounded-lg px-3 py-2 text-sm">
                            <span>{reward.icon || '🎁'}</span>
                            <span className="ml-2">{reward.name}</span>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => handleJoinEvent(event.id)}
                        className="w-full px-4 py-2 rounded-lg font-medium transition"
                        style={{ backgroundColor: event.color }}
                      >
                        Participate Now
                      </button>
                    </div>
                  ))}
                </>
              )}
              
              {/* Upcoming Events */}
              {seasonalEvents.upcoming?.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold mb-4 mt-6">Upcoming Events</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {seasonalEvents.upcoming.slice(0, 4).map((event) => (
                      <div key={event.id} className="glass-card rounded-xl p-4 opacity-70">
                        <span className="text-2xl">{event.icon}</span>
                        <h4 className="font-medium mt-2">{event.name}</h4>
                        <p className="text-xs text-gray-400">{event.theme}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          
          {activeSection === 'leaderboard' && (
            <div className="space-y-3">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.user_id}
                  className={`glass-card rounded-xl p-4 flex items-center gap-4 ${
                    i < 3 ? 'border border-yellow-500/30' : ''
                  }`}
                  data-testid={`leaderboard-entry-${i}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    i === 0 ? 'bg-yellow-500' :
                    i === 1 ? 'bg-gray-400' :
                    i === 2 ? 'bg-orange-600' :
                    'bg-white/10'
                  }`}>
                    {entry.rank}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                    {entry.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{entry.username}</p>
                    <p className="text-sm text-gray-400">Level {entry.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-400">{entry.xp?.toLocaleString()} XP</p>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Flame size={14} className="text-orange-400" />
                      {entry.streak}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Create Scenario Form Component
function CreateScenarioForm({ userId, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'workplace',
    difficulty: 'intermediate',
    context: '',
    ai_role: '',
    user_goal: '',
    tags: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!formData.title || !formData.context || !formData.ai_role) return;
    
    setSubmitting(true);
    try {
      await api.createCommunityScenario({
        ...formData,
        author_id: userId
      });
      onCreated();
    } catch (error) {
      console.error('Failed to create scenario:', error);
    }
    setSubmitting(false);
  };
  
  return (
    <div className="glass-card rounded-xl p-5 mb-6">
      <h3 className="text-lg font-semibold mb-4">Create New Scenario</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
            placeholder="e.g., Negotiating a Contract"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
            rows={2}
            placeholder="Brief description of the scenario"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none"
            >
              <option value="workplace">Workplace</option>
              <option value="family">Family</option>
              <option value="dating">Dating</option>
              <option value="relationships">Relationships</option>
              <option value="career">Career</option>
              <option value="friendship">Friendship</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Context</label>
          <textarea
            value={formData.context}
            onChange={(e) => setFormData({...formData, context: e.target.value})}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
            rows={2}
            placeholder="Set the scene for the practice session"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">AI Role</label>
          <textarea
            value={formData.ai_role}
            onChange={(e) => setFormData({...formData, ai_role: e.target.value})}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
            rows={2}
            placeholder="Describe who the AI will play as"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">User Goal</label>
          <input
            type="text"
            value={formData.user_goal}
            onChange={(e) => setFormData({...formData, user_goal: e.target.value})}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
            placeholder="What should the user practice?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({...formData, tags: e.target.value})}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
            placeholder="negotiation, business, assertiveness"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !formData.title || !formData.context}
            className="flex-1 px-4 py-2 bg-primary-500 rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Scenario'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Marketplace Tab
function MarketplaceTab() {
  const { user, marketplaceItems, setMarketplaceItems, setUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const items = await api.getMarketplace();
        setMarketplaceItems(items);
      } catch (error) {
        console.error('Failed to load marketplace:', error);
      }
      setLoading(false);
    };
    loadData();
  }, []);
  
  const handlePurchase = async (item) => {
    if (!user || user.coins < item.price) return;
    
    setPurchasing(item.id);
    try {
      const result = await api.purchaseItem(user.id, item.id);
      if (result.success) {
        setUser({ ...user, coins: user.coins - item.price });
      }
    } catch (error) {
      console.error('Failed to purchase item:', error);
    }
    setPurchasing(null);
  };
  
  const typeIcons = {
    avatar: '👤',
    core_color: '🔮',
    badge: '🏅',
    boost: '⚡'
  };
  
  return (
    <div className="p-4 pb-24" data-testid="marketplace-tab">
      {/* Balance */}
      <div className="glass-card rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Your Balance</p>
            <div className="flex items-center gap-2">
              <Zap size={24} className="text-yellow-400" />
              <span className="text-3xl font-bold">{user?.coins || 0}</span>
              <span className="text-gray-400">coins</span>
            </div>
          </div>
          <button className="px-4 py-2 bg-accent-500 rounded-lg font-medium hover:bg-accent-600 transition">
            Get More
          </button>
        </div>
      </div>
      
      {/* Items */}
      <h2 className="text-lg font-semibold mb-4">Available Items</h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="animate-spin text-primary-400" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {marketplaceItems.map((item) => (
            <div key={item.id} className="glass-card rounded-xl p-4" data-testid={`item-${item.id}`}>
              <div className="text-3xl mb-2">{typeIcons[item.type] || '🎁'}</div>
              <h3 className="font-semibold mb-1">{item.name}</h3>
              <p className="text-xs text-gray-400 mb-3">{item.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Zap size={16} className="text-yellow-400" />
                  <span className="font-semibold">{item.price}</span>
                </div>
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={!user || user.coins < item.price || purchasing === item.id}
                  className="px-3 py-1.5 bg-primary-500 rounded-lg text-sm font-medium hover:bg-primary-600 transition disabled:opacity-50"
                  data-testid={`buy-${item.id}`}
                >
                  {purchasing === item.id ? '...' : 'Buy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Profile Tab
function ProfileTab() {
  const { user, setUser, userStats, setUserStats, friends, setFriends } = useStore();
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [dailyReward, setDailyReward] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [stats, friendsData] = await Promise.all([
          api.getUserStats(user.id),
          api.getFriends(user.id)
        ]);
        setUserStats(stats);
        setFriends(friendsData);
      } catch (error) {
        console.error('Failed to load profile data:', error);
      }
      setLoading(false);
    };
    loadData();
  }, [user]);
  
  const handleClaimDaily = async () => {
    if (!user || claimingDaily) return;
    
    setClaimingDaily(true);
    try {
      const result = await api.claimDailyReward(user.id);
      if (result.success) {
        setDailyReward(result);
        setUser({
          ...user,
          xp: user.xp + result.xp_earned,
          coins: user.coins + result.coins_earned
        });
      }
    } catch (error) {
      console.error('Failed to claim daily reward:', error);
    }
    setClaimingDaily(false);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <RefreshCw className="animate-spin text-primary-400" size={32} />
      </div>
    );
  }
  
  return (
    <div className="p-4 pb-24" data-testid="profile-tab">
      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-6 mb-6 text-center">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-4xl font-bold animate-pulse-glow">
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <h2 className="text-2xl font-bold mb-1">{user?.username || 'User'}</h2>
        <p className="text-gray-400 mb-4">{user?.email}</p>
        
        <div className="flex justify-center gap-6">
          <div>
            <p className="text-2xl font-bold gradient-text">{user?.level || 1}</p>
            <p className="text-sm text-gray-400">Level</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{user?.xp || 0}</p>
            <p className="text-sm text-gray-400">XP</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">{userStats?.streak || 0}</p>
            <p className="text-sm text-gray-400">Streak</p>
          </div>
        </div>
      </div>
      
      {/* Daily Reward */}
      <div className="glass-card rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-yellow-500/20">
              <Calendar size={24} className="text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold">Daily Reward</p>
              <p className="text-sm text-gray-400">
                {userStats?.daily_streak || 0} day streak • {(userStats?.daily_streak || 0) + 1}x bonus tomorrow!
              </p>
            </div>
          </div>
          <button
            onClick={handleClaimDaily}
            disabled={claimingDaily || dailyReward}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              dailyReward
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90'
            }`}
            data-testid="claim-daily-btn"
          >
            {dailyReward ? (
              <span className="flex items-center gap-1">
                <Check size={18} />
                +{dailyReward.xp_earned} XP
              </span>
            ) : claimingDaily ? (
              'Claiming...'
            ) : (
              'Claim'
            )}
          </button>
        </div>
      </div>
      
      {/* Friends */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Friends ({friends.length})</h2>
        <button className="text-primary-400 text-sm font-medium">Add Friends</button>
      </div>
      
      {friends.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {friends.slice(0, 4).map((friend) => (
            <div key={friend.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                {friend.username?.charAt(0).toUpperCase() || 'F'}
              </div>
              <div>
                <p className="font-medium text-sm">{friend.username}</p>
                <p className="text-xs text-gray-400">Level {friend.level}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-6 text-center mb-6">
          <Users size={32} className="mx-auto mb-2 text-gray-500" />
          <p className="text-gray-400">No friends yet</p>
          <p className="text-sm text-gray-500">Connect with others to share your journey</p>
        </div>
      )}
      
      {/* Settings */}
      <h2 className="text-lg font-semibold mb-4">Settings</h2>
      <div className="glass-card rounded-xl divide-y divide-white/10">
        {[
          { icon: Volume2, label: 'Sound & Notifications' },
          { icon: Settings, label: 'Voice Settings' },
          { icon: Gift, label: 'Invite Friends' },
          { icon: Award, label: 'Export Progress' },
        ].map((item, i) => (
          <button
            key={i}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} className="text-gray-400" />
              <span>{item.label}</span>
            </div>
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ VOICE JOURNALING ============
function VoiceJournalingModal({ isOpen, onClose, userId }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [entryType, setEntryType] = useState('reflection');
  const [mood, setMood] = useState('neutral');
  const [saving, setSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState(null);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('record');
  
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      loadEntries();
      loadStats();
    }
  }, [isOpen]);
  
  const loadEntries = async () => {
    try {
      const data = await api.getVoiceJournalEntries(userId);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  };
  
  const loadStats = async () => {
    try {
      const data = await api.getVoiceJournalStats(userId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };
  
  const startRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      let finalTranscript = '';
      
      recognitionRef.current.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript + interim);
      };
      
      recognitionRef.current.start();
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
  };
  
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };
  
  const saveEntry = async () => {
    if (!transcript.trim()) return;
    
    setSaving(true);
    try {
      const entry = await api.createVoiceJournalEntry(userId, transcript.trim(), duration, mood, entryType);
      setSavedEntry(entry);
      setTranscript('');
      setDuration(0);
      loadEntries();
      loadStats();
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
    setSaving(false);
  };
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const moodEmojis = {
    'great': '😊',
    'good': '🙂',
    'neutral': '😐',
    'low': '😔',
    'stressed': '😰'
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Book size={24} className="text-primary-400" />
            Voice Journal
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex border-b border-white/10">
          {['record', 'entries', 'stats'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition ${
                activeTab === tab ? 'text-primary-400 border-b-2 border-primary-400' : 'text-gray-400'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'record' && (
            <div>
              {savedEntry ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check size={32} className="text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Entry Saved!</h3>
                  <p className="text-gray-400 mb-4">{savedEntry.ai_reflection}</p>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Zap size={16} className="text-yellow-400" />
                      +15 XP
                    </span>
                    <span>Mood: {savedEntry.mood_score}/100</span>
                  </div>
                  <button
                    onClick={() => setSavedEntry(null)}
                    className="mt-6 px-6 py-2 bg-primary-500 rounded-lg font-medium"
                  >
                    New Entry
                  </button>
                </div>
              ) : (
                <>
                  {/* Entry Type Selection */}
                  <div className="flex gap-2 mb-4">
                    {[
                      { id: 'reflection', label: 'Reflection', icon: '💭' },
                      { id: 'gratitude', label: 'Gratitude', icon: '🙏' },
                      { id: 'goal', label: 'Goal', icon: '🎯' },
                      { id: 'daily', label: 'Daily', icon: '📅' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setEntryType(type.id)}
                        className={`flex-1 py-2 rounded-lg text-sm transition ${
                          entryType === type.id
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Mood Selection */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">How are you feeling?</p>
                    <div className="flex gap-2">
                      {Object.entries(moodEmojis).map(([key, emoji]) => (
                        <button
                          key={key}
                          onClick={() => setMood(key)}
                          className={`flex-1 py-2 text-xl rounded-lg transition ${
                            mood === key ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Recording Area */}
                  <div className="bg-white/5 rounded-xl p-6 text-center mb-4">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition ${
                        isRecording
                          ? 'bg-red-500 animate-pulse'
                          : 'bg-primary-500 hover:bg-primary-600'
                      }`}
                    >
                      {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                    </button>
                    <p className="mt-4 text-2xl font-mono">{formatDuration(duration)}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                    </p>
                  </div>
                  
                  {/* Transcript */}
                  {transcript && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Transcript</label>
                      <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500 resize-none"
                        rows={4}
                      />
                    </div>
                  )}
                  
                  {/* Save Button */}
                  <button
                    onClick={saveEntry}
                    disabled={!transcript.trim() || saving}
                    className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Entry'}
                  </button>
                </>
              )}
            </div>
          )}
          
          {activeTab === 'entries' && (
            <div className="space-y-3">
              {entries.length > 0 ? entries.map((entry) => (
                <div key={entry.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-1 bg-white/10 rounded-full text-xs">{entry.type}</span>
                  </div>
                  <p className="text-gray-200 text-sm mb-2">{entry.transcript?.slice(0, 150)}...</p>
                  {entry.ai_reflection && (
                    <p className="text-sm text-primary-400 italic">"{entry.ai_reflection}"</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Mood: {entry.mood_score}/100</span>
                    <span>{formatDuration(entry.duration)}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-gray-400">
                  <Book size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No journal entries yet</p>
                  <p className="text-sm">Start recording to begin your journey</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'stats' && stats && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-primary-400">{stats.total_entries}</p>
                  <p className="text-sm text-gray-400">Entries</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-accent-400">{stats.total_minutes}</p>
                  <p className="text-sm text-gray-400">Minutes</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{stats.avg_mood}</p>
                  <p className="text-sm text-gray-400">Avg Mood</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-orange-400">{stats.streak}</p>
                  <p className="text-sm text-gray-400">Streak</p>
                </div>
              </div>
              
              {stats.mood_trend?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Mood Trend (Last 7 Days)</h3>
                  <div className="flex items-end gap-1 h-24">
                    {stats.mood_trend.map((day, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary-500/50 rounded-t"
                        style={{ height: `${day.mood}%` }}
                        title={`${day.date}: ${day.mood}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ PARTNER PRACTICE ============
function PartnerPracticeModal({ isOpen, onClose, userId, scenarios }) {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [mySessions, setMySessions] = useState([]);
  const [sessionResults, setSessionResults] = useState(null);
  
  useEffect(() => {
    if (isOpen) {
      loadMySessions();
    }
  }, [isOpen]);
  
  const loadMySessions = async () => {
    try {
      const sessions = await api.getUserPartnerSessions(userId);
      setMySessions(sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };
  
  const createSession = async () => {
    if (!selectedScenario) return;
    
    setLoading(true);
    try {
      const session = await api.createPartnerSession(userId, selectedScenario.id);
      setCurrentSession(session);
      setActiveTab('waiting');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
    setLoading(false);
  };
  
  const joinSession = async () => {
    if (!inviteCode.trim()) return;
    
    setLoading(true);
    try {
      const session = await api.joinPartnerSession(inviteCode.trim(), userId);
      setCurrentSession(session);
      setMessages(session.messages || []);
      setActiveTab('practice');
    } catch (error) {
      console.error('Failed to join session:', error);
      alert('Session not found or already started');
    }
    setLoading(false);
  };
  
  const sendMessage = async () => {
    if (!inputText.trim() || !currentSession) return;
    
    try {
      const message = await api.sendPartnerMessage(currentSession.id, userId, inputText.trim());
      setMessages(prev => [...prev, message]);
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const endSession = async () => {
    if (!currentSession) return;
    
    try {
      const results = await api.completePartnerSession(currentSession.id);
      setSessionResults(results);
      setActiveTab('results');
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };
  
  const copyInviteCode = () => {
    if (currentSession?.invite_code) {
      navigator.clipboard.writeText(currentSession.invite_code);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserPlus size={24} className="text-accent-400" />
            Partner Practice
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[75vh]">
          {activeTab === 'create' && (
            <div>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('create')}
                  className="flex-1 py-2 bg-primary-500 rounded-lg font-medium"
                >
                  Create Session
                </button>
                <button
                  onClick={() => setActiveTab('join')}
                  className="flex-1 py-2 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition"
                >
                  Join Session
                </button>
              </div>
              
              <h3 className="text-lg font-semibold mb-4">Select a Scenario</h3>
              <div className="space-y-3 mb-6">
                {scenarios?.slice(0, 5).map((scenario) => (
                  <div
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario)}
                    className={`glass-card rounded-xl p-4 cursor-pointer transition ${
                      selectedScenario?.id === scenario.id
                        ? 'border-2 border-primary-500'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <h4 className="font-medium">{scenario.title}</h4>
                    <p className="text-sm text-gray-400">{scenario.description}</p>
                  </div>
                ))}
              </div>
              
              <button
                onClick={createSession}
                disabled={!selectedScenario || loading}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Partner Session'}
              </button>
              
              {/* My Sessions */}
              {mySessions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Recent Sessions</h3>
                  <div className="space-y-2">
                    {mySessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{session.scenario_id}</p>
                          <p className="text-xs text-gray-400">{session.status}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          session.status === 'active' ? 'bg-accent-500/20 text-accent-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'join' && (
            <div>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('create')}
                  className="flex-1 py-2 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition"
                >
                  Create Session
                </button>
                <button
                  onClick={() => setActiveTab('join')}
                  className="flex-1 py-2 bg-primary-500 rounded-lg font-medium"
                >
                  Join Session
                </button>
              </div>
              
              <div className="text-center py-8">
                <UserPlus size={48} className="mx-auto mb-4 text-accent-400" />
                <h3 className="text-lg font-semibold mb-2">Join a Partner Session</h3>
                <p className="text-gray-400 mb-6">Enter the invite code from your practice partner</p>
                
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-primary-500"
                  maxLength={8}
                />
                
                <button
                  onClick={joinSession}
                  disabled={inviteCode.length < 4 || loading}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Joining...' : 'Join Session'}
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'waiting' && currentSession && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent-500/20 flex items-center justify-center animate-pulse">
                <Radio size={40} className="text-accent-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Waiting for Partner</h3>
              <p className="text-gray-400 mb-6">Share this code with your practice partner</p>
              
              <div className="bg-white/5 rounded-xl p-6 mb-6">
                <p className="text-4xl font-mono font-bold tracking-widest mb-4">
                  {currentSession.invite_code}
                </p>
                <button
                  onClick={copyInviteCode}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                >
                  <Copy size={18} />
                  Copy Code
                </button>
              </div>
              
              <p className="text-sm text-gray-500">
                The session will start automatically when your partner joins
              </p>
            </div>
          )}
          
          {activeTab === 'practice' && currentSession && (
            <div className="flex flex-col h-[60vh]">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.user_id === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.user_id === userId
                          ? 'bg-primary-500/30'
                          : 'bg-white/10'
                      }`}
                    >
                      <p className="text-xs text-gray-400 mb-1">{msg.role}</p>
                      <p>{msg.content}</p>
                      {msg.tone_analysis && (
                        <p className="text-xs text-gray-400 mt-2">
                          Score: {msg.tone_analysis.overall_score}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-3 bg-primary-500 rounded-xl hover:bg-primary-600 transition"
                >
                  <Send size={20} />
                </button>
              </div>
              
              <button
                onClick={endSession}
                className="mt-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition"
              >
                End Session
              </button>
            </div>
          )}
          
          {activeTab === 'results' && sessionResults && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Trophy size={40} className="text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-6">Session Complete!</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-2">Your Score</p>
                  <p className="text-3xl font-bold text-primary-400">
                    {sessionResults.creator_analysis?.overall_score || 0}
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-2">Partner Score</p>
                  <p className="text-3xl font-bold text-accent-400">
                    {sessionResults.partner_analysis?.overall_score || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-4 text-sm mb-6">
                <span className="flex items-center gap-1">
                  <Zap size={16} className="text-yellow-400" />
                  +{sessionResults.xp_earned} XP each
                </span>
              </div>
              
              <button
                onClick={() => {
                  setCurrentSession(null);
                  setSessionResults(null);
                  setMessages([]);
                  setActiveTab('create');
                }}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold"
              >
                New Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
function App() {
  const { user, setUser, currentTab } = useStore();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const initApp = async () => {
      const savedUserId = localStorage.getItem('mirrorplay_user_id');
      if (savedUserId) {
        try {
          const userData = await api.getUser(savedUserId);
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('mirrorplay_user_id');
        }
      }
      setLoading(false);
    };
    initApp();
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center animate-pulse">
            <Sparkles size={32} className="text-white" />
          </div>
          <p className="text-gray-400">Loading Mirror Play...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Onboarding onComplete={setUser} />;
  }
  
  return (
    <div className="min-h-screen bg-dark-900" data-testid="app-container">
      <Header />
      
      <main className="pt-20 pb-20">
        {currentTab === 'practice' && <PracticeTab />}
        {currentTab === 'journey' && <JourneyTab />}
        {currentTab === 'community' && <CommunityTab />}
        {currentTab === 'marketplace' && <MarketplaceTab />}
        {currentTab === 'profile' && <ProfileTab />}
      </main>
      
      <Navigation />
    </div>
  );
}

export default App;
