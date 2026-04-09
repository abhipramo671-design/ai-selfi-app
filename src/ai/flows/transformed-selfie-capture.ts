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
  prompt: `Here are two images. The first image is a live camera frame. The second image is a template identity.
Your task is to replace the face in the first image with the face from the second image.
Ensure the replacement is seamless, matching the pose, lighting, and expression of the face in the first image.
The real face in the camera frame must be completely hidden and only the transformed identity should be visible.
Output only the single transformed image.

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
      model: googleAI.model('gemini-2.5-flash-image'), // Use a multimodal model capable of image manipulation
      prompt: transformedSelfiePrompt(input), // Pass the structured prompt with media and text
      config: {
        responseModalities: ['IMAGE'], // We expect an image as output
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
