"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera, Loader2, CheckCircle2,
  Activity, Smartphone,
  LogOut, Sparkles, ThumbsUp
} from "lucide-react";
import Link from "next/link";
import PlantVisualization from "./PlantVisualization";
import { supabase } from "@/lib/supabase";
import type { ProfileData } from "./ProfileSetup";

interface DashboardProps {
  email: string;
  profile: ProfileData;
  onLogout: () => void;
}

type RiskLevel = "LOW RISK" | "MODERATE RISK" | "HIGH RISK";

interface HistoryEntry {
  id?: number;
  date: string;
  riskLevel: string;
  confidence: number;
  dailyUsage: number;
  phoneChecks?: number;
  timeOnGaming?: number;
  timeOnSocialMedia?: number;
  timeOnEducation?: number;
  appsUsed?: number;
  riskScoreContinuous?: number;
  clusterId?: number;
  persona?: any;
  shapFeatures?: string[];
  recommendations?: string[];
  helpfulRecs?: string[];
}

type Persona = { title: string; emoji: string; desc: string; color: string };



function getCumulativeRisk(history: HistoryEntry[]): RiskLevel | null {
  if (history.length === 0) return null;
  const counts = { "LOW RISK": 0, "MODERATE RISK": 0, "HIGH RISK": 0 };
  history.forEach(h => {
    if (h.riskLevel in counts) counts[h.riskLevel as RiskLevel]++;
  });

  if (counts["HIGH RISK"] >= counts["MODERATE RISK"] && counts["HIGH RISK"] >= counts["LOW RISK"]) return "HIGH RISK";
  if (counts["MODERATE RISK"] >= counts["LOW RISK"]) return "MODERATE RISK";
  return "LOW RISK";
}

export default function Dashboard({ email, profile, onLogout }: DashboardProps) {

  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state — fields from screenshot
  const [screenshotFields, setScreenshotFields] = useState({
    dailyUsageHours: "",
    timeOnSocialMedia: "",
    timeOnGaming: "",
    timeOnEducation: "",
  });

  const [currentHelpfulRecs, setCurrentHelpfulRecs] = useState<string[]>([]);

  // Prediction state
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<{
    risk_level: RiskLevel;
    confidence: number;
    risk_score_continuous?: number;
    cluster_id?: number;
    persona?: any;
    shap_features?: string[];
    recommendations?: string[];
    extracted_data: Record<string, string | number>;
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNumericInput = <T extends Record<string, string>>(
    val: string,
    field: keyof T,
    setter: React.Dispatch<React.SetStateAction<T>>,
    max: number = 24
  ) => {
    setErrors(prev => ({ ...prev, [field as string]: "" }));
    if (val === "") {
      setter((prev: T) => ({ ...prev, [field]: "" as T[keyof T] }));
      return;
    }
    if (val.includes('-') || parseFloat(val) < 0) {
      setter((prev: T) => ({ ...prev, [field]: "" as T[keyof T] }));
      return;
    }
    if (parseFloat(val) > max) {
      setter((prev: T) => ({ ...prev, [field]: max.toString() as T[keyof T] }));
      return;
    }
    setter((prev: T) => ({ ...prev, [field]: val as T[keyof T] }));
  };

  const handleSubCategoryInput = (val: string, field: "timeOnSocialMedia" | "timeOnGaming" | "timeOnEducation") => {
    setErrors(prev => ({ ...prev, [field]: "", dailyUsageHours: "" }));

    if (val.includes('-') || parseFloat(val) < 0) return;

    const newValNum = val === "" ? 0 : parseFloat(val);

    const currentSocial = field === "timeOnSocialMedia" ? newValNum : (parseFloat(screenshotFields.timeOnSocialMedia) || 0);
    const currentGaming = field === "timeOnGaming" ? newValNum : (parseFloat(screenshotFields.timeOnGaming) || 0);
    const currentEdu = field === "timeOnEducation" ? newValNum : (parseFloat(screenshotFields.timeOnEducation) || 0);

    const newSum = currentSocial + currentGaming + currentEdu;

    if (newSum > 24) {
      setErrors(prev => ({ ...prev, [field]: `Limit reached! Total would be ${newSum}h > 24h` }));
      return;
    }

    setScreenshotFields(prev => ({
      ...prev,
      [field]: val,
      dailyUsageHours: newSum > 0 ? String(newSum) : ""
    }));
  };

  // History from localStorage
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchHistory() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (mounted && data) {
          const formattedHistory = data.map(row => ({
            id: row.id,
            date: row.date,
            riskLevel: row.risk_level,
            confidence: row.confidence,
            dailyUsage: row.daily_usage,
            phoneChecks: row.phone_checks,
            timeOnGaming: row.time_on_gaming,
            timeOnSocialMedia: row.time_on_social_media,
            timeOnEducation: row.time_on_education,
            appsUsed: row.apps_used,
            riskScoreContinuous: row.risk_score_continuous,
            clusterId: row.cluster_id,
            persona: row.persona,
            shapFeatures: row.shap_features,
            recommendations: row.recommendations,
            helpfulRecs: row.helpful_recs || [],
          }));
          setHistory(formattedHistory);
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      }
    }

    fetchHistory();
    return () => { mounted = false; };
  }, [email]);

  useEffect(() => {
    if (history.length === 0) {
      setPersona(null);
      return;
    }

    let totalSocial = 0;
    let totalGaming = 0;
    let totalEdu = 0;
    let totalScreen = 0;
    let totalPickups = 0;

    history.forEach(h => {
      totalSocial += h.timeOnSocialMedia || 0;
      totalGaming += h.timeOnGaming || 0;
      totalEdu += h.timeOnEducation || 0;
      totalScreen += h.dailyUsage || 0;
      totalPickups += h.phoneChecks || 0;
    });

    const historyCount = history.length || 1;
    const fetchPersona = async () => {
      try {
        const response = await fetch("/api/persona", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timeOnSocialMedia: totalSocial / historyCount,
            timeOnGaming: totalGaming / historyCount,
            timeOnEducation: totalEdu / historyCount,
            totalScreenTime: totalScreen / historyCount,
            phoneChecksPerDay: Math.max(20, Math.floor((totalScreen / historyCount) * 12))
          })
        });
        if (response.ok) {
          const data = await response.json();
          setPersona(data);
        }
      } catch (err) {
        console.error("Failed to fetch persona", err);
      }
    };

    fetchPersona();
  }, [history]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPEG, WEBP).");
      return;
    }

    setUploadedFileName(file.name);
    setExtracting(true);
    setExtracted(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Extraction failed" }));
        throw new Error(err.detail || "Failed to extract data");
      }

      const data = await response.json();
      const ext = data.extracted_data;

      setScreenshotFields({
        dailyUsageHours: ext.daily_usage_hours != null ? String(ext.daily_usage_hours) : "",
        timeOnSocialMedia: ext.time_on_social_media != null ? String(ext.time_on_social_media) : "",
        timeOnGaming: ext.time_on_gaming != null ? String(ext.time_on_gaming) : "",
        timeOnEducation: ext.time_on_education != null ? String(ext.time_on_education) : "",
      });


      setExtracted(true);
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to extract data from screenshot. Please try again.");
    } finally {
      setExtracting(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  /* ─── Prediction Handler ────────────────────────────────── */
  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    const validateField = (val: string, name: string) => {
      if (name !== "dailyUsageHours" && (!val || val.trim() === "")) newErrors[name] = "Field is required";
      else if (val && parseFloat(val) < 0) newErrors[name] = "Value cannot be negative";
    };

    validateField(screenshotFields.dailyUsageHours, "dailyUsageHours");
    validateField(screenshotFields.timeOnSocialMedia, "timeOnSocialMedia");
    validateField(screenshotFields.timeOnGaming, "timeOnGaming");
    validateField(screenshotFields.timeOnEducation, "timeOnEducation");

    const social = parseFloat(screenshotFields.timeOnSocialMedia) || 0;
    const gaming = parseFloat(screenshotFields.timeOnGaming) || 0;
    const edu = parseFloat(screenshotFields.timeOnEducation) || 0;
    const totalSub = social + gaming + edu;

    if (totalSub > 24) {
      newErrors.timeOnSocialMedia = "Sum cannot exceed 24 hours";
      newErrors.timeOnGaming = "Sum cannot exceed 24 hours";
      newErrors.timeOnEducation = "Sum cannot exceed 24 hours";
    }

    let finalDaily = parseFloat(screenshotFields.dailyUsageHours);
    if (isNaN(finalDaily) || finalDaily === 0) {
      if (totalSub === 0) {
        newErrors.dailyUsageHours = "Required if sub-categories are 0";
      } else {
        finalDaily = totalSub;
      }
    } else if (finalDaily > 24) {
      newErrors.dailyUsageHours = "Cannot exceed 24 hours";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (screenshotFields.dailyUsageHours !== String(finalDaily)) {
      setScreenshotFields(prev => ({ ...prev, dailyUsageHours: String(finalDaily) }));
    }

    setPredicting(true);

    const formData = new FormData();
    formData.append("name", profile.name);
    formData.append("age", String(profile.age));
    formData.append("gender", profile.gender);
    formData.append("schoolGrade", profile.schoolGrade);
    formData.append("dailyUsageHours", String(finalDaily));
    formData.append("timeOnSocialMedia", screenshotFields.timeOnSocialMedia);
    formData.append("timeOnGaming", screenshotFields.timeOnGaming);
    formData.append("timeOnEducation", screenshotFields.timeOnEducation);
    formData.append("sleepHours", String(profile.sleepHours || 7.0));
    formData.append("exerciseHours", String(profile.exerciseHours || 1.0));
    formData.append("stressLevel", String(profile.stressLevel || 5));
    formData.append("hobby", profile.hobby || "");

    const histPhoneChecks = history.length > 0 ? (history.reduce((acc, curr) => acc + (curr.phoneChecks || 0), 0) / history.length) : 0;
    const histAppsUsed = history.length > 0 ? (history.reduce((acc, curr) => acc + (curr.appsUsed || 0), 0) / history.length) : 0;
    const allLikedRecs = history.flatMap(h =>
      (h.helpfulRecs || [])
        .filter((r: string) => r.startsWith("Helpful: "))
        .map((r: string) => r.replace("Helpful: ", ""))
    );
    const likedRecsJson = JSON.stringify(Array.from(new Set(allLikedRecs)));

    formData.append("histPhoneChecks", String(histPhoneChecks));
    formData.append("histAppsUsed", String(histAppsUsed));
    formData.append("likedRecs", likedRecsJson);

    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error:", errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const resData = await response.json();
      setResult(resData);

      const entry: HistoryEntry = {
        date: new Date().toLocaleDateString(),
        riskLevel: resData.risk_level,
        confidence: resData.confidence,
        dailyUsage: parseFloat(screenshotFields.dailyUsageHours) || 0,
        phoneChecks: 40,
        timeOnGaming: parseFloat(screenshotFields.timeOnGaming) || 0,
        timeOnSocialMedia: parseFloat(screenshotFields.timeOnSocialMedia) || 0,
        timeOnEducation: parseFloat(screenshotFields.timeOnEducation) || 0,
        appsUsed: 15,
        riskScoreContinuous: resData.risk_score_continuous,
        clusterId: resData.cluster_id,
        persona: resData.persona,
        shapFeatures: resData.shap_features,
        recommendations: resData.recommendations,
        helpfulRecs: (resData.recommendations || []).map((rec: string) => `Not Helpful: ${rec}`),
      };

      // Just update local state for now. We will save to DB in resetCheck.
      // This allows the user to mark recommendations as helpful before saving.
      setHistory(prev => [...prev, entry]);
      setCurrentHelpfulRecs([]);
    } catch (err: any) {
      console.error("Prediction catch block error:", err);
      alert("Prediction failed: " + (err.message || "Unknown error"));
    } finally {
      setPredicting(false);
    }
  };

  const resetCheck = async () => {
    // Save the current result to DB before resetting, so it captures helpful recs
    const currentEntry = history[history.length - 1];
    if (result && currentEntry && !currentEntry.id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: insertedData, error } = await supabase.from('history').insert({
            user_id: user.id,
            date: currentEntry.date,
            risk_level: currentEntry.riskLevel,
            confidence: currentEntry.confidence,
            daily_usage: currentEntry.dailyUsage,
            phone_checks: currentEntry.phoneChecks,
            time_on_gaming: currentEntry.timeOnGaming,
            time_on_social_media: currentEntry.timeOnSocialMedia,
            time_on_education: currentEntry.timeOnEducation,
            apps_used: currentEntry.appsUsed,
            risk_score_continuous: currentEntry.riskScoreContinuous,
            cluster_id: currentEntry.clusterId,
            persona: currentEntry.persona,
            shap_features: currentEntry.shapFeatures,
            recommendations: currentEntry.recommendations,
            helpful_recs: currentEntry.helpfulRecs
          }).select('id').single();
          if (error) console.error("Error saving history:", error);
          if (insertedData) {
            currentEntry.id = insertedData.id;
          }
        }
      } catch (e) {
        console.error("Failed to save entry before reset:", e);
      }
    }

    setResult(null);
    setExtracted(false);
    setUploadedFileName("");
    setDragOver(false);
    setScreenshotFields({ dailyUsageHours: "", timeOnSocialMedia: "", timeOnGaming: "", timeOnEducation: "" });
    setCurrentHelpfulRecs([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cumulativeRisk = getCumulativeRisk(history);

  return (
    <div className="dashboard">

      <nav className="dash-nav">
        <div className="dash-nav-brand">
          <Sparkles size={20} className="dash-nav-icon" />
          <span className="dash-nav-title">Digital Detach</span>
        </div>
        <div className="dash-nav-right">
          <Link href="/history" className="dash-nav-btn">📊 View History & Stats</Link>
          <span className="dash-nav-user">{profile.name}</span>
          <button className="dash-nav-logout" onClick={onLogout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <div className="dash-content">
        <div className="dash-form-panel dash-form-panel-scrollable">
          {!result ? (
            <div className="dash-section">
              <h2 className="dash-section-title page-title-gradient text-3xl mb-2 leading-tight">Check Your Screen Time</h2>
              <p className="dash-section-sub">
                Upload a screenshot from your phone&apos;s screen time settings. Our AI will extract the data automatically.
              </p>

              <div
                className={`upload-zone ${dragOver ? "upload-zone-active" : ""} ${extracted ? "upload-zone-done" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => !extracting && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Upload screenshot"
                  hidden
                  onClick={(e) => {
                    e.stopPropagation();
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />

                {extracting ? (
                  <div className="upload-status">
                    <Loader2 size={28} className="spin" />
                    <p className="upload-text">Analyzing screenshot with AI...</p>
                    <p className="upload-subtext">This usually takes a few seconds</p>
                  </div>
                ) : extracted ? (
                  <div className="upload-status">
                    <CheckCircle2 size={28} className="upload-icon-done" />
                    <p className="upload-text">Data extracted successfully!</p>
                    <p className="upload-subtext">{uploadedFileName}</p>
                    <button
                      className="upload-change"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Upload a different screenshot
                    </button>
                  </div>
                ) : (
                  <div className="upload-status">
                    <div className="upload-icon-wrap">
                      <Camera size={24} />
                    </div>
                    <p className="upload-text">
                      Drop your screen time screenshot here
                    </p>
                    <p className="upload-subtext">
                      Supports iOS Screen Time & Android Digital Wellbeing
                    </p>
                    <span className="upload-btn">Browse Files</span>
                  </div>
                )}
              </div>

              <form onSubmit={handlePredict} className="dash-form">

                <div className="form-section">
                  <h3 className="form-section-title">
                    <Smartphone size={14} />
                    Screen Time Data
                    {extracted && <span className="form-badge">AI Extracted</span>}
                  </h3>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Daily Usage (Hours)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="24"
                        placeholder="e.g. 3.5"
                        value={screenshotFields.dailyUsageHours}
                        onChange={(e) => handleNumericInput(e.target.value, "dailyUsageHours", setScreenshotFields, 24)}
                        className={`form-input ${extracted && screenshotFields.dailyUsageHours ? "form-input-filled" : ""}`}
                      />
                      {errors.dailyUsageHours && <span className="form-error-msg">{errors.dailyUsageHours}</span>}
                    </div>
                    <div className="form-field">
                      <label>Social Media (Hours)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="24"
                        required
                        placeholder="e.g. 2.5"
                        value={screenshotFields.timeOnSocialMedia}
                        onChange={(e) => handleSubCategoryInput(e.target.value, "timeOnSocialMedia")}
                        className={`form-input ${extracted && screenshotFields.timeOnSocialMedia ? "form-input-filled" : ""}`}
                      />
                      {errors.timeOnSocialMedia && <span className="form-error-msg">{errors.timeOnSocialMedia}</span>}
                    </div>
                    <div className="form-field">
                      <label>Gaming / Entertainment (Hours)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="24"
                        required
                        placeholder="e.g. 1.0"
                        value={screenshotFields.timeOnGaming}
                        onChange={(e) => handleSubCategoryInput(e.target.value, "timeOnGaming")}
                        className={`form-input ${extracted && screenshotFields.timeOnGaming ? "form-input-filled" : ""}`}
                      />
                      {errors.timeOnGaming && <span className="form-error-msg">{errors.timeOnGaming}</span>}
                    </div>
                    <div className="form-field">
                      <label>Education / Productivity (Hours)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="24"
                        required
                        placeholder="e.g. 0.5"
                        value={screenshotFields.timeOnEducation}
                        onChange={(e) => handleSubCategoryInput(e.target.value, "timeOnEducation")}
                        className={`form-input ${extracted && screenshotFields.timeOnEducation ? "form-input-filled" : ""}`}
                      />
                      {errors.timeOnEducation && <span className="form-error-msg">{errors.timeOnEducation}</span>}
                    </div>
                  </div>
                </div>



                <button type="submit" className="btn-primary btn-predict" disabled={predicting}>
                  {predicting ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      Running ML Model...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Analyze & Predict
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="dash-section mt-6">
              <div className={`result-banner ${result.risk_level === "HIGH RISK" ? "result-high" :
                  result.risk_level === "MODERATE RISK" ? "result-moderate" : "result-low"
                }`}>
                <h2 className="result-label">Latest Result</h2>
                <div className="result-risk">{result.risk_level}</div>

                <div className="result-rec mt-4 p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                  <h4 className="text-[var(--text-primary)] font-semibold mb-3 flex items-center gap-3">
                    <Sparkles size={18} className="text-[var(--accent-amber)] shrink-0" />
                    <span className="ml-1.5">Recommendations</span>
                  </h4>
                  {result.recommendations && result.recommendations.length > 0 ? (
                    <ul className="list-disc pl-5 text-left text-sm text-[var(--text-secondary)] w-full">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="rec-list-item">
                          <span className="rec-text">{rec}</span>
                          {!currentHelpfulRecs.includes(rec) ? (
                            <button
                              type="button"
                              className="btn-helpful"
                              onClick={() => {
                                setCurrentHelpfulRecs(prev => [...prev, rec]);
                                const currentEntry = history[history.length - 1];
                                if (!currentEntry) return;

                                const updatedRecs = (currentEntry.helpfulRecs || []).map((r: string) =>
                                  r === `Not Helpful: ${rec}` ? `Helpful: ${rec}` : r
                                );
                                currentEntry.helpfulRecs = updatedRecs;
                                setHistory([...history]);
                              }}
                            >
                              <ThumbsUp size={12} /> Helpful
                            </button>
                          ) : (
                            <span className="btn-helpful-active">
                              <CheckCircle2 size={14} /> Helpful
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">Keep monitoring your screen time to stay mindful of your habits.</p>
                  )}
                  {result.shap_features && result.shap_features.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)] text-left">
                      <strong>Key Drivers for your score:</strong> {result.shap_features.join(', ')}
                    </div>
                  )}
                </div>

                <div className="dash-stats-container">
                  <h3 className="dash-stats-title">
                    Analyzed Stats
                  </h3>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <span className="metric-label">Daily Usage</span>
                      <span className="metric-value">{result.extracted_data?.Daily_Usage || screenshotFields.dailyUsageHours + "h"}</span>
                    </div>
                    <div className="metric-card">
                      <span className="metric-label">Social Media</span>
                      <span className="metric-value">{result.extracted_data?.Time_on_Social_Media || screenshotFields.timeOnSocialMedia + "h"}</span>
                    </div>
                    <div className="metric-card">
                      <span className="metric-label">Gaming</span>
                      <span className="metric-value">{result.extracted_data?.Time_on_Gaming || screenshotFields.timeOnGaming + "h"}</span>
                    </div>
                    <div className="metric-card">
                      <span className="metric-label">Education</span>
                      <span className="metric-value">{result.extracted_data?.Time_on_Education || screenshotFields.timeOnEducation + "h"}</span>
                    </div>
                  </div>
                </div>

                <button
                  className="btn-primary mt-8 w-full !bg-[var(--bg-input)] hover:!border-[var(--accent-amber)] hover:!shadow-[0_0_15px_rgba(245,166,35,0.15)] transition-all duration-300"
                  onClick={resetCheck}
                >
                  <Sparkles size={18} className="inline mr-2" style={{ display: 'inline' }} />
                  Run Another Check
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="dash-plant-panel">
          <PlantVisualization
            history={history}
            persona={persona}
          />
        </div>
      </div>
    </div>
  );
}
