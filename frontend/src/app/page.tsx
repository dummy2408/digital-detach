"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AuthScreen from "./components/AuthScreen";
import ProfileSetup, { type ProfileData } from "./components/ProfileSetup";
import Dashboard from "./components/Dashboard";
import { supabase } from "@/lib/supabase";

type AppView = "loading" | "auth" | "profile_setup" | "dashboard";

export default function Home() {
  const [view, setView] = useState<AppView>("loading");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);

  /* ─── Restore session from Supabase on mount ──────── */
  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (user: any) => {
      setEmail(user.email || "");
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (!mounted) return;

      if (error || !data) {
        setView("profile_setup");
      } else {
        setProfile({
          name: data.name,
          age: data.age,
          gender: data.gender,
          schoolGrade: data.school_grade,
          sleepHours: data.sleep_hours,
          exerciseHours: data.exercise_hours,
          stressLevel: data.stress_level,
          hobby: data.hobby
        });
        setView("dashboard");
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
        setView("auth");
      } else {
        fetchProfile(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        setView("auth");
        setEmail("");
        setProfile(null);
      } else {
        fetchProfile(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuth = (userEmail: string) => {
    // Auth state change listener handles this automatically
  };

  const handleProfileComplete = (p: ProfileData) => {
    setProfile(p);
    setView("dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

    if (view === "loading") {
    return (
      <div className="auth-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="auth-loading-container"
        >
          <motion.div
            className="spinner auth-loading-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
          <span className="loading-text">Loading...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {view === "auth" && (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AuthScreen onAuth={handleAuth} />
        </motion.div>
      )}

      {view === "profile_setup" && (
        <motion.div
          key="profile"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ProfileSetup email={email} onComplete={handleProfileComplete} />
        </motion.div>
      )}

      {view === "dashboard" && profile && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ minHeight: "100vh", overflowX: "hidden", width: "100%" }}
        >
          <Dashboard email={email} profile={profile} onLogout={handleLogout} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
