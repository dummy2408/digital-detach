"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ArrowLeft, Activity, Loader2 } from "lucide-react";
import Link from "next/link";
import "../globals.css";
import { supabase } from "@/lib/supabase";

interface HistoryEntry {
  date: string;
  riskLevel: string;
  confidence: number;
  dailyUsage: number;
  phoneChecks: number;
  timeOnGaming: number;
  timeOnSocialMedia: number;
  timeOnEducation: number;
  appsUsed: number;
  persona?: { emoji: string; title: string; desc: string; color: string };
  recommendations?: string[];
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [userName, setUserName] = useState<string>("User");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    
    async function fetchHistoryAndProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/";
        return;
      }

      const [{ data: profile }, { data: historyData }] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).single(),
        supabase.from('history').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
      ]);

      if (!mounted) return;

      if (profile) setUserName(profile.name);
      
      if (historyData) {
        const formattedHistory = historyData.map((row: any) => ({
          date: row.date,
          riskLevel: row.risk_level,
          confidence: row.confidence,
          dailyUsage: row.daily_usage,
          phoneChecks: row.phone_checks,
          timeOnGaming: row.time_on_gaming,
          timeOnSocialMedia: row.time_on_social_media,
          timeOnEducation: row.time_on_education,
          appsUsed: row.apps_used,
          persona: row.persona,
          recommendations: row.recommendations,
        }));
        setHistory(formattedHistory);
      }
      if (mounted) setLoading(false);
    }

    fetchHistoryAndProfile();

    return () => { mounted = false; };
  }, []);

  const numSubmissions = history.length;
  const avgDaily = numSubmissions ? (history.reduce((sum, h) => sum + (h.dailyUsage || 0), 0) / numSubmissions) : 0;
  const avgSocial = numSubmissions ? (history.reduce((sum, h) => sum + (h.timeOnSocialMedia || 0), 0) / numSubmissions) : 0;
  const avgGaming = numSubmissions ? (history.reduce((sum, h) => sum + (h.timeOnGaming || 0), 0) / numSubmissions) : 0;
  const avgEdu = numSubmissions ? (history.reduce((sum, h) => sum + (h.timeOnEducation || 0), 0) / numSubmissions) : 0;

  return (
    <div className="dashboard history-page">
      
      <nav className="dash-nav">
        <div className="dash-nav-brand">
          <Sparkles size={20} className="dash-nav-icon" />
          <span className="dash-nav-title">Digital Detach</span>
        </div>
        <div className="dash-nav-right">
          <Link href="/" className="dash-nav-btn">
            <ArrowLeft size={16} className="inline mr-1.5" />
            Back to Dashboard
          </Link>
          <span className="dash-nav-user">{userName}</span>
        </div>
      </nav>

      <div className="history-content">
        <h1 className="history-title page-title-gradient text-4xl mb-3 leading-tight">Your History & Stats</h1>
        <p className="history-subtitle">
          Averages across your {history.length} submission{history.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div className="metric-card metric-card-empty metric-card-empty-full flex flex-col justify-center items-center py-16">
            <Loader2 size={32} className="spin text-[var(--accent-amber)] mb-4" />
            <h3 className="dash-section-title">Loading History...</h3>
          </div>
        ) : numSubmissions > 0 ? (
          <>
            <div className="metrics-grid history-metrics">
              <div className="metric-card">
                <span className="metric-label">Daily Usage</span>
                <span className="metric-value">{avgDaily.toFixed(1)}h</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Social Media</span>
                <span className="metric-value">{avgSocial.toFixed(1)}h</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Education</span>
                <span className="metric-value">{avgEdu.toFixed(1)}h</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Gaming/Media</span>
                <span className="metric-value">{avgGaming.toFixed(1)}h</span>
              </div>
              <div className="metric-card metric-card-total">
                <span className="metric-label">Total Submissions</span>
                <span className="metric-value">{history.length}</span>
              </div>
            </div>

            {history.length > 0 && history[history.length - 1].persona && (
              <div className="dash-section bg-[var(--bg-input)] p-6 rounded-2xl mb-8">
                <div className="flex items-center gap-3 mb-2">
                  {history[history.length - 1].persona?.color && (
                    <style>{`.dynamic-persona-title { color: ${history[history.length - 1].persona?.color}; }`}</style>
                  )}
                  <span className="text-3xl leading-none">{history[history.length - 1].persona?.emoji}</span>
                  <h2 className="text-lg font-semibold m-0 dynamic-persona-title">
                    {history[history.length - 1].persona?.title}
                  </h2>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                  {history[history.length - 1].persona?.desc}
                </p>
                {history[history.length - 1].recommendations && history[history.length - 1].recommendations!.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">Key Recommendations</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {history[history.length - 1].recommendations!.slice(0, 2).join(" ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="dash-section">
              <h2 className="dash-section-title">Past Submissions</h2>
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Daily Usage</th>
                      <th>Social Media</th>
                      <th>Gaming</th>
                      <th>Education</th>
                      <th>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice().reverse().map((entry, i) => (
                      <tr key={`${entry.date}-${i}`}>
                        <td>{entry.date}</td>
                        <td>{entry.dailyUsage}h</td>
                        <td>{entry.timeOnSocialMedia}h</td>
                        <td>{entry.timeOnGaming}h</td>
                        <td>{entry.timeOnEducation}h</td>
                        <td>
                          <span className={`risk-badge ${
                            entry.riskLevel === "HIGH RISK" ? "risk-badge-high" :
                            entry.riskLevel === "MODERATE RISK" ? "risk-badge-moderate" : "risk-badge-low"
                          }`}>
                            {entry.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="metric-card metric-card-empty metric-card-empty-full">
            <Activity size={32} className="metric-card-empty-icon" />
            <h3 className="dash-section-title">No History Yet</h3>
            <p className="metric-card-empty-text">Submit your first entry on the dashboard to see your stats over time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
