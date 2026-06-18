"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Calendar, Users, GraduationCap, ArrowRight, Sparkles, Moon, Activity, HeartPulse, Palette } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ProfileSetupProps {
  email: string;
  onComplete: (profile: ProfileData) => void;
}

export interface ProfileData {
  name: string;
  age: number;
  gender: string;
  schoolGrade: string;
  sleepHours: number;
  exerciseHours: number;
  stressLevel: number;
  hobby: string;
  peakUsageTime: string;
  sessionStyle: string;
}

export default function ProfileSetup({ email, onComplete }: ProfileSetupProps) {
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    schoolGrade: "",
    sleepHours: "",
    exerciseHours: "",
    stressLevel: "5",
    hobby: "",
    peakUsageTime: "",
    sessionStyle: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const profileDb = {
        id: user.id,
        email: email,
        name: form.name,
        age: parseInt(form.age),
        gender: form.gender,
        school_grade: form.schoolGrade,
        sleep_hours: parseFloat(form.sleepHours),
        exercise_hours: parseFloat(form.exerciseHours),
        stress_level: parseInt(form.stressLevel),
        hobby: form.hobby,
        peak_usage_time: form.peakUsageTime,
        session_style: form.sessionStyle,
      };

      const { error } = await supabase.from('profiles').insert(profileDb);
      if (error) throw error;

      onComplete({
        name: form.name,
        age: parseInt(form.age),
        gender: form.gender,
        schoolGrade: form.schoolGrade,
        sleepHours: parseFloat(form.sleepHours),
        exerciseHours: parseFloat(form.exerciseHours),
        stressLevel: parseInt(form.stressLevel),
        hobby: form.hobby,
        peakUsageTime: form.peakUsageTime,
        sessionStyle: form.sessionStyle,
      });
    } catch (err: any) {
      console.error("Error saving profile:", err.message);
    } finally {
      setSaving(false);
    }
  };

  const filledCount = [form.name, form.age, form.gender, form.schoolGrade, form.sleepHours, form.exerciseHours, form.stressLevel, form.hobby, form.peakUsageTime, form.sessionStyle].filter(Boolean).length;

  return (
    <div className="profile-screen">
      <div className="auth-bg-glow" />

      <motion.div
        className="profile-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="profile-header">
          <motion.div
            className="profile-icon"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={28} />
          </motion.div>
          <h1 className="profile-title">Complete Your Profile</h1>
          <p className="profile-subtitle">
            We need a few details to personalize your experience. This is a one-time setup.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="progress-track">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${(filledCount / 10) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="progress-label">{filledCount} of 10 fields completed</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="profile-form">
          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <User size={16} className="input-icon" />
            <input
              type="text"
              required
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="auth-input"
            />
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Calendar size={16} className="input-icon" />
            <input
              type="number"
              required
              min={5}
              max={100}
              placeholder="Age"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="auth-input"
            />
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Users size={16} className="input-icon" />
            <select
              required
              aria-label="Gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="auth-input auth-select"
            >
              <option value="" disabled>Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GraduationCap size={16} className="input-icon" />
            <select
              required
              aria-label="School Grade"
              value={form.schoolGrade}
              onChange={(e) => setForm({ ...form, schoolGrade: e.target.value })}
              className="auth-input auth-select"
            >
              <option value="" disabled>Select School Grade</option>
              <option value="7th">7th Grade</option>
              <option value="8th">8th Grade</option>
              <option value="9th">9th Grade</option>
              <option value="10th">10th Grade</option>
              <option value="11th">11th Grade</option>
              <option value="12th">12th Grade</option>
              <option value="College">College / University</option>
            </select>
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Moon size={16} className="input-icon" />
            <input
              type="number"
              required
              min={0}
              max={24}
              step={0.5}
              placeholder="Average Sleep (Hours)"
              value={form.sleepHours}
              onChange={(e) => setForm({ ...form, sleepHours: e.target.value })}
              className="auth-input"
            />
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Activity size={16} className="input-icon" />
            <input
              type="number"
              required
              min={0}
              max={24}
              step={0.5}
              placeholder="Daily Exercise (Hours)"
              value={form.exerciseHours}
              onChange={(e) => setForm({ ...form, exerciseHours: e.target.value })}
              className="auth-input"
            />
          </motion.div>

          <motion.div
            className="input-group profile-stress-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="profile-stress-header">
              <HeartPulse size={16} />
              <span>Stress & Anxiety Level: {form.stressLevel}/10</span>
            </div>
            <input
              type="range"
              required
              min={1}
              max={10}
              value={form.stressLevel}
              onChange={(e) => setForm({ ...form, stressLevel: e.target.value })}
              className="profile-stress-input"
              aria-label="Stress & Anxiety Level"
              title="Stress & Anxiety Level"
            />
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Palette size={16} className="input-icon" />
            <input
              type="text"
              required
              placeholder="Your Favorite Hobby"
              value={form.hobby}
              onChange={(e) => setForm({ ...form, hobby: e.target.value })}
              className="auth-input"
            />
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
          >
            <Activity size={16} className="input-icon" />
            <select
              required
              aria-label="Peak Usage Time"
              value={form.peakUsageTime}
              onChange={(e) => setForm({ ...form, peakUsageTime: e.target.value })}
              className="auth-input auth-select"
            >
              <option value="" disabled>Peak Usage Time</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Night">Night</option>
            </select>
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Activity size={16} className="input-icon" />
            <select
              required
              aria-label="Session Style"
              value={form.sessionStyle}
              onChange={(e) => setForm({ ...form, sessionStyle: e.target.value })}
              className="auth-input auth-select"
            >
              <option value="" disabled>Usual Session Style</option>
              <option value="Long Sessions">Long uninterrupted sessions</option>
              <option value="Frequent Short Checks">Frequent short checks</option>
            </select>
          </motion.div>

          <motion.button
            type="submit"
            className="auth-submit"
            disabled={saving || filledCount < 10}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
          >
            {saving ? (
              <motion.div
                className="spinner"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <>
                Start Monitoring
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
