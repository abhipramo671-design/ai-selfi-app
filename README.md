# AI Selfie Studio

Generate professional portraits from your selfies with AI using Next.js, Firebase, and Genkit.

## Features

- **Google Authentication**: Secure sign-in to save your portrait history.
- **AI Portrait Generation**: Advanced multimodal AI transforms your reference selfies into high-quality studio portraits.
- **Secure Storage**: Your reference images and generated masterpieces are stored securely in Firebase Storage.
- **Gallery & History**: Access and download all your previous creations from your personal gallery.

## Setup Instructions

### 1. Firebase Configuration
Ensure your `src/firebase/config.ts` is updated with your specific Firebase Project credentials.

### 2. Enable Firebase Services
- **Authentication**: Enable Google Sign-In in the Firebase Console. Add `studio.firebase.google.com` to the "Authorized domains".
- **Firestore**: Provision the Firestore database.
- **Storage**: Provision a Storage bucket for image uploads.

### 3. Environment Configuration
Add the necessary environment variables to your environment (e.g., `.env` file) for Genkit and Firebase.

### 4. Git Configuration
To configure your identity for commits in this environment, run the following in the terminal:

```bash
npm run setup:git
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS, ShadCN UI
- **Backend/DB**: Firebase (Auth, Firestore, Storage)
- **AI**: Genkit with Google Generative AI (Gemini/Imagen)
