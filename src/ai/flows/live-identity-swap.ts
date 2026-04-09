'use server';
/**
 * @fileOverview A Genkit flow for real-time identity replacement in a live camera feed.
 *
 * - liveIdentitySwap - A function that handles the live identity replacement process.
 * - LiveIdentitySwapInput - The input type for the liveIdentitySwap function.
 * - LiveIdentitySwapOutput - The return type for the liveIdentitySwap function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LiveIdentitySwapInputSchema = z.object({
  cameraFrameDataUri: z
    .string()
    .describe(
      "The current live camera frame, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  templateImageDataUri: z
    .string()
    .describe(
      "The user's uploaded template face image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  faceTrackingData: z
    .string()
    .describe(
      'JSON string containing on-device face tracking data (landmarks, head movement, expressions).'
    ),
});
export type LiveIdentitySwapInput = z.infer<typeof LiveIdentitySwapInputSchema>;

const LiveIdentitySwapOutputSchema = z.object({
  transformedFrameDataUri: z
    .string()
    .describe(
      "The processed camera frame with the identity replaced, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type LiveIdentitySwapOutput = z.infer<typeof LiveIdentitySwapOutputSchema>;

const liveIdentitySwapPrompt = ai.definePrompt({
  name: 'liveIdentitySwapPrompt',
  input: { schema: LiveIdentitySwapInputSchema },
  output: { schema: LiveIdentitySwapOutputSchema },
  model: 'googleai/gemini-2.5-flash-image',
  prompt: `You are an advanced AI system specialized in real-time face identity replacement.
Your task is to process the provided \`liveCameraFrame\` and replace the face within it with the \`templateImage\`, ensuring a seamless and realistic integration.

Key requirements for the transformation:
1.  **Complete Identity Masking:** The original face in the \`liveCameraFrame\` must be entirely and undetectably replaced by the \`templateImage\`'s identity.
2.  **Pose Matching:** The \`templateImage\` face must accurately match the head pose of the face detected in the \`liveCameraFrame\`.
3.  **Expression Transfer:** The \`templateImage\` face should adopt the facial expressions (e.g., smile, frown) of the face detected in the \`liveCameraFrame\`.
4.  **Lighting & Color Matching:** The \`templateImage\` face must be rendered with lighting conditions and color grading that perfectly match the \`liveCameraFrame\`'s environment.
5.  **Seamless Integration:** The replaced face should blend naturally with the rest of the body and background in the \`liveCameraFrame\`, avoiding any visual artifacts or uncanny valley effects.

Use the \`faceTrackingData\` (which is a JSON string describing landmarks, head movement, and expressions) to accurately guide the pose, expression, and integration of the \`templateImage\` into the \`liveCameraFrame\`.

**Input Data:**
Live Camera Frame: {{media url=cameraFrameDataUri}}
Template Identity Image: {{media url=templateImageDataUri}}
Face Tracking Data: {{{faceTrackingData}}}

**Output:**
Provide the transformed camera frame as a data URI string, enclosed in a JSON object with the key \`transformedFrameDataUri\`.`,
});

const liveIdentitySwapFlow = ai.defineFlow(
  {
    name: 'liveIdentitySwapFlow',
    inputSchema: LiveIdentitySwapInputSchema,
    outputSchema: LiveIdentitySwapOutputSchema,
  },
  async (input) => {
    // This flow orchestrates the identity replacement. In a production environment
    // with a dedicated backend (FastAPI + GPU), this call to `liveIdentitySwapPrompt`
    // would conceptually represent the interaction with that specialized AI service.
    // The prompt guides the multimodal model to perform the complex image manipulation
    // and return the result in the specified JSON format.
    const { output } = await liveIdentitySwapPrompt(input);
    if (!output || !output.transformedFrameDataUri) {
      throw new Error('Failed to get transformed frame from AI model.');
    }
    return output;
  }
);

export async function liveIdentitySwap(input: LiveIdentitySwapInput): Promise<LiveIdentitySwapOutput> {
  return liveIdentitySwapFlow(input);
}
