"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePatientContext } from "@/context/PatientContext";
import {
  FileText,
  Printer,
  Heart,
  Pill,
  Activity,
  CheckSquare,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

function ReportContent() {
  const searchParams = useSearchParams();
  const paramPatientId = searchParams.get("patientId");
  const { patients, activePatientId } = usePatientContext();

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targetId = paramPatientId || (activePatientId !== "all" ? activePatientId : patients[0]?.id);
    if (targetId) {
      setSelectedPatientId(targetId);
    }
  }, [paramPatientId, activePatientId, patients]);

  useEffect(() => {
    if (!selectedPatientId) return;

    async function fetchReport() {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports/${selectedPatientId}`);
        if (res.ok) {
          const data = await res.json();
          setReportData(data.report);
        }
      } catch (err) {
        console.error("Report fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [selectedPatientId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable CSS override */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #doctor-report-print, #doctor-report-print * {
            visibility: visible;
          }
          #doctor-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Controls Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Doctor Visit PDF Summary Generator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Aggregates medication adherence and 30-day vitals trends into a clean, downloadable doctor-ready document.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Patient Selector */}
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                Report for {p.name} ({p.relationship})
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            disabled={loading || !reportData}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Download / Print PDF Report</span>
          </button>
        </div>
      </div>

      {/* Live PDF Report Document Container */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Generating doctor summary report...
        </div>
      ) : reportData ? (
        <div
          id="doctor-report-print"
          ref={reportRef}
          className="cc-paper bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-3xl p-8 sm:p-12 max-w-4xl mx-auto space-y-8"
        >
          {/* Official Document Header */}
          <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Heart className="w-4 h-4 fill-white" />
                </div>
                <span className="font-extrabold text-2xl tracking-tight text-indigo-800">
                  CareCircle
                </span>
                <span className="text-xs uppercase font-bold tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Clinical Summary Report
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Prepared by Family Caregiver: <strong>{reportData.caregiver?.name}</strong> ({reportData.caregiver?.email})
              </p>
            </div>

            <div className="text-right text-xs text-slate-500">
              <div className="font-bold text-slate-900">Generated On</div>
              <div>{new Date(reportData.generatedAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}</div>
              <div className="text-[10px] text-indigo-600 font-semibold mt-1">Ready for Physician Handout</div>
            </div>
          </div>

          {/* Section 1: Patient Demographics & Profile */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Patient Medical Profile
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{reportData.patient.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">DOB & Gender</span>
                <span className="font-semibold text-slate-800">
                  {new Date(reportData.patient.dob).toLocaleDateString()} ({reportData.patient.gender || "N/A"})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Conditions</span>
                <span className="font-semibold text-indigo-900">{reportData.patient.primaryCondition || "None"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Known Allergies</span>
                <span className="font-semibold text-rose-700">{reportData.patient.allergies || "None"}</span>
              </div>
            </div>
          </div>

          {/* Section 2: 30-Day Medication Adherence Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-indigo-600" /> Active Medications & 30-Day Adherence
              </h2>
              <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                Overall Adherence: {reportData.overallAdherenceScore}%
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-2.5 rounded-l-xl">Medication & Dosage</th>
                  <th className="p-2.5">Schedule / Frequency</th>
                  <th className="p-2.5">Prescriber</th>
                  <th className="p-2.5">Adherence Rate</th>
                  <th className="p-2.5 rounded-r-xl">Refill Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.medAdherence.map((med: any) => (
                  <tr key={med.id}>
                    <td className="p-2.5 font-bold text-slate-900">{med.name} ({med.dosage})</td>
                    <td className="p-2.5 text-slate-600">{med.frequency}</td>
                    <td className="p-2.5 text-slate-600">{med.prescribingDoctor || "Primary Care"}</td>
                    <td className="p-2.5 font-bold text-indigo-700">{med.adherenceRate}% ({med.takenLogs}/{med.totalLogs} taken)</td>
                    <td className="p-2.5">
                      {med.remainingQuantity <= med.refillThreshold ? (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Refill Due ({med.remainingQuantity} left)
                        </span>
                      ) : (
                        <span className="text-slate-600">{med.remainingQuantity} units left</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: 30-Day Vitals & Symptom Trends */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Activity className="w-4 h-4 text-violet-600" /> 30-Day Vitals Digest
            </h2>

            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Pressure Range</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {reportData.vitalsSummary.systolic.avg || "--"}/{reportData.vitalsSummary.diastolic.avg || "--"} mmHg (Avg)
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Min: {reportData.vitalsSummary.systolic.min}/{reportData.vitalsSummary.diastolic.min} • Max: {reportData.vitalsSummary.systolic.max}/{reportData.vitalsSummary.diastolic.max}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Sugar Average</span>
                <span className="text-sm font-extrabold text-amber-700">
                  {reportData.vitalsSummary.bloodSugar.avg || "--"} mg/dL
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Min: {reportData.vitalsSummary.bloodSugar.min} • Max: {reportData.vitalsSummary.bloodSugar.max}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Heart Rate Average</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {reportData.vitalsSummary.heartRate.avg || "--"} bpm
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {reportData.vitalsSummary.totalLogEntries} total readings logged
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Upcoming Visit Preparation Checklist */}
          {reportData.nextAppointment && (
            <div className="space-y-3 bg-indigo-50/60 p-5 rounded-2xl border border-indigo-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-indigo-700" /> Upcoming Visit Pre-Checklist & Doctor Questions
              </h2>

              <div className="text-xs font-semibold text-indigo-900 mb-2">
                Visit with {reportData.nextAppointment.doctorName} ({new Date(reportData.nextAppointment.dateTime).toLocaleDateString()})
              </div>

              <div className="space-y-1.5 text-xs">
                {reportData.nextAppointment.checklistItems?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-slate-800">
                    <span className={item.isCompleted ? "text-violet-600 font-bold" : "text-slate-400"}>
                      {item.isCompleted ? "✓ [Completed]" : "☐ [Pending]"}
                    </span>
                    <span>{item.task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Footer Signature Line */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <div>CareCircle Multi-Patient Caregiver Coordination Platform</div>
            <div>Physician Signature: ______________________</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DoctorReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Doctor Report Generator...</div>}>
      <ReportContent />
    </Suspense>
  );
}
