"use client";

import Link from "next/link";

export default function Instructions() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-6">Spotify Developer API Setup</h1>
      <div className="max-w-3xl text-left space-y-4">
        <p className="text-lg">
          Follow these steps to set up your Spotify Developer API credentials
          and enable the app to interact with your Spotify account:
        </p>

        <ol className="list-decimal list-inside space-y-4 text-lg">
          <li>
            Go to the{" "}
            <a
              href="https://developer.spotify.com/dashboard/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline"
            >
              Spotify Developer Dashboard
            </a>{" "}
            and log in with your Spotify account.
          </li>

          <li>
            Click on <strong>"Create an App"</strong>. Fill in the required
            details like the app name and description, then click{" "}
            <strong>"Create"</strong>.
          </li>

          <li>
            Once your app is created, you'll be redirected to your app's
            settings page. Here, you will find your <strong>Client ID</strong>{" "}
            and <strong>Client Secret</strong>. Copy these credentials and keep
            them secure.
          </li>

          <li>
            Under the <strong>"Redirect URIs"</strong> section, click on{" "}
            <strong>"Edit Settings"</strong>. Add the following URL:
            <div className="bg-gray-800 rounded-lg p-2 my-2">
              <code>http://localhost:3000/callback</code>
            </div>
            Click <strong>"Add"</strong> and then <strong>"Save"</strong>.
          </li>

          <li>
            Save your <strong>Client ID</strong> and <strong>Client Secret</strong> in a
            safe place. You'll use these credentials to configure the app.
          </li>

          <li>
            Set up your environment variables:
            <div className="bg-gray-800 rounded-lg p-2 my-2">
              <code>SPOTIFY_CLIENT_ID=&lt;your-client-id&gt;</code>
              <br />
              <code>SPOTIFY_CLIENT_SECRET=&lt;your-client-secret&gt;</code>
              <br />
              <code>SPOTIFY_REDIRECT_URI=http://localhost:3000/callback</code>
            </div>
            Save these variables in a `.env` file in your project root directory.
          </li>
        </ol>

        <p className="text-lg">
          Once you've completed these steps, your Spotify Developer API
          credentials are set up, and you're ready to run the app!
        </p>
      </div>

      <Link
        href="/"
        className="mt-10 px-6 py-3 bg-green-500 rounded-lg text-lg font-medium hover:bg-green-600 transition duration-200"
      >
        Back to Home
      </Link>
    </div>
  );
}
