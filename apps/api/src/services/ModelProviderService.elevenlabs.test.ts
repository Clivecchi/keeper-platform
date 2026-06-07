import { beforeEach, describe, expect, it, vi } from 'vitest';

const convertMock = vi.fn();

vi.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsClient: class {
    textToSpeech = {
      convert: convertMock,
    };
  },
}));

import { ModelProviderService } from './ModelProviderService.js';

function mockAudioStream(bytes: number[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Uint8Array.from(bytes));
      controller.close();
    },
  });
}

describe('ModelProviderService elevenlabs', () => {
  beforeEach(() => {
    convertMock.mockReset();
    convertMock.mockResolvedValue(mockAudioStream([1, 2, 3, 4]));
    process.env.ELEVENLABS_API_KEY = 'elevenlabs-test-key-abcdefghijklmnopqrstuvwxyz';
    process.env.STABILIZE_MODE = '1';
  });

  it('synthesizeVoice calls ElevenLabs textToSpeech.convert and returns audio buffer', async () => {
    const result = await ModelProviderService.synthesizeVoice({
      text: 'Hello from Keeper',
      voiceId: 'test-voice-id',
      model: 'eleven_multilingual_v2',
    });

    expect(convertMock).toHaveBeenCalledTimes(1);
    expect(convertMock).toHaveBeenCalledWith('test-voice-id', {
      text: 'Hello from Keeper',
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    });
    expect(result.audio).toEqual(Buffer.from([1, 2, 3, 4]));
    expect(result.contentType).toBe('audio/mpeg');
    expect(result.voiceId).toBe('test-voice-id');
    expect(result.model).toBe('eleven_multilingual_v2');
  });

  it('callModel returns base64 audio content for elevenlabs provider', async () => {
    const result = await ModelProviderService.callModel({
      messages: [{ role: 'user', content: 'Speak this' }],
      settings: {
        model: 'eleven_multilingual_v2',
        temperature: 0.5,
        max_tokens: 1000,
        retry: { max_retries: 0, retry_delay_ms: 0 },
      },
      provider: 'elevenlabs',
    });

    expect(result.success).toBe(true);
    expect(result.content).toBe(Buffer.from([1, 2, 3, 4]).toString('base64'));
    expect(convertMock).toHaveBeenCalledTimes(1);
  });
});
