import { Metadata } from 'next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Frequently Asked Questions about Hodlocker',
};

const FAQPage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <Card className="border-none">
        <CardHeader>
          <h1 className="text-4xl font-bold text-center mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-center">
            Everything you need to know about Hodlocker
          </p>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="what-is-hodlocker">
              <AccordionTrigger className="text-xl font-bold tracking-tight">What is Hodlocker?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Hodlocker is a social media platform built on the Bitcoin blockchain that enables users to lock Bitcoin to
                posts until a specified block height. This feature promotes long-term savings while facilitating interactive
                engagement with content. Hodlocker has been re-engineered using
                <a href="https://github.com/jdh7190/SHUAllet.js" className="text-primary hover:underline"> SHUAllet.js</a>, an open-source
                Bitcoin wallet, and is integrated with a
                <a href="https://github.com/zer0dt/shualletjs-nextjs-boilerplate" className="text-primary hover:underline"> Next.js template</a>.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="how-it-works">
              <AccordionTrigger className="text-xl font-bold tracking-tight">How does Hodlocker work?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ol className="list-decimal pl-6 space-y-4">
                  <li><strong>Log In with Your Wallet:</strong> Sign in using your SHUAllet.js wallet to secure your access and manage your Bitcoin funds.</li>
                  <li><strong>Customize Your Profile:</strong> Go to your profile page to change your username, avatar, and cover image.</li>
                  <li>
                    <strong>Signal Posts by Lock:</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-2">
                      <li>Choose a post to lock Bitcoin to, which helps boost its ranking in the "top" section.</li>
                      <li>Specify the amount of Bitcoin to lock and set the block height for unlocking.</li>
                      <li>Confirm the transaction—there is no fee for locking.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Featured Posts:</strong> Posts in the "featured" tab are sorted by the latest locked posts, ensuring that the most recent signals get noticed.
                  </li>
                  <li>
                    <strong>Manage Your Locks in the Vault:</strong> Go to the Vault page to view:
                    <ul className="list-disc pl-6 mt-2 space-y-2">
                      <li><strong>Active Locks:</strong> Locks currently in effect.</li>
                      <li><strong>Unlockable Locks:</strong> Locks that have reached the specified block height and can be unlocked.</li>
                      <li><strong>Spent Locks:</strong> Locks that have been unlocked and retrieved.</li>
                    </ul>
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="super-liking">
              <AccordionTrigger className="text-xl font-bold tracking-tight">What is Super Liking?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Super Liking allows you to send a "super like" as a gift to other Bitcoiners. A 1% fee applies to each super like transaction.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="unlock-bitcoin">
              <AccordionTrigger className="text-xl font-bold tracking-tight">How do I unlock my Bitcoin?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Wait until the blockchain reaches the lock's block height, then go to the Vault page and navigate to "Unlockable Locks."
                Follow the instructions to sign the transaction and retrieve your Bitcoin.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="open-source">
              <AccordionTrigger className="text-xl font-bold tracking-tight">Is Hodlocker open source?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                The latest version of Hodlocker is not open source. However, the SHUAllet.js Next.js boilerplate used for wallet integration is available on GitHub.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fees" className="border-b">
              <AccordionTrigger className="text-xl font-bold tracking-tight">Are there any fees?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Locking:</strong> No fee.</li>
                  <li><strong>Super Liking:</strong> 1% fee applies.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default FAQPage;
