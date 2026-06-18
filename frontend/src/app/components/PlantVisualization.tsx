"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import "./PlantVisualization.css";

interface LeafType {
  id: string | number;
  x: number;
  y: number;
  d: string;
  vein: string;
  delay: number;
  rotation?: number;
  spots?: { cx: number; cy: number; r: number }[];
  flower?: { x: number; y: number; tipX?: number; tipY?: number; pedicelPath?: string; scale?: number; rotation?: number };
}

interface ParticleType {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  randomX: number;
}

interface PlantProps {
  history: Array<{ date: string; riskLevel: string; confidence: number; dailyUsage?: number; timeOnSocialMedia?: number; phoneChecks?: number; riskScoreContinuous?: number; helpfulRecs?: string[] }>;
  persona?: { emoji: string; title: string; desc: string; color: string } | null;
}

interface StageConfig {
  stem: string;
  glow: string;
  particleColor: string;
  particleType: string;
  gradientId: string;
  stemColor: string;
  stemWidth?: number;
  nodeColor?: string;
  leafStroke?: string;
  veinColor?: string;
  cardBorder: string;
  cardGlow: string;
  leaves: LeafType[];
  label?: string;
  labelColor?: string;
}

const STAGE_DEFINITIONS: Record<string, StageConfig> = {
  "SEED": {
    stem: "M 250 700 L 250 580",
    glow: "transparent",
    particleColor: "#F5A623",
    particleType: "none",
    gradientId: "leafHealth",
    stemColor: "#166534",
    stemWidth: 6,
    nodeColor: "#0f4a24",
    leafStroke: "#166534",
    veinColor: "rgba(255,255,255,0.25)",
    cardBorder: "transparent",
    cardGlow: "none",
    leaves: [
      { id: 1, x: 250, y: 580, d: "M 0 0 C -20 -15, -40 -20, -50 10 C -30 20, -10 10, 0 0 Z", vein: "M 0 0 Q -25 -5 -45 5", delay: 0.2 },
      { id: 2, x: 250, y: 580, d: "M 0 0 C 20 -15, 40 -20, 50 10 C 30 20, 10 10, 0 0 Z", vein: "M 0 0 Q 25 -5 45 5", delay: 0.4 },
    ],
    label: "SEED 🌱",
    labelColor: "#7CB87C",
  },
  "SPROUT": {
    stem: "M 250 700 Q 240 580 250 460",
    glow: "rgba(245, 166, 35, 0.1)",
    particleColor: "#F5A623",
    particleType: "sparkle",
    gradientId: "leafHealth",
    stemColor: "#166534",
    stemWidth: 8,
    nodeColor: "#0f4a24",
    leafStroke: "#166534",
    veinColor: "rgba(255,255,255,0.25)",
    cardBorder: "transparent",
    cardGlow: "none",
    leaves: [
      { id: 1, x: 245, y: 580, d: "M 0 0 C -30 -20, -60 -30, -80 15 C -50 25, -20 15, 0 0 Z", vein: "M 0 0 Q -40 -10 -75 10", delay: 0.2 },
      { id: 2, x: 247, y: 520, d: "M 0 0 C 30 -20, 60 -30, 80 15 C 50 25, 20 15, 0 0 Z", vein: "M 0 0 Q 40 -10 75 10", delay: 0.4 },
      { id: 3, x: 250, y: 460, d: "M 0 0 C -25 -15, -40 -20, -50 10 C -30 20, -10 10, 0 0 Z", vein: "M 0 0 Q -25 -5 -45 5", delay: 0.6 },
      { id: 4, x: 250, y: 460, d: "M 0 0 C 25 -15, 40 -20, 50 10 C 30 20, 10 10, 0 0 Z", vein: "M 0 0 Q 25 -5 45 5", delay: 0.8 },
    ],
    label: "SPROUT 🌿",
    labelColor: "#7CB87C",
  },
  "GROWING": {
    stem: "M 250 700 Q 230 500 250 300",
    glow: "rgba(245, 166, 35, 0.2)",
    particleColor: "#F5A623",
    particleType: "sparkle",
    gradientId: "leafHealth",
    stemColor: "#166534",
    stemWidth: 10,
    nodeColor: "#0f4a24",
    leafStroke: "#166534",
    veinColor: "rgba(255,255,255,0.25)",
    cardBorder: "transparent",
    cardGlow: "none",
    leaves: [
      { id: 1, x: 242, y: 566, d: "M 0 0 C -40 -30, -90 -40, -130 -20 C -100 15, -40 25, 0 0 Z", vein: "M 0 0 Q -60 -15 -125 -20", delay: 0.2 },
      { id: 2, x: 236, y: 468, d: "M 0 0 C 40 -30, 90 -40, 130 -20 C 100 15, 40 25, 0 0 Z", vein: "M 0 0 Q 60 -15 125 -20", delay: 0.4 },
      { id: 3, x: 242, y: 400, d: "M 0 0 C -30 -25, -70 -35, -100 -15 C -75 10, -30 20, 0 0 Z", vein: "M 0 0 Q -50 -10 -95 -15", delay: 0.6 },
      { id: 4, x: 248, y: 340, d: "M 0 0 C 30 -25, 70 -35, 100 -15 C 75 10, 30 20, 0 0 Z", vein: "M 0 0 Q 50 -10 95 -15", delay: 0.8 },
      { id: 5, x: 250, y: 300, d: "M 0 0 C -25 -20, -50 -30, -70 -10 C -50 10, -20 15, 0 0 Z", vein: "M 0 0 Q -35 -10 -65 -10", delay: 1.0 },
      { id: 6, x: 250, y: 300, d: "M 0 0 C 25 -20, 50 -30, 70 -10 C 50 10, 20 15, 0 0 Z", vein: "M 0 0 Q 35 -10 65 -10", delay: 1.2 },
    ],
    label: "GROWING 🪴",
    labelColor: "#7CB87C",
  },
  "THRIVING": {
    stem: "M 250 700 Q 230 400 250 150",
    glow: "rgba(245, 166, 35, 0.3)",
    particleColor: "#F5A623",
    particleType: "sparkle",
    gradientId: "leafHealth",
    stemColor: "#166534",
    stemWidth: 14,
    nodeColor: "#0f4a24",
    leafStroke: "#166534",
    veinColor: "rgba(255,255,255,0.25)",
    cardBorder: "transparent",
    cardGlow: "none",
    leaves: [
      { id: 1, x: 243, y: 582, d: "M 0 0 C -40 -30, -90 -40, -130 -20 C -100 15, -40 25, 0 0 Z", vein: "M 0 0 Q -60 -15 -125 -20", delay: 0.2 },
      { id: 2, x: 240, y: 468, d: "M 0 0 C 40 -30, 90 -40, 130 -20 C 100 15, 40 25, 0 0 Z", vein: "M 0 0 Q 60 -15 125 -20", delay: 0.4 },
      { id: 3, x: 240, y: 358, d: "M 0 0 C -35 -35, -80 -50, -110 -30 C -85 10, -35 20, 0 0 Z", vein: "M 0 0 Q -55 -20 -105 -30", delay: 0.6 },
      { id: 4, x: 244, y: 252, d: "M 0 0 C 35 -35, 80 -50, 110 -30 C 85 10, 35 20, 0 0 Z", vein: "M 0 0 Q 55 -20 105 -30", delay: 0.8 },
      { id: 5, x: 250, y: 150, d: "M 0 0 C -25 -50, 25 -100, 0 -140 C 25 -100, -25 -50, 0 0 Z", vein: "M 0 0 Q 5 -70 0 -135", delay: 1.0 },
    ],
    label: "THRIVING 🌳",
    labelColor: "#7CB87C",
  },
  "FLOURISHING": {
    stem: "M 250 700 Q 230 400 250 150",
    glow: "rgba(245, 166, 35, 0.4)",
    particleColor: "#F5A623",
    particleType: "flourish",
    gradientId: "leafHealth",
    stemColor: "#166534",
    stemWidth: 14,
    nodeColor: "#0f4a24",
    leafStroke: "#166534",
    veinColor: "rgba(255,255,255,0.25)",
    cardBorder: "transparent",
    cardGlow: "none",
    leaves: [
      { id: 1, x: 243, y: 582, d: "M 0 0 C -40 -30, -90 -40, -130 -20 C -100 15, -40 25, 0 0 Z", vein: "M 0 0 Q -60 -15 -125 -20", delay: 0.2 },
      { id: 2, x: 240, y: 468, d: "M 0 0 C 40 -30, 90 -40, 130 -20 C 100 15, 40 25, 0 0 Z", vein: "M 0 0 Q 60 -15 125 -20", delay: 0.4 },
      { id: 3, x: 240, y: 358, d: "M 0 0 C -35 -35, -80 -50, -110 -30 C -85 10, -35 20, 0 0 Z", vein: "M 0 0 Q -55 -20 -105 -30", delay: 0.6, flower: {x: -80, y: 40, scale: 1.25, rotation: -60} },
      { id: 4, x: 244, y: 252, d: "M 0 0 C 35 -35, 80 -50, 110 -30 C 85 10, 35 20, 0 0 Z", vein: "M 0 0 Q 55 -20 105 -30", delay: 0.8, flower: {x: 80, y: 40, scale: 1.35, rotation: 60} },
    ],
    label: "FLOURISHING 🌸",
    labelColor: "#F5A623",
  },
  "STRESSED": {
    stem: "M 250 700 Q 240 580 250 460",
    glow: "rgba(217, 142, 63, 0.2)",
    particleColor: "#D98E3F",
    particleType: "none",
    gradientId: "leafMod",
    stemColor: "#D98E3F",
    stemWidth: 8,
    nodeColor: "#A56327",
    leafStroke: "#A56327",
    veinColor: "rgba(255,255,255,0.25)",
    cardBorder: "transparent",
    cardGlow: "none",
    leaves: [
      { id: 1, x: 245, y: 580, d: "M 0 0 C -30 -20, -60 -30, -80 15 C -50 25, -20 15, 0 0 Z", vein: "M 0 0 Q -40 -10 -75 10", rotation: -15, delay: 0.2 },
      { id: 2, x: 247, y: 520, d: "M 0 0 C 30 -20, 60 -30, 80 15 C 50 25, 20 15, 0 0 Z", vein: "M 0 0 Q 40 -10 75 10", rotation: 20, delay: 0.4 },
      { id: 3, x: 250, y: 460, d: "M 0 0 C -25 -15, -40 -20, -50 10 C -30 20, -10 10, 0 0 Z", vein: "M 0 0 Q -25 -5 -45 5", rotation: -25, delay: 0.6 },
      { id: 4, x: 250, y: 460, d: "M 0 0 C 25 -15, 40 -20, 50 10 C 30 20, 10 10, 0 0 Z", vein: "M 0 0 Q 25 -5 45 5", rotation: 30, delay: 0.8 },
    ],
    label: "STRESSED 🍂",
    labelColor: "#D98E3F",
  },
  "WILTING": {
    stem: "M 250 700 Q 270 500 240 300 Q 210 100 150 250",
    glow: "rgba(199, 84, 80, 0.4)",
    particleColor: "#C75450",
    particleType: "spores",
    gradientId: "leafWilt",
    stemColor: "#C75450",
    stemWidth: 6,
    nodeColor: "#3D0000",
    leafStroke: "#5C0000",
    veinColor: "#C0392B",
    cardBorder: "transparent",
    cardGlow: "none",
    leaves: [
      { id: 1, x: 258, y: 565, d: "M 0 0 C -25 -20, -60 -10, -80 60 C -50 50, -15 20, 0 0 Z", vein: "M 0 0 C -15 -5, -50 0, -70 50", delay: 0.2, spots: [{cx: -20, cy: 10, r: 2}, {cx: -40, cy: 30, r: 1.5}] },
      { id: 2, x: 258, y: 565, d: "M 0 0 C 25 -20, 60 -10, 80 60 C 50 50, 15 20, 0 0 Z", vein: "M 0 0 C 15 -5, 50 0, 70 50", delay: 0.3 },
      { id: 3, x: 254, y: 430, d: "M 0 0 C -20 -15, -50 -5, -65 50 C -40 40, -10 15, 0 0 Z", vein: "M 0 0 C -10 -5, -40 0, -55 40", delay: 0.5, spots: [{cx: -30, cy: 20, r: 2}] },
      { id: 4, x: 254, y: 430, d: "M 0 0 C 20 -15, 50 -5, 65 50 C 40 40, 10 15, 0 0 Z", vein: "M 0 0 C 10 -5, 40 0, 55 40", delay: 0.6 },
      { id: 5, x: 150, y: 250, d: "M 0 0 C -15 -10, -40 5, -30 60 C -15 45, 5 20, 0 0 Z", vein: "M 0 0 C -5 0, -20 15, -25 50", delay: 0.8, spots: [{cx: -15, cy: 25, r: 1}] },
    ],
    label: "WILTING 🥀",
    labelColor: "#C75450",
  },
  "CRITICAL": {
    stem: "M 250 700 Q 260 550 240 450",
    glow: "rgba(199, 84, 80, 0.6)",
    particleColor: "#C75450",
    particleType: "smoke",
    gradientId: "leafWilt",
    stemColor: "#330000",
    stemWidth: 3,
    nodeColor: "#220000",
    leafStroke: "#330000",
    veinColor: "#110000",
    cardBorder: "transparent",
    cardGlow: "none",
    leaves: [
      { id: 1, x: 256, y: 600, d: "M 0 0 C -15 -10, -30 -5, -35 30 C -20 25, -5 10, 0 0 Z", vein: "M 0 0 C -10 -5, -20 0, -30 25", delay: 0.2, spots: [{cx: -10, cy: 5, r: 2}, {cx: -20, cy: 15, r: 3}] },
      { id: 2, x: 248, y: 450, d: "M 0 0 C 10 -5, 20 0, 25 20 C 15 15, 5 5, 0 0 Z", vein: "M 0 0 C 5 0, 10 5, 20 15", delay: 0.4, spots: [{cx: 10, cy: 5, r: 1}] },
    ],
    label: "CRITICAL ☠️",
    labelColor: "#C75450",
  }
};
function calcProgress(val: number, target: number, isLessBetter: boolean = false) {
  if (isLessBetter) {
    if (val <= target) return 100;
    return Math.max(0, Math.min(100, (target / Math.max(val, 0.1)) * 100));
  } else {
    return Math.max(0, Math.min(100, (val / target) * 100));
  }
}

export default function PlantVisualization({ history, persona }: PlantProps) {
  const { stageKey, progress, tooltip, isFrozen, deltaText } = useMemo(() => {
    const numSubmissions = history.length;
    
    if (numSubmissions === 0) {
      return { stageKey: "SEED", progress: 0, tooltip: "Submit your first data to plant the seed!", isFrozen: false, deltaText: "" };
    }

    let isFrozen = false;
    let deltaText = "";
    
    if (numSubmissions >= 2) {
      const latest = history[history.length - 1];
      const prev = history[history.length - 2];
      const latestScore = latest.riskScoreContinuous;
      const prevScore = prev.riskScoreContinuous;
      
      if (latestScore !== undefined && prevScore !== undefined && latestScore > 0 && prevScore > 0) {
        const delta = latestScore - prevScore;
        if (delta > 0.01) {
           isFrozen = true;
           deltaText = `Growth frozen (Risk increased by ${delta.toFixed(2)})`;
        } else if (delta < -0.01) {
           deltaText = `Growing faster! (Risk decreased by ${Math.abs(delta).toFixed(2)})`;
        } else {
           deltaText = `Maintaining steady risk score.`;
        }
      }
    }

    const avgDaily = history.reduce((sum, h) => sum + (h.dailyUsage || 0), 0) / numSubmissions;
    const avgSocial = history.reduce((sum, h) => sum + (h.timeOnSocialMedia || 0), 0) / numSubmissions;
    const avgChecks = history.reduce((sum, h) => sum + (h.phoneChecks || 0), 0) / numSubmissions;

    const engagementScore = history.reduce((sum, h) => sum + ((h.helpfulRecs || []).filter((r: string) => r.startsWith("Helpful:")).length), 0);
    
    let consecutiveStreak = 0;
    if (history.length > 0) {
      consecutiveStreak = 1;
      for (let i = history.length - 1; i > 0; i--) {
        const currDate = new Date(history[i].date);
        const prevDate = new Date(history[i-1].date);
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 1) {
          if (diffDays === 1) consecutiveStreak++;
        } else {
          break;
        }
      }
    }

    const engagementBonus = Math.min(20, engagementScore * 2); // 2% per engaged recommendation
    const streakBonus = Math.min(20, consecutiveStreak * 5); // 5% per day streak
    const getFinalProgress = (baseProgress: number) => isFrozen ? 0 : Math.min(100, baseProgress + engagementBonus + streakBonus);


    if (avgDaily > 10) {
      return { stageKey: "CRITICAL", progress: 0, tooltip: "Reduce average daily usage below 10h to recover.", isFrozen, deltaText };
    }
    if (avgDaily > 8) {
      return { stageKey: "WILTING", progress: 0, tooltip: "Reduce daily usage below 8h to recover.", isFrozen, deltaText };
    }
    if (avgDaily > 6) {
      return { stageKey: "STRESSED", progress: 0, tooltip: "Reduce daily usage below 6h to recover.", isFrozen, deltaText };
    }

    if (numSubmissions >= 30 && avgDaily < 4 && avgSocial < 2 && avgChecks < 50) {
      return { stageKey: "FLOURISHING", progress: 100, tooltip: "You have reached the maximum stage! Keep it up!", isFrozen: false, deltaText };
    }

    if (numSubmissions >= 14 && avgDaily < 4 && avgSocial < 2 && avgChecks < 50) {
      const p = (
        calcProgress(numSubmissions, 30) + 
        calcProgress(avgDaily, 4, true) + 
        calcProgress(avgSocial, 2, true) + 
        calcProgress(avgChecks, 50, true)
      ) / 4;
      const tt = numSubmissions < 30 ? `Submit ${30 - numSubmissions} more days to reach Flourishing.` : `Maintain healthy habits to reach Flourishing.`;
      return { stageKey: "THRIVING", progress: getFinalProgress(p), tooltip: tt, isFrozen, deltaText };
    }

    if (numSubmissions >= 7 && avgDaily < 5 && avgSocial < 3) {
      const p = (
        calcProgress(numSubmissions, 14) + 
        calcProgress(avgDaily, 4, true) + 
        calcProgress(avgSocial, 2, true) + 
        calcProgress(avgChecks, 50, true)
      ) / 4;
      const tt = numSubmissions < 14 ? `Submit ${14 - numSubmissions} more days to reach Thriving.` : `Improve averages to reach Thriving.`;
      return { stageKey: "GROWING", progress: getFinalProgress(p), tooltip: tt, isFrozen, deltaText };
    }

    if (numSubmissions >= 3 && avgDaily < 6) {
      const p = (
        calcProgress(numSubmissions, 7) + 
        calcProgress(avgDaily, 5, true) + 
        calcProgress(avgSocial, 3, true)
      ) / 3;
      const tt = numSubmissions < 7 ? `Submit ${7 - numSubmissions} more days to reach Growing.` : `Improve averages to reach Growing.`;
      return { stageKey: "SPROUT", progress: getFinalProgress(p), tooltip: tt, isFrozen, deltaText };
    }

    const p = (calcProgress(numSubmissions, 3) + calcProgress(avgDaily, 6, true)) / 2;
    const tt = numSubmissions < 3 ? `Submit ${3 - numSubmissions} more days to reach Sprout.` : `Reduce average daily usage below 6h to reach Sprout.`;
    return { stageKey: "SEED", progress: getFinalProgress(p), tooltip: tt, isFrozen, deltaText };
  }, [history]);

  const state = STAGE_DEFINITIONS[stageKey];

  const [particles, setParticles] = useState<ParticleType[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      if (!state || state.particleType === "none") {
        setParticles([]);
        return;
      }
      const count = state.particleType === "spores" ? 5 : 8;
      setParticles(Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        size: state.particleType === "spores" ? Math.random() * 3 + 2 : Math.random() * 6 + 3,
        duration: Math.random() * 4 + 4,
        delay: Math.random() * 3,
        randomX: (Math.random() - 0.5) * 150
      })));
    });
    return () => { mounted = false; };
  }, [state]);

  return (
    <div className="plant-container">
      <AnimatePresence mode="wait">
        {!state ? (
          <motion.div
            key="empty"
            className="plant-empty"
          >
            <div className="plant-empty-icon">🌱</div>
            <p className="plant-empty-text">Your 3D plant will grow here</p>
            <p className="plant-empty-sub">Upload a screenshot to begin</p>
          </motion.div>
        ) : (
          <motion.div
            key="plant"
            className="unified-plant-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ 
              border: `1px solid ${state.cardBorder}`,
              boxShadow: state.cardGlow
            }}
          >
            
            {persona && (
              <motion.div 
                className="persona-badge-header"
                style={{
                  borderBottom: `1px solid ${state.cardBorder}`,
                  background: `linear-gradient(180deg, ${persona.color}15, transparent)`
                }}
              >
                <div className="persona-badge-emoji">
                  {persona.emoji}
                </div>
                <div>
                  <h4 className="persona-badge-title">
                    {persona.title}
                  </h4>
                  <p className="persona-badge-desc">
                    {persona.desc}
                  </p>
                </div>
              </motion.div>
            )}

            <div className="plant-viz-area">
              
              <motion.div 
                className="plant-glow" 
                style={{ background: `radial-gradient(circle at 50% 80%, ${state.glow} 0%, transparent 60%)`, position: "absolute", inset: 0, zIndex: 0 }}
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />

              {state.particleType !== "none" && (
                <div className="plant-particles-container">
                  {particles.map((p) => (
                    <motion.div
                      key={p.id}
                      style={{
                        position: "absolute",
                        bottom: "10%",
                        left: `calc(50% + ${p.x}px)`,
                        width: p.size,
                        height: p.size,
                        borderRadius: "50%",
                        backgroundColor: state.particleColor,
                        boxShadow: `0 0 ${p.size * 2}px ${state.particleColor}`
                      }}
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ 
                        y: [0, -400],
                        x: [0, p.randomX],
                        opacity: [0, 0.9, 0],
                        scale: [0.5, 1.5, 0.5]
                      }}
                      transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                </div>
              )}

              <svg 
                viewBox="0 0 500 850" 
                className="plant-svg-container"
              >
                <defs>
                  <linearGradient id="cherryPetalBackGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#C43B5E" />
                    <stop offset="40%" stopColor="#E8A0B0" />
                    <stop offset="100%" stopColor="#F1C5D0" />
                  </linearGradient>
                  <linearGradient id="cherryPetalFrontGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#D14D70" />
                    <stop offset="40%" stopColor="#F8D7E0" />
                    <stop offset="100%" stopColor="#FDF0F3" />
                  </linearGradient>
                  <linearGradient id="potGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1e1e1e" />
                    <stop offset="50%" stopColor="#3a3a3a" />
                    <stop offset="100%" stopColor="#0f0f0f" />
                  </linearGradient>
                  <linearGradient id="leafHealth" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#14532d" />
                  </linearGradient>
                  <linearGradient id="leafMod" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#D98E3F" />
                    <stop offset="100%" stopColor="#A56327" />
                  </linearGradient>
                  <linearGradient id="leafWilt" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8B1515" />
                    <stop offset="100%" stopColor="#5C0000" />
                  </linearGradient>
                  <radialGradient id="soilGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1a0f08" />
                    <stop offset="100%" stopColor="#0a0502" />
                  </radialGradient>
                </defs>

                <motion.g
                  animate={{ rotate: [-1.5, 1.5, -1.5] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: "250px", originY: "700px" }}
                >
                  
                  <g transform="translate(150, 700)">
                    <ellipse cx="100" cy="15" rx="85" ry="10" fill="rgba(0,0,0,0.6)" filter="blur(6px)" />
                    <path d="M 15 10 L 35 90 C 35 105, 165 105, 165 90 L 185 10 Z" fill="url(#potGradient)" />
                    <ellipse cx="100" cy="10" rx="90" ry="18" fill="#222" />
                    <ellipse cx="100" cy="10" rx="80" ry="14" fill="url(#soilGradient)" />
                    <path d="M -5 10 C -5 30, 205 30, 205 10 C 205 13, -5 13, -5 10 Z" fill="#444" />
                  </g>

                  <motion.path 
                    d={state.stem} 
                    fill="none" 
                    stroke={state.stemColor} 
                    strokeWidth={state.stemWidth || 14} 
                    strokeLinecap="round" 
                    animate={{ d: state.stem, stroke: state.stemColor, strokeWidth: state.stemWidth || 14 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    style={{ filter: `drop-shadow(0px 0px 10px ${state.glow})` }}
                  />

                  {state.leaves.map((leaf: LeafType) => (
                    <motion.ellipse
                      key={`node-${leaf.id}`}
                      cx={leaf.x}
                      cy={leaf.y}
                      rx="7"
                      ry="5"
                      fill={state.nodeColor || state.stemColor}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: leaf.delay, duration: 0.5 }}
                      style={{ filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.4))" }}
                    />
                  ))}

                  {state.leaves.map((leaf: LeafType) => (
                    <motion.g
                      key={leaf.id}
                      initial={{ scale: 0, opacity: 0, rotate: 0 }}
                      animate={{ x: leaf.x, y: leaf.y, scale: 1, opacity: 1, rotate: leaf.rotation || 0 }}
                      transition={{ duration: 1.2, delay: leaf.delay, type: "spring", bounce: 0.3 }}
                      style={{ originX: 0, originY: 0 }}
                    >
                      <motion.g
                        animate={{ d: leaf.d }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                      >
                        
                        <motion.path 
                          animate={{ d: leaf.d }}
                          fill={`url(#${state.gradientId})`} 
                          stroke={state.leafStroke || state.stemColor} 
                          strokeWidth="1.5" 
                          className="leaf-shadow"
                          transition={{ duration: 2, ease: "easeInOut" }}
                        />
                        
                        <motion.path 
                          animate={{ d: leaf.vein }}
                          stroke={state.veinColor || "rgba(255,255,255,0.25)"} 
                          strokeWidth="1.5" 
                          fill="none" 
                          strokeLinecap="round" 
                          transition={{ duration: 2, ease: "easeInOut" }}
                        />

                        {leaf.spots && (
                          <g fill="#2d0a0a" opacity="0.6">
                            {leaf.spots.map((spot: { cx: number; cy: number; r: number }, i: number) => (
                              <circle key={i} cx={spot.cx} cy={spot.cy} r={spot.r} />
                            ))}
                          </g>
                        )}

                        {leaf.flower && (
                          <>
                            {/* Thin pedicel stalk connecting leaf tip to flower */}
                            {/* Straight pedicel stalk connecting stem to flower */}
                            <path 
                               d={`M 0 0 L ${leaf.flower.x} ${leaf.flower.y}`}
                               fill="none" 
                               stroke="#166534" 
                               strokeWidth="3" 
                               strokeLinecap="round" 
                            />
                            
                            <g transform={`translate(${leaf.flower.x}, ${leaf.flower.y}) rotate(${leaf.flower.rotation || 0}) scale(${leaf.flower.scale || 1})`}>
                              <motion.g
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: leaf.delay + 0.5, duration: 1, type: "spring", bounce: 0.4 }}
                              >
                                {/* Small green calyx base */}
                                <path d="M 0 0 L -6 8 L -2 6 L 0 12 L 2 6 L 6 8 Z" fill={state.stemColor} />
                                
                                <circle cx="0" cy="0" r="30" fill="rgba(255, 255, 255, 0.4)" filter="blur(6px)" />
                              
                              <g className="flower-shadow" transform={`rotate(${(leaf.id as number) === 3 ? -15 : (leaf.id as number) === 4 ? 25 : 5})`}>
                                {/* Back Petals */}
                                <g transform="rotate(144) scale(1.05, 0.95)">
                                  <path d="M 0 0 C -20 -12, -22 -30, -10 -38 Q -4 -35, 0 -32 Q 4 -35, 10 -38 C 22 -30, 20 -12, 0 0 Z" fill="url(#cherryPetalBackGrad)" />
                                </g>
                                <g transform="rotate(216) scale(0.95, 1.05)">
                                  <path d="M 0 0 C -20 -12, -22 -30, -10 -38 Q -4 -35, 0 -32 Q 4 -35, 10 -38 C 22 -30, 20 -12, 0 0 Z" fill="url(#cherryPetalBackGrad)" />
                                </g>
                                
                                {/* Front Petals */}
                                <g transform="rotate(72)">
                                  <path d="M 0 0 C -20 -12, -22 -30, -10 -38 Q -4 -35, 0 -32 Q 4 -35, 10 -38 C 22 -30, 20 -12, 0 0 Z" fill="url(#cherryPetalFrontGrad)" />
                                </g>
                                <g transform="rotate(288) scale(0.98, 1.02)">
                                  <path d="M 0 0 C -20 -12, -22 -30, -10 -38 Q -4 -35, 0 -32 Q 4 -35, 10 -38 C 22 -30, 20 -12, 0 0 Z" fill="url(#cherryPetalFrontGrad)" />
                                </g>
                                <g transform="rotate(0) scale(1.05)">
                                  <path d="M 0 0 C -20 -12, -22 -30, -10 -38 Q -4 -35, 0 -32 Q 4 -35, 10 -38 C 22 -30, 20 -12, 0 0 Z" fill="url(#cherryPetalFrontGrad)" />
                                </g>

                                {/* Center depth shadow */}
                                <circle cx="0" cy="0" r="6" fill="#A82A4B" filter="blur(2px)" opacity="0.8" />
                                
                                {/* Stamens */}
                                <g stroke="#EAB308" strokeWidth="0.7" fill="none">
                                  {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(angle => (
                                    <path key={`stamen-${angle}`} d="M 0 0 Q 4 -8, 0 -14" transform={`rotate(${angle})`} />
                                  ))}
                                </g>
                                <g fill="#FACC15">
                                  {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(angle => (
                                    <circle key={`anther-${angle}`} cx="0" cy="-14" r="1.5" transform={`rotate(${angle})`} />
                                  ))}
                                </g>
                              </g>
                            </motion.g>
                          </g>
                          </>
                        )}
                      </motion.g>
                    </motion.g>
                  ))}
                </motion.g>
              </svg>
            </div>

            <div className="plant-progress-bar-container" title={tooltip}>
              {["STRESSED", "WILTING", "CRITICAL", "FLOURISHING"].includes(stageKey) ? (
                <div className="plant-warning-container">
                  <div className={`plant-warning-label color-${stageKey} whitespace-nowrap flex items-center gap-1`}>
                    {state.label}
                  </div>
                  <div className="plant-warning-guidance">
                    {stageKey === "STRESSED" && "Reduce screen time to keep your plant healthy"}
                    {stageKey === "WILTING" && "Cut back on screen time before it's too late"}
                    {stageKey === "CRITICAL" && "Urgent: drastically reduce screen time to save your plant"}
                    {stageKey === "FLOURISHING" && "You've reached peak digital wellness"}
                  </div>
                </div>
              ) : (
                <>
                  <div className="plant-progress-label flex flex-row items-start justify-between w-full gap-4">
                    <span 
                      className={`plant-progress-label-text color-${stageKey} shrink-0 whitespace-nowrap flex items-center gap-1`}
                    >
                      {state.label}
                    </span>
                    {deltaText && (
                      <span className={`text-xs text-right leading-tight ${isFrozen ? "text-[var(--accent-red)] font-semibold" : "text-[var(--accent-green)]"}`}>
                        {deltaText}
                      </span>
                    )}
                  </div>
                  <div className="plant-progress-track">
                    <motion.div 
                      className={`plant-progress-fill ${stageKey === "STRESSED" || isFrozen ? "plant-progress-fill-red" : ""}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1 }}
                      style={{ filter: isFrozen ? 'grayscale(100%)' : 'none' }}
                    />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
