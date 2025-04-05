'use client'

import { useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ProfileFeed } from "@/app/components/ProfileFeed" // Keep ProfileFeed here if it needs client interactivity or state

// Define Profile type matching the data structure from the server
type Profile = {
  id: string;
  created_at: string;
  username: string | null;
  owner_public_key: string;
  avatar_url: string | null;
  cover_url: string | null;
  // Add other profile fields if they exist
};

interface UserProfileClientProps {
  profile: Profile;
}

export function UserProfileClient({ profile }: UserProfileClientProps) {
  // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  const openModal = (imageUrl: string | null) => {
    if (imageUrl) {
      setModalImageUrl(imageUrl);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalImageUrl(null);
  };

  const joinDate = new Date(profile.created_at);
  const avatarSrc = profile.avatar_url || "/b.jpg"; // Determine avatar source

  return (
    <div>
      {/* Cover Image */}
      <div
        className={`relative w-full h-48 ${profile.cover_url ? 'cursor-pointer' : ''}`} // Add cursor pointer if clickable
        style={profile.cover_url ? {
          backgroundImage: `url(${profile.cover_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {
          background: 'linear-gradient(to right, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1))'
        }}
        onClick={() => openModal(profile.cover_url)} // Add onClick handler
      />

      {/* Profile section */}
      <div className="max-w-2xl mx-auto">
        <div className="px-6 sm:px-6">
          <div className="relative -mt-16">
             {/* Wrap Avatar interaction */}
             <div className="cursor-pointer inline-block" onClick={() => openModal(avatarSrc)}>
               <Avatar className="h-32 w-32 ring-4 ring-background">
                 <AvatarImage src={avatarSrc} alt={profile.username || 'User Avatar'} />
                 <AvatarFallback>{profile.username ? profile.username.charAt(0).toUpperCase() : '?'}</AvatarFallback>
               </Avatar>
             </div>

             {/* Username and Join Date container */}
             <div className="mt-2">
              <div className="font-sans text-lg font-bold">
                {profile.username || `..${profile.owner_public_key.slice(-12)}`}
              </div>
              <div className="text-xs font-sans text-muted-foreground/50 break-all">
                {`${profile.owner_public_key.slice(0, 12)}...${profile.owner_public_key.slice(-12)}`}
              </div>
              <div className="text-sm font-sans text-muted-foreground mt-1 pb-2">
                {`Joined ${joinDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}`}
              </div>
            </div>

            {/* Placeholder for potential actions/buttons */}
            <div>
              {/* Example: Server Component button or pass props to another client component */}
            </div>
          </div>
        </div>

        {/* ProfileFeed might need profile data too */}
        <ProfileFeed profile={profile} />
      </div>

      {/* Image Modal */}
      {isModalOpen && modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          onClick={closeModal} // Close modal when clicking the background
        >
          <img
            src={modalImageUrl}
            alt="Fullscreen view"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
          />
        </div>
      )}
    </div>
  );
} 