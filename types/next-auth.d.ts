import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
    schoolId?: string | null;
    schoolName?: string;
  }

  interface Session {
    user: {
      id?: string;
      role?: string;
      schoolId?: string | null;
      schoolName?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    schoolId?: string | null;
    schoolName?: string;
  }
}
