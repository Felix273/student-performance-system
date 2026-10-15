import { DefaultSession } from "next-auth";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | "STUDENT";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: UserRole;
    schoolId?: string | null;
    schoolName?: string;
  }

  interface Session {
    user: {
      id?: string;
      role?: UserRole;
      schoolId?: string | null;
      schoolName?: string;
      mustChangePassword?: boolean;
      mfaEnabled?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    schoolId?: string | null;
    schoolName?: string;
    sessionVersion?: number;
    loginAt?: number;
    mustChangePassword?: boolean;
    mfaEnabled?: boolean;
  }
}
