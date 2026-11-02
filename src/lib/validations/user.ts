import { z } from "zod";

export const RelationshipEnum = z.enum([
  "SON",
  "DAUGHTER",
  "SPOUSE",
  "SIBLING",
  "GRANDCHILD",
  "PARENT",
  "FRIEND",
  "OTHER",
]);

export const VerificationStatusEnum = z.enum(["PENDING", "VERIFIED", "REJECTED"]);

export const UserTypeEnum = z.enum(["admin", "caregiver", "patient", "family"]);

// Admin creation schema
export const CreateAdminSchema = z.object({
  type: z.literal("admin"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().optional().nullable(),
});

// Caregiver creation schema
export const CreateCaregiverSchema = z.object({
  type: z.literal("caregiver"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().optional().nullable(),
  education: z.string().trim().optional().nullable(),
  previousExperience: z.string().trim().optional().nullable(),
  verificationStatus: VerificationStatusEnum.default("VERIFIED"),
});

// Patient creation schema
export const CreatePatientSchema = z.object({
  type: z.literal("patient"),
  name: z.string().trim().min(1, "Name is required"),
  dob: z.string().or(z.date()).refine((d) => !isNaN(new Date(d).getTime()), {
    message: "Valid Date of Birth is required",
  }),
  gender: z.string().trim().optional().nullable(),
  relationship: z.string().trim().min(1, "Relationship to caregiver is required"),
  primaryCondition: z.string().trim().optional().nullable(),
  bloodType: z.string().trim().optional().nullable(),
  allergies: z.string().trim().optional().nullable(),
  emergencyContact: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  avatarColor: z.string().trim().optional().default("#0D9488"),
  caregiverId: z.string().trim().min(1, "Caregiver ID is required"),
});

// Family member creation schema
export const CreateFamilySchema = z
  .object({
    type: z.literal("family"),
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    patientId: z.string().trim().min(1, "Patient ID is required"),
    relationship: RelationshipEnum,
    relationshipOther: z.string().trim().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    isPrimaryContact: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.relationship === "OTHER" && (!data.relationshipOther || !data.relationshipOther.trim())) {
        return false;
      }
      return true;
    },
    {
      message: "Please specify the custom relationship description when selecting 'OTHER'",
      path: ["relationshipOther"],
    }
  );

export const CreateUserSchema = z.union([
  CreateAdminSchema,
  CreateCaregiverSchema,
  CreatePatientSchema,
  CreateFamilySchema,
]);

// Update schemas
export const UpdateAdminSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateCaregiverSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional().nullable(),
  education: z.string().trim().optional().nullable(),
  previousExperience: z.string().trim().optional().nullable(),
  verificationStatus: VerificationStatusEnum.optional(),
  isActive: z.boolean().optional(),
});

export const UpdatePatientSchema = z.object({
  name: z.string().trim().min(1).optional(),
  dob: z
    .string()
    .or(z.date())
    .optional()
    .refine((d) => !d || !isNaN(new Date(d).getTime()), {
      message: "Valid Date of Birth is required",
    }),
  gender: z.string().trim().optional().nullable(),
  relationship: z.string().trim().min(1).optional(),
  primaryCondition: z.string().trim().optional().nullable(),
  bloodType: z.string().trim().optional().nullable(),
  allergies: z.string().trim().optional().nullable(),
  emergencyContact: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  avatarColor: z.string().trim().optional(),
  caregiverId: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const UpdateFamilySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    relationship: RelationshipEnum.optional(),
    relationshipOther: z.string().trim().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    isPrimaryContact: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.relationship === "OTHER" && (!data.relationshipOther || !data.relationshipOther.trim())) {
        return false;
      }
      return true;
    },
    {
      message: "Please specify the custom relationship description when selecting 'OTHER'",
      path: ["relationshipOther"],
    }
  );

export const ResetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const ReassignCaregiverSchema = z.object({
  caregiverId: z.string().trim().min(1, "Caregiver ID is required"),
});
