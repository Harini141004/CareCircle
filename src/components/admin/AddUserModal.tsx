"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateAdminSchema,
  CreateCaregiverSchema,
  CreatePatientSchema,
  CreateFamilySchema,
  RelationshipEnum,
  VerificationStatusEnum,
} from "@/lib/validations/user";
import { X, UserPlus, AlertCircle, Loader2, Sparkles } from "lucide-react";

interface AddUserModalProps {
  type: "admin" | "caregiver" | "patient" | "family";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  verifiedCaregivers: { id: string; name: string; email: string }[];
  availablePatients: { id: string; name: string }[];
}

export function AddUserModal({
  type,
  isOpen,
  onClose,
  onSuccess,
  verifiedCaregivers,
  availablePatients,
}: AddUserModalProps) {
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Schema selector
  const currentSchema =
    type === "admin"
      ? CreateAdminSchema
      : type === "caregiver"
      ? CreateCaregiverSchema
      : type === "patient"
      ? CreatePatientSchema
      : CreateFamilySchema;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(currentSchema as any),
    defaultValues: {
      type,
      name: "",
      email: "",
      password: "",
      phone: "",
      education: "",
      previousExperience: "",
      verificationStatus: "VERIFIED",
      dob: "1955-01-01",
      relationship: type === "patient" ? "Mother" : "SON",
      relationshipOther: "",
      gender: "Female",
      bloodType: "O+",
      primaryCondition: "",
      allergies: "",
      emergencyContact: "",
      notes: "",
      avatarColor: "#0D9488",
      caregiverId: verifiedCaregivers[0]?.id || "",
      patientId: availablePatients[0]?.id || "",
      isPrimaryContact: false,
    },
  });

  // Reset form whenever modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      setServerError("");
      reset({
        type,
        name: "",
        email: "",
        password: "",
        phone: "",
        education: "",
        previousExperience: "",
        verificationStatus: "VERIFIED",
        dob: "1955-01-01",
        relationship: type === "patient" ? "Mother" : "SON",
        relationshipOther: "",
        gender: "Female",
        bloodType: "O+",
        primaryCondition: "",
        allergies: "",
        emergencyContact: "",
        notes: "",
        avatarColor: "#0D9488",
        caregiverId: verifiedCaregivers[0]?.id || "",
        patientId: availablePatients[0]?.id || "",
        isPrimaryContact: false,
      });
    }
  }, [isOpen, type, reset, verifiedCaregivers, availablePatients]);

  const watchedRelationship = watch("relationship");
  const watchedColor = watch("avatarColor");

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    setServerError("");
    setSubmitting(true);

    try {
      // Ensure correct payload structure
      const payload: any = { ...data, type };
      if (type === "patient" && data.dob) {
        payload.dob = new Date(data.dob).toISOString();
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Failed to create user");
        return;
      }

      onSuccess(`Successfully created ${type} user "${payload.name}"`);
      onClose();
    } catch {
      setServerError("An unexpected network error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const titleMap = {
    admin: "Create New Administrator",
    caregiver: "Create New Caregiver",
    patient: "Create New Patient Profile",
    family: "Create New Family Member",
  };

  const colors = [
    "#0D9488", // Teal
    "#6366F1", // Indigo
    "#EC4899", // Pink
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#8B5CF6", // Purple
    "#3B82F6", // Blue
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {titleMap[type]}
              </h2>
              <p className="text-[11px] text-slate-500">
                Enter details below to create a new {type} record in CareCircle
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {serverError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Common fields: Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register("name")}
              placeholder={type === "patient" ? "e.g. Ramesh Kumar" : "e.g. John Doe"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.name && (
              <p className="mt-1 text-[11px] text-rose-500 font-medium">
                {String(errors.name.message)}
              </p>
            )}
          </div>

          {/* Email (for non-patient users) */}
          {type !== "patient" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="user@carecircle.demo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.email && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">
                    {String(errors.email.message)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Temporary Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  {...register("password")}
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.password && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">
                    {String(errors.password.message)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                {...register("phone")}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Caregiver specific: Verification status */}
            {type === "caregiver" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Verification Status
                </label>
                <select
                  {...register("verificationStatus")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="VERIFIED">VERIFIED (Eligible for Patients)</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            )}
          </div>

          {/* Caregiver specific fields: education, previousExperience */}
          {type === "caregiver" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Education / Certification
                </label>
                <input
                  type="text"
                  {...register("education")}
                  placeholder="e.g. B.S. Nursing, RN"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Previous Experience
                </label>
                <input
                  type="text"
                  {...register("previousExperience")}
                  placeholder="e.g. 5+ years geriatric care"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Patient specific fields */}
          {type === "patient" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register("dob")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.dob && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      {String(errors.dob.message)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    {...register("gender")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Type
                  </label>
                  <select
                    {...register("bloodType")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Caregiver <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register("caregiverId")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {verifiedCaregivers.length === 0 ? (
                      <option value="">No verified caregivers found</option>
                    ) : (
                      verifiedCaregivers.map((cg) => (
                        <option key={cg.id} value={cg.id}>
                          {cg.name} ({cg.email})
                        </option>
                      ))
                    )}
                  </select>
                  {errors.caregiverId && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      {String(errors.caregiverId.message)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Caregiver Relation String <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("relationship")}
                    placeholder="e.g. Mother, Father, Client"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.relationship && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      {String(errors.relationship.message)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Condition / Diagnosis
                  </label>
                  <input
                    type="text"
                    {...register("primaryCondition")}
                    placeholder="e.g. Hypertension, Type 2 Diabetes"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Known Allergies
                  </label>
                  <input
                    type="text"
                    {...register("allergies")}
                    placeholder="e.g. Penicillin, Peanuts"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  {...register("emergencyContact")}
                  placeholder="e.g. John Doe (+1 555-1234)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Profile Avatar Color
                </label>
                <div className="flex items-center gap-3">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue("avatarColor", c)}
                      className={`w-7 h-7 rounded-xl border-2 transition-all ${
                        watchedColor === c ? "border-indigo-600 scale-110 shadow-sm" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Family Member specific fields */}
          {type === "family" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Associated Patient <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register("patientId")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availablePatients.length === 0 ? (
                      <option value="">No patients available</option>
                    ) : (
                      availablePatients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.patientId && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      {String(errors.patientId.message)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Relationship to Patient <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register("relationship")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="SON">Son</option>
                    <option value="DAUGHTER">Daughter</option>
                    <option value="SPOUSE">Spouse</option>
                    <option value="SIBLING">Sibling</option>
                    <option value="GRANDCHILD">Grandchild</option>
                    <option value="PARENT">Parent</option>
                    <option value="FRIEND">Friend</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {errors.relationship && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      {String(errors.relationship.message)}
                    </p>
                  )}
                </div>
              </div>

              {/* Show Other Text Box ONLY when OTHER is selected */}
              {watchedRelationship === "OTHER" && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    Specify Relationship ("Other") <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("relationshipOther")}
                    placeholder="e.g. Legal Guardian, Cousin, Neighbor"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {errors.relationshipOther && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {String(errors.relationshipOther.message)}
                    </p>
                  )}
                </div>
              )}

              {/* Primary Contact Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Set as Primary Family Contact
                  </div>
                  <div className="text-[11px] text-slate-500">
                    If checked, this automatically unsets primary contact on other family members for this patient.
                  </div>
                </div>
                <input
                  type="checkbox"
                  {...register("isPrimaryContact")}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-900/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Save {type.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
