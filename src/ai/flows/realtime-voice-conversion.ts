'use server';

/**
 * @fileOverview A Genkit flow for real-time voice conversion.
 *
 * - realtimeVoiceConversion - A function that handles the real-time voice conversion process.
 * - RealtimeVoiceConversionInput - The input type for the realtimeVoiceConversion function.
 * - RealtimeVoiceConversionOutput - The return type for the realtimeVoiceConversion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Input schema for the real-time voice conversion flow.
const RealtimeVoiceConversionInputSchema = z.object({
  userAudioChunkDataUri: z
    .string()
    .describe(
      "A chunk of the user's live microphone audio, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  referenceVoiceId: z
    .string()
    .describe(
      'An identifier for the pre-uploaded reference voice template to convert the user audio to.'
    ),
});
export type RealtimeVoiceConversionInput = z.infer<typeof RealtimeVoiceConversionInputSchema>;

// Output schema for the real-time voice conversion flow.
const RealtimeVoiceConversionOutputSchema = z.object({
  convertedAudioChunkDataUri: z
    .string()
    .describe(
      "A chunk of the converted audio, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RealtimeVoiceConversionOutput = z.infer<typeof RealtimeVoiceConversionOutputSchema>;

// Wrapper function to call the Genkit flow.
export async function realtimeVoiceConversion(
  input: RealtimeVoiceConversionInput
): Promise<RealtimeVoiceConversionOutput> {
  return realtimeVoiceConversionFlow(input);
}

// Genkit flow definition for real-time voice conversion.
const realtimeVoiceConversionFlow = ai.defineFlow(
  {
    name: 'realtimeVoiceConversionFlow',
    inputSchema: RealtimeVoiceConversionInputSchema,
    outputSchema: RealtimeVoiceConversionOutputSchema,
  },
  async (input) => {
    // Determine the content type from the data URI.
    const audioContentTypeMatch = input.userAudioChunkDataUri.match(/^data:(.*?);base64,/);
    const audioContentType = audioContentTypeMatch ? audioContentTypeMatch[1] : 'audio/webm'; // Default to webm if not found

    // Use a hypothetical Google AI voice conversion model.
    // In a real scenario, this would interface with a specific audio-to-audio conversion model
    // which might not be directly available in the standard googleAI plugin at present.
    // This implementation assumes Genkit could expose such a model or act as an orchestrator for an external RVC service.
    const { media } = await ai.generate({
      model: googleAI.model('voice-converter-2.0-realtime'), // Hypothetical model name for voice conversion
      prompt: [
        {
          media: {
            url: input.userAudioChunkDataUri,
            contentType: audioContentType,
          },
        },
        {
          text: `Convert the provided audio chunk to match the characteristics of the reference voice identified by ID: ${input.referenceVoiceId}. Ensure real-time processing and maintain speech content. The output should be a single audio chunk.`,
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        // Additional configuration for real-time voice conversion might go here,
        // e.g., sampling rates, target voice parameters, latency hints.
      },
    });

    if (!media || !media.url) {
      throw new Error('No converted audio media returned from the AI model.');
    }

    return {
      convertedAudioChunkDataUri: media.url,
    };
  }
);
