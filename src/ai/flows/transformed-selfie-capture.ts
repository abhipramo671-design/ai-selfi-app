
'use server';
/**
 * @fileOverview This file implements a Genkit flow for capturing a transformed selfie.
 * It takes a live camera frame and a template identity image, then uses an AI model
 * to replace the real face in the camera frame with the template identity,
 * matching pose, lighting, and expressions.
 *
 * - transformedSelfieCapture - A function that handles the transformed selfie capture process.
 * - TransformedSelfieCaptureInput - The input type for the transformedSelfieCapture function.
 * - TransformedSelfieCaptureOutput - The return type for the transformedSelfieCapture function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Input Schema
const TransformedSelfieCaptureInputSchema = z.object({
  currentCameraFrame: z
    .string()
    .describe(
      "A photo of the user's real face from the camera feed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  templateIdentityImage: z
    .string()
    .describe(
      "A template image of the identity to be used for replacement, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TransformedSelfieCaptureInput = z.infer<
  typeof TransformedSelfieCaptureInputSchema
>;

// Output Schema
const TransformedSelfieCaptureOutputSchema = z.object({
  transformedSelfie: z
    .string()
    .describe(
      "The generated selfie image with the real face replaced by the template identity, as a data URI."
    ),
});
export type TransformedSelfieCaptureOutput = z.infer<
  typeof TransformedSelfieCaptureOutputSchema
>;

// Wrapper function to call the flow
export async function transformedSelfieCapture(
  input: TransformedSelfieCaptureInput
): Promise<TransformedSelfieCaptureOutput> {
  return transformedSelfieCaptureFlow(input);
}

const transformedSelfiePrompt = ai.definePrompt({
  name: 'transformedSelfiePrompt',
  input: {schema: TransformedSelfieCaptureInputSchema},
  output: {schema: TransformedSelfieCaptureOutputSchema},
  prompt: `You are an expert at high-end digital face replacement.
Given a camera frame and a template identity, create a new image where the face in the camera frame is seamlessly replaced by the identity in the template.

Instructions:
1. Maintain the exact head pose, lighting, and facial expression of the person in the camera frame.
2. Fully integrate the features of the template identity so the replacement is indistinguishable from reality.
3. The background and clothing from the camera frame must remain unchanged.
4. Output the final result as an image.

Camera Frame: {{media url=currentCameraFrame}}
Template Identity: {{media url=templateIdentityImage}}`,
});

const transformedSelfieCaptureFlow = ai.defineFlow(
  {
    name: 'transformedSelfieCaptureFlow',
    inputSchema: TransformedSelfieCaptureInputSchema,
    outputSchema: TransformedSelfieCaptureOutputSchema,
  },
  async (input) => {
    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'), // Using a stable multimodal model
      prompt: transformedSelfiePrompt(input),
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate transformed selfie image.');
    }

    return {
      transformedSelfie: media.url,
    };
  }
);
