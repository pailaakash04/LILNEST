import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import TimerDisplay from './components/TimerDisplay';
import TimerControls from './components/TimerControls';
import SessionConfiguration from './components/SessionConfiguration';
import ProductivityInsights from './components/ProductivityInsights';
import WebsiteBlocker from './components/WebsiteBlocker';

const STATS_KEY = 'pomodoroDailyStats';
const BLOCKED_SITES_KEY = 'pomodoroBlockedSites';

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const loadDailyStats = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveDailyStats = (stats) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // no-op
  }
};

const loadBlockedSites = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BLOCKED_SITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveBlockedSites = (sites) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BLOCKED_SITES_KEY, JSON.stringify(sites));
  } catch {
    // no-op
  }
};

const buildWeeklyData = (stats) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const result = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getDateKey(d);
    const label = days[(d.getDay() + 6) % 7];
    const record = stats[key] || { focusMinutes: 0 };
    result.push({ day: label, focusMinutes: record.focusMinutes || 0 });
  }
  return result;
};

const calculateStreak = (stats) => {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getDateKey(d);
    const sessions = stats[key]?.sessions || 0;
    if (sessions > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
};

const PomodoroTimer = () => {
  const navigate = useNavigate();
  // Timer State
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('focus'); // 'focus', 'shortBreak', 'longBreak'
  const [sessionCount, setSessionCount] = useState(1);

  // Settings State
  const [settings, setSettings] = useState({
    focusDuration: 25, // minutes
    shortBreakDuration: 5,
    longBreakDuration: 30,
    sessionsUntilLongBreak: 4
  });

  // UI State
  const [activeTab, setActiveTab] = useState('timer');
  const [isWebsiteBlockerEnabled, setIsWebsiteBlockerEnabled] = useState(false);
  const [blockedSites, setBlockedSites] = useState(() => loadBlockedSites());
  const [dailyStats, setDailyStats] = useState(() => loadDailyStats());

  const todayKey = getDateKey();
  const todayRecord = dailyStats[todayKey] || { sessions: 0, focusMinutes: 0, breaks: 0 };
  const todayStats = useMemo(() => ({
    completedSessions: todayRecord.sessions || 0,
    totalFocusTime: todayRecord.focusMinutes || 0,
    breaksCompleted: todayRecord.breaks || 0,
    currentStreak: calculateStreak(dailyStats),
  }), [dailyStats, todayRecord.sessions, todayRecord.focusMinutes, todayRecord.breaks]);

  const weeklyData = useMemo(() => buildWeeklyData(dailyStats), [dailyStats]);

  useEffect(() => {
    saveBlockedSites(blockedSites);
  }, [blockedSites]);

  const updateDailyStats = useCallback((delta) => {
    setDailyStats((prev) => {
      const key = getDateKey();
      const current = prev[key] || { sessions: 0, focusMinutes: 0, breaks: 0 };
      const updated = {
        sessions: current.sessions + (delta.sessions || 0),
        focusMinutes: current.focusMinutes + (delta.focusMinutes || 0),
        breaks: current.breaks + (delta.breaks || 0),
      };
      const next = { ...prev, [key]: updated };
      saveDailyStats(next);
      return next;
    });
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval = null;
    
    if (isActive && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, timeRemaining]);

  const handleTimerComplete = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    
    if (currentPhase === 'focus') {
      updateDailyStats({
        sessions: 1,
        focusMinutes: Math.round(totalTime / 60),
      });
      
      // Determine next phase
      if (sessionCount % settings?.sessionsUntilLongBreak === 0) {
        setCurrentPhase('longBreak');
        setTotalTime(settings?.longBreakDuration * 60);
        setTimeRemaining(settings?.longBreakDuration * 60);
      } else {
        setCurrentPhase('shortBreak');
        setTotalTime(settings?.shortBreakDuration * 60);
        setTimeRemaining(settings?.shortBreakDuration * 60);
      }
    } else {
      updateDailyStats({ breaks: 1 });
      // Break completed, start next focus session
      setCurrentPhase('focus');
      setSessionCount(prev => prev + 1);
      setTotalTime(settings?.focusDuration * 60);
      setTimeRemaining(settings?.focusDuration * 60);
    }

    // Play notification sound (in real app)
    // showNotification();
  }, [currentPhase, sessionCount, settings]);

  const handleStart = (customDuration = null) => {
    if (customDuration) {
      setTimeRemaining(customDuration);
      setTotalTime(customDuration);
      setCurrentPhase(customDuration <= 15 * 60 ? 'shortBreak' : 'focus');
    }
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    
    const duration = currentPhase === 'focus' 
      ? settings?.focusDuration * 60
      : currentPhase === 'shortBreak'
        ? settings?.shortBreakDuration * 60
        : settings?.longBreakDuration * 60;
    
    setTimeRemaining(duration);
    setTotalTime(duration);
  };

  const handleSkip = () => {
    setTimeRemaining(0);
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    
    // Update current timer if not active
    if (!isActive) {
      const duration = currentPhase === 'focus' 
        ? newSettings?.focusDuration * 60
        : currentPhase === 'shortBreak'
          ? newSettings?.shortBreakDuration * 60
          : newSettings?.longBreakDuration * 60;
      
      setTimeRemaining(duration);
      setTotalTime(duration);
    }
  };

  const tabs = [
    { id: 'timer', label: 'Timer', icon: 'Timer' },
    { id: 'settings', label: 'Settings', icon: 'Settings' },
    { id: 'insights', label: 'Insights', icon: 'TrendingUp' },
    { id: 'blocker', label: 'Website Blocker', icon: 'Shield' }
  ];

  // Check for quick start parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams?.get('quick') === 'true') {
      handleStart();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                <Icon name="Timer" size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-semibold text-foreground">
                  Pomodoro Timer
                </h1>
                <p className="text-sm font-caption text-muted-foreground">
                  Focus sessions with smart break management
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Icon name="Target" size={16} className="text-primary" />
                <span className="text-sm font-mono text-foreground">
                  {todayStats.completedSessions} sessions today
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="Clock" size={16} className="text-secondary" />
                <span className="text-sm font-mono text-foreground">
                  {Math.round(todayStats.totalFocusTime)}m focused
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Tab Navigation */}
      <div className="bg-card/30 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-4">
            {tabs?.map((tab) => (
              <button
                key={tab?.id}
                onClick={() => setActiveTab(tab?.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 ${
                  activeTab === tab?.id
                    ? 'bg-primary text-primary-foreground shadow-organic'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon name={tab?.icon} size={16} />
                <span>{tab?.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'timer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Timer Section */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-2xl p-8 shadow-organic">
                <TimerDisplay
                  timeRemaining={timeRemaining}
                  totalTime={totalTime}
                  currentPhase={currentPhase}
                  sessionCount={sessionCount}
                  isActive={isActive}
                  isPaused={isPaused}
                />
                
                <div className="mt-8">
                  <TimerControls
                    isActive={isActive}
                    isPaused={isPaused}
                    onStart={handleStart}
                    onPause={handlePause}
                    onReset={handleReset}
                    onSkip={handleSkip}
                    currentPhase={currentPhase}
                  />
                </div>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Session Progress */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-organic">
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4">
                  Session Progress
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body text-muted-foreground">
                      Completed Today
                    </span>
                    <span className="text-lg font-mono font-bold text-primary">
                      {todayStats.completedSessions}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body text-muted-foreground">
                      Current Session
                    </span>
                    <span className="text-lg font-mono font-bold text-foreground">
                      {sessionCount}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body text-muted-foreground">
                      Next Long Break
                    </span>
                    <span className="text-lg font-mono font-bold text-accent">
                      {settings?.sessionsUntilLongBreak - (sessionCount % settings?.sessionsUntilLongBreak)} sessions
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-organic">
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4">
                  Quick Actions
                </h3>
                
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="Coffee"
                    iconPosition="left"
                    onClick={() => navigate('/break-session')}
                    className="justify-start"
                  >
                    Take a Break
                  </Button>
                  
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="Flower2"
                    iconPosition="left"
                    onClick={() => navigate('/virtual-garden')}
                    className="justify-start"
                  >
                    View Garden
                  </Button>
                  
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="BarChart3"
                    iconPosition="left"
                    onClick={() => setActiveTab('insights')}
                    className="justify-start"
                  >
                    View Insights
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-organic">
              <SessionConfiguration
                settings={settings}
                onSettingsChange={handleSettingsChange}
                isActive={isActive}
              />
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-organic">
              <ProductivityInsights
                todayStats={todayStats}
                weeklyData={weeklyData}
              />
            </div>
          </div>
        )}

        {activeTab === 'blocker' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-organic">
              <WebsiteBlocker
                isEnabled={isWebsiteBlockerEnabled}
                onToggle={() => setIsWebsiteBlockerEnabled(!isWebsiteBlockerEnabled)}
                blockedSites={blockedSites}
                onSitesChange={setBlockedSites}
              />
            </div>
          </div>
        )}
      </div>
      {/* Floating Status */}
      {isActive && (
        <div className="fixed bottom-6 left-6 z-40 bg-card/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-organic-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full animate-gentle-pulse ${
              currentPhase === 'focus' ? 'bg-primary' : 'bg-secondary'
            }`}></div>
            <span className="text-sm font-body text-foreground">
              {currentPhase === 'focus' ? 'Focus Session' : 'Break Time'} Active
            </span>
            <span className="text-sm font-mono text-muted-foreground">
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60)?.toString()?.padStart(2, '0')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;