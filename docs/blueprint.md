# **App Name**: MimicMe AI Camera

## Core Features:

- Template Identity Management: Allow users to upload, preview, and manage their template image (face) and reference audio (voice) identities.
- AI-Powered Live Identity Swap: Enable real-time face detection, tracking, and full identity replacement in the live camera feed using uploaded template identities, adjusting for pose, lighting, and expressions. Utilizes on-device MediaPipe for detection and backend AI tools for sophisticated rendering.
- Real-time Voice Transformation: Perform live conversion of the user's microphone audio to match the uploaded reference audio during camera use, powered by real-time RVC models.
- Instant AI Mode Toggle: Implement an on-device switch to immediately enable or disable AI identity and voice transformation, ensuring zero latency for seamless switching between real and transformed camera views.
- Transformed Photo Capture: Capture and save still images showcasing only the AI-generated identity replacement, completely masking the real person.
- Transformed Video Recording: Record and save videos featuring the AI-generated identity replacement and synchronized transformed voice.
- Performance & Network Resiliency: Integrate optimizations for sub-150ms latency and a smooth 24-30 FPS camera experience, including adaptive frame skipping, compressed data transfer, and robust handling of network fluctuations.

## Style Guidelines:

- Primary color: A deep, vibrant techno-purple (#7C20E5) to evoke sophistication and cutting-edge AI.
- Background color: A very dark, subtly purple-tinged grey (#25203A) to provide a sleek, high-tech canvas that highlights content.
- Accent color: A bright, saturated sky blue (#89BBFF) to draw attention to interactive elements and important states, offering strong contrast.
- Body and headline font: 'Inter' (sans-serif) for its modern, clean, and objective aesthetic, suitable for technical interfaces.
- Utilize minimalist, geometric line icons to maintain a modern and professional AI-centric visual style. Icons should be clear and instantly recognizable for core actions like upload, toggle, capture, and record.
- Adopt a clean, intuitive layout that prioritizes the camera feed as the central element. Essential controls like upload buttons, the AI toggle, and capture/record functions should be prominently placed for easy access, with AI status indicators subtly integrated.
- Incorporate subtle and swift animations for UI element transitions, button feedback, and loading indicators (e.g., when template identities are processed). Ensure animations do not impede the real-time fluidity of the camera experience, particularly for the AI toggle.