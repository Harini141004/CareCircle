"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Patient {
  id: string;
  name: string;
  dob: string;
  gender?: string;
  relationship: string;
  primaryCondition?: string;
  bloodType?: string;
  allergies?: string;
  emergencyContact?: string;
  notes?: string;
  avatarColor: string;
  _count?: {
    medications: number;
    symptomLogs: number;
    appointments: number;
    alerts: number;
  };
}

interface PatientContextType {
  patients: Patient[];
  activePatientId: string | "all";
  activePatient: Patient | null;
  setActivePatientId: (id: string | "all") => void;
  refreshPatients: () => Promise<void>;
  loading: boolean;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientId] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/patients");
      if (res.status === 401) {
        setPatients([]);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch {
      // Suppress unauthenticated/network error logs
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const activePatient =
    activePatientId !== "all"
      ? patients.find((p) => p.id === activePatientId) || null
      : null;

  return (
    <PatientContext.Provider
      value={{
        patients,
        activePatientId,
        activePatient,
        setActivePatientId,
        refreshPatients: fetchPatients,
        loading,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatientContext() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatientContext must be used within a PatientProvider");
  }
  return context;
}
