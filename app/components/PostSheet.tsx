"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Link as LinkIcon, ImagePlus, ImageMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  BSocial,
  broadcast,
  signPayload,
  B_PROTOCOL_ADDRESS,
} from "@/lib/shuallet";
import { appPayForRawTx } from "@/lib/bsv-sdk-wallet";
import { bsv, toByteString } from "scrypt-ts";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { Tweet } from "./tweet/Tweet";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import LinkCard from "./LinkCard";
import { useTheme } from "next-themes";

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
const MAX_VIDEO_SIZE = 5 * 1024 * 1024; // 100MB in bytes - Adjust as needed

// URL regex pattern
const URL_PATTERN = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/g;
const TWITTER_PATTERN =
  /https?:\/\/((?:x|twitter)\.com\/\w+\/status\/\d+)[^\s]*/gi;
const YOUTUBE_PATTERN =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[^&\s]+|youtu\.be\/[^&\s]+)[^\s]*/gi;
const DEXSCREENER_PATTERN =
  /https?:\/\/(?:www\.)?dexscreener\.com\/([^\/\s]+)\/([^\/\s?&]+)[^\s]*/gi;

// Custom component for Twitter embeds
const TwitterEmbed = ({ url }: { url: string }) => {
  const match = url.match(/\/status\/(\d+)/);
  const tweetId = match?.[1];

  if (!tweetId) return null;

  return (
    <div className="twitter-embed my-2 overflow-hidden rounded-md bg-muted/50">
      <Tweet id={tweetId} />
    </div>
  );
};

// Add this component near TwitterEmbed
const YouTubeEmbed = ({ url }: { url: string }) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  const videoId = match?.[1];

  if (!videoId) return null;

  return (
    <div className="aspect-video my-2">
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="rounded-md"
      />
    </div>
  );
};

// Add this component near TwitterEmbed and YouTubeEmbed
const DexScreenerEmbed = ({ url }: { url: string }) => {
  // Add the theme hook
  const { theme } = useTheme();

  // Clean the URL first to remove any markdown formatting
  const cleanUrl = url
    .replace(/\[([^\]]*)\]\((.*?)\)/g, "$2")
    .replace(/\]\(https?:.*$/g, ""); // Remove trailing markdown artifacts

  // Extract the chain and pair address from the URL
  const match = cleanUrl.match(/dexscreener\.com\/([^\/\s]+)\/([^\/\s?&]+)/);
  const chain = match?.[1];
  const pairAddress = match?.[2];

  if (!chain || !pairAddress) return null;

  // Use the current theme to determine chart theme
  const chartTheme = theme === "dark" ? "dark" : "light";

  return (
    <div className="-mx-4 sm:-mx-2 md:mx-0 pr-4 sm:pr-2 md:pr-0 bg-transparent">
      {/* Mobile view (hidden on md and up) */}
      <div
        className="md:hidden relative w-full"
        style={{ paddingBottom: "140%" }}
      >
        <iframe
          src={`https://dexscreener.com/${chain}/${pairAddress}?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartDefaultOnMobile=1&chartTheme=${chartTheme}&theme=${chartTheme}&chartStyle=1&chartType=usd&interval=5`}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            border: 0,
          }}
          className="rounded-md"
        />
      </div>

      {/* Desktop view (hidden on smaller than md) */}
      <div className="hidden md:block relative w-full h-[200px]">
        <iframe
          src={`https://dexscreener.com/${chain}/${pairAddress}?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartDefaultOnMobile=1&chartTheme=${chartTheme}&theme=${chartTheme}&chartStyle=1&chartType=usd&interval=5`}
          style={{ width: "100%", height: "100%", border: 0 }}
          className="rounded-md"
        />
      </div>
    </div>
  );
};

export default function PostSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [contentHistory, setContentHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [attachment, setAttachment] = useState<{
    type: 'image' | 'video';
    buffer: ArrayBuffer;
    mimeType: string;
    preview: string;
  } | null>(null);
  const { toast } = useToast();

  // Add ref for the textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Add a ref for the file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modified useEffect with a small delay
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Add content to history when it changes
  useEffect(() => {
    if (content && content !== contentHistory[historyIndex]) {
      setContentHistory((prev) => [
        ...prev.slice(0, historyIndex + 1),
        content,
      ]);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [content]);

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText.match(URL_PATTERN)) {
      e.preventDefault();

      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const textBefore = content.slice(0, cursorPosition);
      const textAfter = content.slice(textarea.selectionEnd);

      // Convert URL to markdown link
      const newContent = `${textBefore}[${pastedText}](${pastedText})${textAfter}`;
      setContent(newContent);

      // Set cursor position after the link
      setTimeout(() => {
        const newPosition = cursorPosition + pastedText.length * 2 + 4; // Account for []()
        textarea.selectionStart = newPosition;
        textarea.selectionEnd = newPosition;
      }, 0);
    }
  };

  // Handle normal typing
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const textarea = e.target;
    const cursorPosition = textarea.selectionStart;

    // Check if the last character typed was a space or newline
    if (
      newContent.length > content.length &&
      (newContent.endsWith(" ") || newContent.endsWith("\n"))
    ) {
      // Get the text before the space/newline
      const textBeforeSpace = newContent.slice(0, -1);

      // Find URLs in the last word
      const words = textBeforeSpace.split(/\s/);
      const lastWord = words[words.length - 1];

      if (lastWord.match(URL_PATTERN)) {
        // Convert URL to markdown link
        words[words.length - 1] = `[${lastWord}](${lastWord})`;

        // Join everything back together with the trailing space
        const updatedContent = words.join(" ") + newContent.slice(-1);
        setContent(updatedContent);

        // Restore cursor position after the link
        setTimeout(() => {
          textarea.selectionStart = cursorPosition;
          textarea.selectionEnd = cursorPosition;
        }, 0);

        return;
      }
    }

    setContent(newContent);
  };

  // Handle undo keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();

      if (historyIndex > 0) {
        setHistoryIndex((prev) => prev - 1);
        setContent(contentHistory[historyIndex - 1]);
      }
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !attachment) {
      toast({
        variant: "destructive",
        description: "Please add content or an attachment to your post",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const ownerKey = localStorage.getItem("ownerKey");
      if (!ownerKey) throw new Error("Wallet not connected");
      const ownerPublicKey = localStorage.getItem("ownerPublicKey");
      if (!ownerPublicKey) throw new Error("Public key not found");
      const walletAddress = localStorage.getItem("walletAddress");

      let muxAssetId = null;
      if (attachment?.type === 'video') {
        setProgress(10);
        console.log("Starting Mux upload...");
        // 1. Get upload URL from your backend
        // const uploadUrlResponse = await fetch('/api/mux/upload-url');
        // const { uploadUrl, assetId } = await uploadUrlResponse.json();
        // muxAssetId = assetId; // Store the Mux Asset ID

        // 2. Upload the file buffer to Mux
        // await fetch(uploadUrl, { method: 'PUT', body: attachment.buffer });
        // console.log("Mux upload complete, Asset ID:", muxAssetId);
        // --- End Placeholder ---

        // Simulate Mux upload progress/time for now
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload time
        muxAssetId = `mux_placeholder_${Date.now()}`; // Use a placeholder ID
        setProgress(50);
        toast({ description: "Video processed (simulated)." }); // Feedback
      } else if (attachment?.type === 'image') {
        setProgress(50); // Skip Mux steps for image
      } else {
        setProgress(50); // No attachment
      }

      // Create base transaction
      const tx = new bsv.Transaction();

      // --- Create BSocial Output (First Output, only if text content exists) ---
      // Only proceed if there is text content
      if (content.trim()) {
          const bSocial = new BSocial("hodlocker.com");
          const post = bSocial.post();
          post.addText(content); // Add only the text content

          const payload = signPayload(post, ownerKey!);
          const bPostScript = bsv.Script.buildSafeDataOut(toByteString(payload));
          tx.addOutput(
              new bsv.Transaction.Output({
                  script: bPostScript,
                  satoshis: 0,
              })
          );
      }
      // --- End BSocial Output ---


      // --- Create B Protocol Output (Second Output, if attachment exists) ---
      if (attachment) {
        // Create B protocol output for the image or video
        const bProtocolScript = bsv.Script.buildSafeDataOut([
          B_PROTOCOL_ADDRESS,
          Buffer.from(attachment.buffer),
          attachment.mimeType
        ]);

        tx.addOutput(
          new bsv.Transaction.Output({
            script: bProtocolScript,
            satoshis: 0
          })
        );
      }
      // --- End B Protocol Output ---

      // Pay for and broadcast transaction
      setProgress(85);
      const rawtx = await appPayForRawTx(
        tx.toString(),
        process.env.NEXT_PUBLIC_APP_PAYMENT_KEY!
      );
      const txid = await broadcast(rawtx);

      // Save to database - Mux ID is still sent here for backend handling
      setProgress(95);
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          txid,
          owner_public_key: ownerPublicKey!, // Assert exists after check
          wallet_address: walletAddress,
          hasAttachment: !!attachment,
          attachmentType: attachment?.type,
          mimeType: attachment?.mimeType,
          muxAssetId: muxAssetId, // Mux ID sent to backend
        }),
      });

      toast({ description: "Post created successfully!" });
      setTimeout(() => {
        setContent("");
        setAttachment(null); // Reset attachment state
        onClose();
      }, 500);
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Failed to create post",
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    let maxSize = 0;
    let expectedType = "";

    if (isImage) {
      maxSize = MAX_IMAGE_SIZE;
      expectedType = "Image";
    } else if (isVideo) {
      maxSize = MAX_VIDEO_SIZE;
      expectedType = "Video";
    } else {
       toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: `Only images or videos are supported.`,
        duration: 5000,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Check file size
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: `${expectedType} Too Large`,
        description: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the ${(maxSize / 1024 / 1024).toFixed(0)}MB limit.`,
        duration: 5000,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Check specific valid types (optional refinement)
    const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime"]; // Add more as needed

    if ((isImage && !validImageTypes.includes(file.type)) || (isVideo && !validVideoTypes.includes(file.type))) {
         toast({
            variant: "destructive",
            title: "Unsupported Format",
            description: `The provided ${isImage ? 'image' : 'video'} format (${file.type}) is not supported.`,
            duration: 5000,
          });
         if (fileInputRef.current) fileInputRef.current.value = "";
         return;
    }


    // Create a URL preview for display
    const previewUrl = URL.createObjectURL(file);

    // Read as ArrayBuffer for blockchain storage
    const bufferReader = new FileReader();
    bufferReader.onload = () => {
      if (bufferReader.result instanceof ArrayBuffer) {
        setAttachment({
          type: isImage ? 'image' : 'video',
          buffer: bufferReader.result,
          mimeType: file.type,
          preview: previewUrl
        });
      }
    };

    bufferReader.onerror = () => {
      toast({
        variant: "destructive",
        title: `${expectedType} Upload Failed`,
        description: `There was a problem processing your ${expectedType.toLowerCase()}. Please try again.`,
        duration: 5000,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    bufferReader.readAsArrayBuffer(file);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="w-full md:w-1/3 mx-auto rounded-t-[10px] z-[200]"
      >
        <SheetHeader>
          <SheetTitle></SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-8">
          {isPreview ? (
            <div
              className="min-h-[200px] max-h-[70vh] overflow-y-auto p-3 border rounded-md prose prose-sm dark:prose-invert max-w-none bg-background"
              onClick={() => setIsPreview(false)}
            >
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  a: ({ node, href, children, ...props }) => {
                    if (
                      href &&
                      (TWITTER_PATTERN.test(href) ||
                        YOUTUBE_PATTERN.test(href) ||
                        DEXSCREENER_PATTERN.test(href))
                    ) {
                      return (
                        <a
                          {...props}
                          href={href}
                          className="text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      );
                    }

                    if (
                      href &&
                      !href.startsWith("/") &&
                      !href.startsWith("#")
                    ) {
                      return <LinkCard href={href}>{children}</LinkCard>;
                    }

                    return (
                      <a
                        {...props}
                        href={href}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {content
                  .replace(
                    /\[([^\]]*)\]\(https?:\/\/(x|twitter)\.com[^)]*\)/gi,
                    "$1"
                  )
                  .replace(TWITTER_PATTERN, "")

                  .replace(
                    /\[([^\]]*)\]\(https?:\/\/(www\.)?(youtube\.com|youtu\.be)[^)]*\)/gi,
                    "$1"
                  )
                  .replace(YOUTUBE_PATTERN, "")

                  .replace(
                    /\[([^\]]*)\]\(https?:\/\/(www\.)?dexscreener\.com[^)]*\)/gi,
                    "$1"
                  )
                  .replace(DEXSCREENER_PATTERN, "")

                  .trim()}
              </ReactMarkdown>

              {/* Twitter embed handling - Extract from both formats */}
              {(() => {
                // Find all Twitter links in the content
                const twitterLinks = Array.from(
                  content.matchAll(TWITTER_PATTERN)
                );

                // If no matches found, don't render anything
                if (twitterLinks.length === 0) return null;

                // Extract the first Twitter URL
                const tweetUrl = twitterLinks[0][0];
                const match = tweetUrl.match(
                  /(?:twitter|x)\.com\/[^\/]+\/status\/(\d+)/
                );
                const tweetId = match?.[1];

                // If no valid ID found, don't render
                if (!tweetId) return null;

                // Render the tweet with the ID
                return (
                  <div className="mt-4">
                    <Tweet id={tweetId} />
                  </div>
                );
              })()}

              {/* YouTube embed */}
              {Array.from(content.matchAll(YOUTUBE_PATTERN))[0] && (
                <YouTubeEmbed
                  url={
                    Array.from(content.matchAll(YOUTUBE_PATTERN))[0][0].split(
                      "&"
                    )[0]
                  }
                />
              )}

              {/* DexScreener embed */}
              {Array.from(content.matchAll(DEXSCREENER_PATTERN))[0] && (
                <DexScreenerEmbed
                  url={
                    Array.from(
                      content.matchAll(DEXSCREENER_PATTERN)
                    )[0][0].split("?")[0]
                  }
                />
              )}

              {/* Conditionally render Image or Video Preview */}
              {attachment && isPreview && (
                <div className="mt-4 not-prose"> {/* Use not-prose to prevent prose styling */}
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.preview}
                      alt="Post image"
                      className="w-full h-auto max-h-[500px] object-contain rounded-md mx-auto block"
                    />
                  ) : ( // attachment.type === 'video'
                    <video
                      src={attachment.preview}
                      controls
                      className="w-full h-auto max-h-[500px] object-contain rounded-md mx-auto block bg-black"
                      preload="metadata"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="What's the latest on-chain?"
                value={content}
                onChange={handleContentChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                className="min-h-[200px] resize-none relative z-50 font-sans 
                  bg-slate-50 dark:bg-slate-800/80
                  border border-slate-200 dark:border-slate-700 
                  focus:border-primary/30 dark:focus:border-primary/30
                  focus:ring-0 focus:ring-offset-0
                  focus:outline-none
                  transition-all duration-200"
                maxLength={500}
                autoFocus
              />

              {/* Show Image or Video Thumbnail in Edit mode */}
              {attachment && !isPreview && (
                 <div className="absolute bottom-2 right-2 w-24 h-24 rounded-lg border border-muted bg-black overflow-hidden group z-50">
                   {attachment.type === 'image' ? (
                     <img
                       src={attachment.preview}
                       alt="Preview"
                       className="w-full h-full object-contain"
                     />
                   ) : (
                      <video
                        src={attachment.preview}
                        muted
                        className="w-full h-full object-contain"
                        preload="metadata"
                      />
                   )}
                 </div>
               )}
            </div>
          )}

          <div className="space-y-4">
            {isLoading && (
              <Progress value={progress} className="h-1 transition-all" />
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-sans">
                  {content.length}/500
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPreview(!isPreview)}
                  className="font-sans"
                >
                  {isPreview ? "Edit" : "Preview"}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  // Accept both image and video files
                  accept="image/*,video/*"
                  className="hidden"
                  id="file-upload" // Changed ID
                  onChange={handleFileUpload} // Use updated handler
                  ref={fileInputRef}
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (attachment) {
                      // Clear attachment and reset file input
                      setAttachment(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      // Revoke object URL to free memory
                      if (attachment.preview) URL.revokeObjectURL(attachment.preview);
                    } else {
                      // Trigger file input
                      document.getElementById("file-upload")?.click();
                    }
                  }}
                  className="h-8 w-8 p-2"
                  title={attachment ? `Remove ${attachment.type}` : "Add image or video"} // Dynamic tooltip
                >
                  {attachment ? (
                    <ImageMinus className="h-4 w-4 text-red-500" /> // Keep simple remove icon
                  ) : (
                    <ImagePlus className="h-4 w-4" /> // Keep simple add icon
                    // Or use a different icon like Paperclip
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handlePost}
                  // Disable if loading OR if no content AND no attachment
                  disabled={isLoading || (!content.trim() && !attachment)}
                  className={cn(
                    "w-24 rounded-full group border transition-all duration-300 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-amber-500/10 hover:border-l-4 hover:border-orange-500 font-sans",
                    !(!content.trim() || isLoading)
                      ? "border-orange-300 dark:border-orange-700"
                      : "border-input",
                    "disabled:opacity-70 disabled:hover:bg-transparent disabled:hover:border-input disabled:hover:border-l disabled:cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Posting</span>
                    </>
                  ) : (
                    <span className="group-hover:text-orange-500">Post</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
