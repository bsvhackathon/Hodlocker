import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      twitterId?: string
      twitterUsername?: string
    } & DefaultSession["user"]
  }
} 