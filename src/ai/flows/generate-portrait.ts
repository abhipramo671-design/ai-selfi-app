
'use server';

/**
 * @fileOverview A Genkit flow for generating professional AI portraits from user selfies.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const GeneratePortraitInputSchema = z.object({
  imageUrls: z.array(z.string()).describe('Array of download URLs for the reference selfies.'),
  userId: z.string().describe('The ID of the user.'),
});
export type GeneratePortraitInput = z.infer<typeof GeneratePortraitInputSchema>;

const GeneratePortraitOutputSchema = z.object({
  imageUrl: z.string().describe('The generated portrait data URI or URL.'),
});
export type GeneratePortraitOutput = z.infer<typeof GeneratePortraitOutputSchema>;

export async function generateAIPortrait(input: GeneratePortraitInput): Promise<GeneratePortraitOutput> {
  return generateAIPortraitFlow(input);
}

const generateAIPortraitFlow = ai.defineFlow(
  {
    name: 'generateAIPortraitFlow',
    inputSchema: GeneratePortraitInputSchema,
    outputSchema: GeneratePortraitOutputSchema,
  },
  async (input) => {
    // We use the first image as the primary reference and others as context
    const primaryImage = input.imageUrls[0];
    const contextImages = input.imageUrls.slice(1);

    // Prompt for Imagen-4 (or similar available via Genkit)
    // Note: Since we are using Gemini Flash for multimodal reasoning + image gen instructions
    // Conceptually we are doing high-quality portrait generation.
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Generate a ultra-realistic professional studio portrait of the person in the reference images. 
      Style: Professional corporate headshot, soft 3-point studio lighting, blurred office background.
      Quality: 8k resolution, highly detailed skin texture, neutral professional expression.
      Reference Image: ${primaryImage}`,
      config: {
        // Additional config for Imagen if needed
      }
    });

    if (!media || !media.url) {
      // Fallback: If imagen is not available or fails, we use Gemini to "enhance" a portrait 
      // of the reference image conceptually. For MVP we'll throw or return a placeholder
      // In a real scenario, this would call the text-to-image or image-to-image pipeline.
      throw new Error('Image generation model currently unavailable.');
    }

    return {
      imageUrl: media.url,
    };
  }
);
