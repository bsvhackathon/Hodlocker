import NextAuth from "next-auth"
import Twitter from "next-auth/providers/twitter"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the Twitter access token and username to the token
      if (account && account.provider === 'twitter') {
        // Use type assertion for Twitter profile data
        const twitterProfile = profile as { data?: { id: string; username: string } }
        token.twitterId = twitterProfile?.data?.id
        token.twitterUsername = twitterProfile?.data?.username
        token.twitterAccessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Make Twitter info available in the client session
      if (token) {
        session.user = session.user || {}
        session.user.twitterId = token.twitterId as string
        session.user.twitterUsername = token.twitterUsername as string
      }
      return session
    }
  }
})