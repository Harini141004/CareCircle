"use client";

import React, { useState, useEffect } from "react";
import { usePatientContext } from "@/context/PatientContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  Heart,
  TrendingUp,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Thermometer,
  Scale,
} from "lucide-react";

interface SymptomLogItem {
  id: string;
  timestamp: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bloodSugar?: number;
  heartRate?: number;
  weight?: number;
  temperature?: number;
  mood?: string;
  symptomSeverity?: number;
  notes?: string;
  patient: { name: string; avatarColor: string };
}

const MOODS = ["Excellent", "Good", "Fair", "Anxious", "Fatigued", "Dizzy", "Calm", "Tired"];

export default function VitalsPage() {
  const { activePatientId, patients } = usePatientContext();
  const [logs, setLogs] = useState<SymptomLogItem[]>([]);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeChart, setActiveChart] = useState<"bp" | "sugar" | "hr" | "severity">("bp");
  const [toastMsg, setToastMsg] = useState("");

  // Log Form
  const [targetPatientId, setTargetPatientId] = useState(
    activePatientId !== "all" ? activePatientId : patients[0]?.id || ""
  );
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [sugar, setSugar] = useState("");
  const [hr, setHr] = useState("");
  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState("");
  const [mood, setMood] = useState("Good");
  const [severity, setSeverity] = useState("2");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/symptoms?patientId=${activePatientId}&days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error fetching vitals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [activePatientId, days]);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: targetPatientId || patients[0]?.id,
          bloodPressureSystolic: sys || undefined,
          bloodPressureDiastolic: dia || undefined,
          bloodSugar: sugar || undefined,
          heartRate: hr || undefined,
          weight: weight || undefined,
          temperature: temperature || undefined,
          mood,
          symptomSeverity: severity,
          notes,
        }),
      });

      if (res.ok) {
        await fetchLogs();
        setShowLogModal(false);
        setSys(""); setDia(""); setSugar(""); setHr("");
        setWeight(""); setTemperature(""); setNotes("");
        showToast("Vitals log saved successfully!");
      }
    } catch (err) {
      console.error("Error creating vitals log:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Delete this vitals log entry?")) return;
    try {
      const res = await fetch(`/api/symptoms/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
        showToast("Vitals log deleted.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Format data for Recharts
  const chartData = logs.map((item) => ({
    date: new Date(item.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
    Systolic: item.bloodPressureSystolic ?? null,
    Diastolic: item.bloodPressureDiastolic ?? null,
    BloodSugar: item.bloodSugar ?? null,
    HeartRate: item.heartRate ?? null,
    Severity: item.symptomSeverity ?? null,
    patient: item.patient?.name,
  }));

  // Summary stats
  const bpVals = logs.filter(l => l.bloodPressureSystolic).map(l => l.bloodPressureSystolic!);
  const sugarVals = logs.filter(l => l.bloodSugar).map(l => l.bloodSugar!);
  const hrVals = logs.filter(l => l.heartRate).map(l => l.heartRate!);
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const tooltipStyle = {
    backgroundColor: "var(--t-surface)", border: "1px solid var(--color-slate-200)",
    borderRadius: "12px", color: "var(--t-fg)", fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl cc-dialog text-xs font-semibold shadow-2xl border animate-in slide-in-from-bottom-4 duration-300">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Vitals & Symptom Trends
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Blood pressure, blood sugar, heart rate, and severity history with trend visualization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs font-semibold">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  days === d ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm font-bold" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
          <button onClick={fetchLogs} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setTargetPatientId(activePatientId !== "all" ? activePatientId : patients[0]?.id || "");
              setShowLogModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Record Vitals
          </button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <Heart className="w-5 h-5 text-rose-500 mx-auto mb-1" />
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{avg(bpVals) || "--"}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Systolic</div>
          <div className="text-[10px] text-rose-500 mt-0.5">Target &lt; 130</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{avg(sugarVals) || "--"}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Blood Sugar</div>
          <div className="text-[10px] text-amber-500 mt-0.5">mg/dL • Target &lt; 140</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <Activity className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{avg(hrVals) || "--"}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Heart Rate</div>
          <div className="text-[10px] text-indigo-500 mt-0.5">bpm • Target 60–100</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <TrendingUp className="w-5 h-5 text-slate-500 mx-auto mb-1" />
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{logs.length}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Readings</div>
          <div className="text-[10px] text-slate-400 mt-0.5">in {days} days</div>
        </div>
      </div>

      {/* Chart Toggle + Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Chart Tab Switcher */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Trend Visualization</h3>
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold gap-0.5">
            {[
              { key: "bp", label: "Blood Pressure" },
              { key: "sugar", label: "Glucose" },
              { key: "hr", label: "Heart Rate" },
              { key: "severity", label: "Severity" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveChart(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeChart === tab.key ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow font-bold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === "bp" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 180]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <ReferenceLine y={130} stroke="#EF4444" strokeDasharray="5 5" label={{ value: "Target", position: "right", fontSize: 10, fill: "#EF4444" }} />
                <Line type="monotone" dataKey="Systolic" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Diastolic" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              </LineChart>
            ) : activeChart === "sugar" ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[70, 250]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={140} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: "Target", position: "right", fontSize: 10, fill: "#F59E0B" }} />
                <Area type="monotone" dataKey="BloodSugar" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2.5} connectNulls />
              </AreaChart>
            ) : activeChart === "hr" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[50, 120]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={100} stroke="#10B981" strokeDasharray="5 5" label={{ value: "Max Normal", position: "right", fontSize: 10, fill: "#10B981" }} />
                <Line type="monotone" dataKey="HeartRate" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              </LineChart>
            ) : (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="Severity" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} strokeWidth={2.5} connectNulls />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vitals Log History Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
          Timestamped Vitals History ({logs.length} entries)
        </h3>

        {logs.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No vitals recorded yet. Click "Record Vitals" to log the first entry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="text-left py-2 pr-4">Date & Patient</th>
                  <th className="text-center py-2 pr-3">BP</th>
                  <th className="text-center py-2 pr-3">Sugar</th>
                  <th className="text-center py-2 pr-3">HR</th>
                  <th className="text-center py-2 pr-3">Mood</th>
                  <th className="text-center py-2 pr-3">Severity</th>
                  <th className="text-left py-2">Notes</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {[...logs].reverse().map((log) => {
                  const bpHigh = (log.bloodPressureSystolic && log.bloodPressureSystolic > 140) || (log.bloodPressureDiastolic && log.bloodPressureDiastolic > 90);
                  const sugarHigh = log.bloodSugar && log.bloodSugar > 180;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(log.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                          <span className="text-slate-400 ml-1 font-normal">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: log.patient.avatarColor }}
                        >
                          {log.patient.name.split(" ")[0]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {log.bloodPressureSystolic ? (
                          <span className={`font-bold ${bpHigh ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"}`}>
                            {log.bloodPressureSystolic}/{log.bloodPressureDiastolic}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {log.bloodSugar ? (
                          <span className={`font-bold ${sugarHigh ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-200"}`}>
                            {log.bloodSugar}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {log.heartRate ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{log.heartRate}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {log.mood ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[10px]">
                            {log.mood}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {log.symptomSeverity != null ? (
                          <span className={`font-bold text-sm ${log.symptomSeverity >= 7 ? "text-rose-600" : log.symptomSeverity >= 4 ? "text-amber-600" : "text-violet-600"}`}>
                            {log.symptomSeverity}/10
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 text-slate-500 max-w-[180px] truncate">{log.notes || "—"}</td>
                      <td className="py-2.5 pl-2">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete this entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Vitals Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="cc-dialog border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Record Vitals & Symptoms</h3>
              <button onClick={() => setShowLogModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Patient *</label>
                <select
                  value={targetPatientId}
                  onChange={(e) => setTargetPatientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.relationship})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500" /> Systolic BP (mmHg)
                  </label>
                  <input type="number" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="e.g. 138"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Diastolic BP (mmHg)</label>
                  <input type="number" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="e.g. 86"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-amber-500" /> Blood Glucose (mg/dL)
                  </label>
                  <input type="number" value={sugar} onChange={(e) => setSugar(e.target.value)} placeholder="e.g. 145"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Heart Rate (bpm)</label>
                  <input type="number" value={hr} onChange={(e) => setHr(e.target.value)} placeholder="e.g. 74"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-slate-500" /> Weight (kg)
                  </label>
                  <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 68.5"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-blue-500" /> Temperature (°F)
                  </label>
                  <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="e.g. 98.6"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mood</label>
                  <select value={mood} onChange={(e) => setMood(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Symptom Severity (1–10) — Current: <strong>{severity}</strong>
                  </label>
                  <input type="range" min="1" max="10" value={severity} onChange={(e) => setSeverity(e.target.value)}
                    className="w-full accent-indigo-600 mt-2" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Caregiver Notes & Observations</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Patient complained of mild dizziness when standing up in the morning..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors">
                  {submitting ? "Saving..." : "Save Vitals Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
