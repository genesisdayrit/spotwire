'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      // Send the code to the backend for token exchange
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.access_token) {
            localStorage.setItem('spotify_access_token', data.access_token); // Store token
            router.push('/'); // Redirect to the homepage
          } else {
            console.error('Error exchanging code:', data);
          }
        })
        .catch((err) => {
          console.error('Error fetching access token:', err);
        });
    } else {
      console.error('Authorization code is missing.');
      router.push('/'); // Redirect to the homepage if no code is present
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <p>Authenticating with Spotify... Please wait.</p>
    </div>
  );
}

