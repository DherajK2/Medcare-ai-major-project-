export interface TTSProvider {
  speak(text: string, onEnd?: () => void): void
  stop(): void
}

export class BrowserTTSProvider implements TTSProvider {
  private utterance: SpeechSynthesisUtterance | null = null

  speak(text: string, onEnd?: () => void): void {
    window.speechSynthesis.cancel()
    this.utterance = new SpeechSynthesisUtterance(text)
    this.utterance.rate = 0.9 
    this.utterance.pitch = 1.0
    this.utterance.volume = 1.0
    if (onEnd) this.utterance.onend = onEnd
    window.speechSynthesis.speak(this.utterance)
  }

  stop(): void {
    window.speechSynthesis.cancel()
  }
}

export const ttsProvider: TTSProvider = new BrowserTTSProvider()