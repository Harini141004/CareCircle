"use client";

import React, { useState } from "react";
import { usePatientContext } from "@/context/PatientContext";
import {
  UserPlus,
  Users,
  Calendar,
  Phone,
  Trash2,
  Edit2,
  X,
  ShieldCheck,
  Heart,
} from "lucide-react";

export default function PatientsPage() {
  const { patients, refreshPatients, setActivePatientId } = usePatientContext();
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);

  // Form fields
  const [name, setName] = useState("");
  const [dob, setDob] = useState("1950-01-01");
  const [relationship, setRelationship] = useState("Mother");
  const [gender, setGender] = useState("Female");
  const [primaryCondition, setPrimaryCondition] = useState("");
  const [bloodType, setBloodType] = useState("O+");
  const [allergies, setAllergies] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [notes, setNotes] = useState("");
  const [avatarColor, setAvatarColor] = useState("#0D9488");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const colors = [
    "#0D9488", // Teal
    "#6366F1", // Indigo
    "#EC4899", // Pink
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#8B5CF6", // Purple
    "#3B82F6", // Blue
  ];

  const handleOpenCreate = () => {
    setEditingPatient(null);
    setName("");
    setDob("1950-01-01");
    setRelationship("Mother");
    setGender("Female");
    setPrimaryCondition("");
    setBloodType("O+");
    setAllergies("");
    setEmergencyContact("");
    setNotes("");
    setAvatarColor("#0D9488");
    setError("");
    setShowModal(true);
  };

  const handleOpenEdit = (patient: any) => {
    setEditingPatient(patient);
    setName(patient.name);
    setDob(new Date(patient.dob).toISOString().split("T")[0]);
    setRelationship(patient.relationship);
    setGender(patient.gender || "Female");
    setPrimaryCondition(patient.primaryCondition || "");
    setBloodType(patient.bloodType || "O+");
    setAllergies(patient.allergies || "");
    setEmergencyContact(patient.emergencyContact || "");
    setNotes(patient.notes || "");
    setAvatarColor(patient.avatarColor || "#0D9488");
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = editingPatient ? `/api/patients/${editingPatient.id}` : "/api/patients";
      const method = editingPatient ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          dob,
          relationship,
          gender,
          primaryCondition,
          bloodType,
          allergies,
          emergencyContact,
          notes,
          avatarColor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save patient");
      } else {
        await refreshPatients();
        setShowModal(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, patientName: string) => {
    if (!confirm(`Are you sure you want to remove ${patientName}'s profile? All associated medication and vitals logs will be deleted.`)) return;

    try {
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshPatients();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Dependent Patient Profiles
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage child records under your single caregiver account. Every profile maintains isolated health records.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-900/20 flex items-center gap-2 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Patient Profile</span>
        </button>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {patients.map((p) => {
          const age = new Date().getFullYear() - new Date(p.dob).getFullYear();

          return (
            <div
              key={p.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4"
            >
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{ backgroundColor: p.avatarColor }}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl text-white font-extrabold flex items-center justify-center text-lg shadow-md shrink-0"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {p.relationship}
                      </span>
                      <span>•</span>
                      <span>{age} years old ({new Date(p.dob).toLocaleDateString()})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                    title="Edit Patient Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Patient Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conditions & Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Primary Conditions
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {p.primaryCondition || "None listed"}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Blood Type & Allergies
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {p.bloodType || "O+"} • {p.allergies || "No known allergies"}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              {p.emergencyContact && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-medium truncate">{p.emergencyContact}</span>
                </div>
              )}

              {/* Direct Scope Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActivePatientId(p.id)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors text-center"
                >
                  Switch Dashboard Scope to {p.name.split(" ")[0]}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Patient Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="cc-dialog border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                {editingPatient ? `Edit ${editingPatient.name}'s Profile` : "Add Dependent Patient"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Margaret Vance"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Relationship *
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Other">Other Dependent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Medical Conditions
                </label>
                <input
                  type="text"
                  value={primaryCondition}
                  onChange={(e) => setPrimaryCondition(e.target.value)}
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Type
                  </label>
                  <input
                    type="text"
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    placeholder="e.g. O+"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Allergies
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Latex"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Contact Phone / Name
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Sarah Vance (Daughter) - (555) 019-2831"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Avatar Theme Color
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        avatarColor === c ? "scale-125 ring-2 ring-indigo-500 ring-offset-2" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700"
                >
                  {loading ? "Saving..." : editingPatient ? "Update Profile" : "Save Patient Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
