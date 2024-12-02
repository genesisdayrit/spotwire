"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateSpotifyLoginUrl } from "@/app/utils/spotifyLogin";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("spotify_access_token");
    if (storedToken) {
      router.push("/profile"); // Redirect to profile if logged in
    }
  }, [router]);

  const loginUrl = generateSpotifyLoginUrl();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-10">spotwire</h1>
      
      {/* Log in Button */}
      <a
        href={loginUrl}
        className="px-6 py-3 bg-green-500 rounded-lg text-lg font-medium hover:bg-green-600 transition duration-200 mb-4"
      >
        Log in with Spotify
      </a>

      {/* Instructions Button */}
      <a
        href="/instructions"
        className="px-6 py-3 bg-green-500 rounded-lg text-lg font-medium hover:bg-green-600 transition duration-200 mb-4"
      >
        Instructions
      </a>
    </div>
  );
}
