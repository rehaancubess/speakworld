const MAX_USER_TURNS = 6;
const AUTO_FEEDBACK_TURN = 6;
const MIN_FEEDBACK_TURN = 3;
const SESSION_SECONDS = 150;

function stableBrowserIdentifier() {
  const key = 'sayscape-voice-user-v1';
  let value = localStorage.getItem(key);
  if (!value) {
    value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    localStorage.setItem(key, value);
  }
  return value;
}

function waitForDataChannel(channel, timeoutMs = 12_000) {
  if (channel.readyState === 'open') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Voice connection timed out.')), timeoutMs);
    channel.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    channel.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('Voice connection failed.'));
    }, { once: true });
  });
}

function responseText(response) {
  return (response?.output ?? []).flatMap((item) => item.content ?? [])
    .map((part) => part.text || part.transcript || '')
    .filter(Boolean)
    .join('\n');
}

export class RealtimePractice {
  constructor({ onComplete, onFallback, onStatus }) {
    this.onComplete = onComplete;
    this.onFallback = onFallback;
    this.onStatus = onStatus;
    this.root = document.querySelector('#voice-practice');
    this.startButton = document.querySelector('#voice-start');
    this.micButton = document.querySelector('#voice-mic-toggle');
    this.finishButton = document.querySelector('#voice-finish');
    this.status = document.querySelector('#voice-status');
    this.timer = document.querySelector('#voice-timer');
    this.turns = document.querySelector('#voice-turns');
    this.transcript = document.querySelector('#voice-transcript');
    this.hintNative = document.querySelector('#voice-hint-native');
    this.hintEnglish = document.querySelector('#voice-hint-english');
    this.fallbackButton = document.querySelector('#voice-use-text');
    this.audio = document.createElement('audio');
    this.audio.autoplay = true;
    this.audio.playsInline = true;
    this.audio.setAttribute('aria-hidden', 'true');
    this.root.append(this.audio);
    this.resetState();
    this.setupUi();
  }

  resetState() {
    this.lesson = null;
    this.worldId = '';
    this.language = '';
    this.peer = null;
    this.channel = null;
    this.stream = null;
    this.track = null;
    this.connected = false;
    this.connecting = false;
    this.micPaused = false;
    this.responding = false;
    this.feedbackRequested = false;
    this.feedbackPending = false;
    this.userTurns = 0;
    this.remainingSeconds = SESSION_SECONDS;
    this.timerId = null;
    this.userDraft = '';
    this.assistantDraft = '';
    this.feedbackDraft = '';
  }

  setupUi() {
    this.startButton.addEventListener('click', () => this.connect());
    this.fallbackButton.addEventListener('click', () => {
      this.disconnect();
      this.onFallback?.();
    });
    this.finishButton.addEventListener('click', () => this.requestFeedback());
    this.micButton.addEventListener('click', () => this.toggleMicrophone());
  }

  renderMicButton() {
    const indicator = document.createElement('span');
    indicator.setAttribute('aria-hidden', 'true');
    const label = document.createTextNode(this.micPaused
      ? 'Mic paused · click to resume'
      : 'Mic on · click to pause');
    this.micButton.replaceChildren(indicator, label);
  }

  open({ worldId, language, lesson }) {
    this.disconnect();
    this.resetState();
    this.worldId = worldId;
    this.language = language;
    this.lesson = lesson;
    this.transcript.replaceChildren();
    const emptyLine = document.createElement('p');
    emptyLine.className = 'voice-transcript__empty';
    emptyLine.textContent = `Your live ${language} conversation will appear here.`;
    this.transcript.append(emptyLine);
    this.hintNative.textContent = lesson.phraseHi;
    this.hintEnglish.textContent = lesson.phraseEn;
    this.startButton.hidden = false;
    this.startButton.disabled = false;
    this.startButton.textContent = 'Start voice practice';
    this.micButton.hidden = true;
    this.micButton.disabled = true;
    this.micButton.classList.remove('voice-mic-toggle--paused');
    this.micButton.setAttribute('aria-pressed', 'false');
    this.renderMicButton();
    this.finishButton.hidden = true;
    this.fallbackButton.hidden = false;
    this.setStatus('Ready when you are');
    this.updateLimits();
  }

  async connect() {
    if (this.connected || this.connecting) return;
    this.connecting = true;
    this.startButton.disabled = true;
    this.setStatus('Connecting securely…');
    try {
      const statusResponse = await fetch('/api/voice/status', { cache: 'no-store' });
      const availability = statusResponse.ok ? await statusResponse.json() : { configured: false };
      if (!availability.configured) throw new Error('Voice is not configured on this server yet.');
      if (!availability.worlds?.includes(this.worldId)) throw new Error(`${this.language} voice practice is not configured on this server yet.`);
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support microphone practice.');

      this.peer = new RTCPeerConnection();
      this.peer.ontrack = (event) => { this.audio.srcObject = event.streams[0]; };
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.track = this.stream.getAudioTracks()[0];
      this.track.enabled = false;
      this.peer.addTrack(this.track, this.stream);
      this.channel = this.peer.createDataChannel('oai-events');
      this.channel.addEventListener('message', (event) => this.handleEvent(event));
      this.channel.addEventListener('close', () => {
        if (this.connected && !this.feedbackRequested) this.fail('Voice connection closed. You can continue with text.');
      });

      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(offer);
      const answerResponse = await fetch(`/api/realtime/session?world=${encodeURIComponent(this.worldId)}&lesson=${encodeURIComponent(this.lesson.id)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'X-Speakworld-User': stableBrowserIdentifier(),
        },
        body: offer.sdp,
      });
      if (!answerResponse.ok) throw new Error((await answerResponse.text()) || 'Unable to start voice practice.');
      await this.peer.setRemoteDescription({ type: 'answer', sdp: await answerResponse.text() });
      await waitForDataChannel(this.channel);

      this.connected = true;
      this.connecting = false;
      this.startButton.hidden = true;
      this.track.enabled = true;
      this.micPaused = false;
      this.micButton.hidden = false;
      this.micButton.disabled = false;
      this.setStatus('Conversation live · speak naturally');
      globalThis.dispatchEvent?.(new CustomEvent('sayscape:voice-state', { detail: { active: true } }));
      this.startTimer();
      this.send({
        type: 'response.create',
        response: { instructions: `Begin the roleplay now with one short, natural ${this.language} line. Do not explain the lesson.` },
      });
      this.onStatus?.('voice');
    } catch (error) {
      this.connecting = false;
      this.startButton.disabled = false;
      this.fail(error?.message || 'Voice practice is unavailable.');
    }
  }

  send(payload) {
    if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(payload));
  }

  toggleMicrophone() {
    if (!this.connected || !this.track || this.feedbackRequested) return;
    this.micPaused = !this.micPaused;
    this.track.enabled = !this.micPaused;
    this.micButton.classList.toggle('voice-mic-toggle--paused', this.micPaused);
    this.micButton.setAttribute('aria-pressed', String(this.micPaused));
    this.renderMicButton();
    if (this.micPaused) {
      this.send({ type: 'input_audio_buffer.clear' });
      this.setStatus('Microphone paused');
    } else {
      this.setStatus('Listening · speak naturally');
    }
  }

  handleEvent(messageEvent) {
    let event;
    try { event = JSON.parse(messageEvent.data); } catch { return; }
    if (event.type === 'response.created') {
      this.responding = true;
      // Keep this turn half-duplex: speaker output cannot leak back through
      // the mic and accidentally interrupt or truncate the NPC sentence.
      if (this.track) this.track.enabled = false;
      this.micButton.disabled = true;
      if (!this.feedbackRequested) this.setStatus(`${this.lesson.role.split('·')[0].trim()} is replying…`);
      return;
    }
    if (event.type === 'input_audio_buffer.speech_started') {
      if (!this.micPaused && !this.feedbackRequested) this.setStatus('Listening… keep speaking');
      return;
    }
    if (event.type === 'input_audio_buffer.speech_stopped') {
      if (!this.feedbackRequested) this.setStatus('Got it · waiting for the reply…');
      return;
    }
    if (event.type === 'conversation.item.input_audio_transcription.delta') {
      this.userDraft += event.delta || '';
      this.renderDraft('you', this.userDraft);
      return;
    }
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const text = event.transcript || this.userDraft || '(No speech detected)';
      this.commitDraft('you', text);
      this.userDraft = '';
      if (event.transcript?.trim()) this.userTurns += 1;
      this.updateLimits();
      return;
    }
    if (event.type === 'response.output_audio_transcript.delta') {
      this.assistantDraft += event.delta || '';
      this.renderDraft('local', this.assistantDraft);
      return;
    }
    if (event.type === 'response.output_audio_transcript.done') {
      this.commitDraft('local', event.transcript || this.assistantDraft);
      this.assistantDraft = '';
      return;
    }
    if (event.type === 'response.output_text.delta' && this.feedbackRequested) {
      this.feedbackDraft += event.delta || '';
      this.setStatus('Preparing feedback…');
      return;
    }
    if (event.type === 'response.done') {
      this.responding = false;
      const topic = event.response?.metadata?.topic;
      if (topic === 'practice_feedback') {
        this.finishWithFeedback(this.feedbackDraft || responseText(event.response));
        return;
      }
      if (this.feedbackPending || this.userTurns >= AUTO_FEEDBACK_TURN) {
        this.feedbackPending = false;
        this.requestFeedback();
        return;
      }
      if (this.track && !this.micPaused) this.track.enabled = true;
      this.micButton.disabled = false;
      if (!this.micPaused) this.setStatus('Your turn · speak naturally');
      return;
    }
    if (event.type === 'error') {
      this.fail(event.error?.message || 'Voice practice ran into a problem.');
    }
  }

  renderDraft(speaker, text) {
    this.transcript.querySelector('.voice-transcript__empty')?.remove();
    let row = this.transcript.querySelector(`[data-draft="${speaker}"]`);
    if (!row) {
      row = document.createElement('p');
      row.className = `voice-line voice-line--${speaker}`;
      row.dataset.draft = speaker;
      this.transcript.append(row);
    }
    row.textContent = `${speaker === 'you' ? 'You' : this.lesson.role.split('·')[0].trim()}: ${text}`;
    this.transcript.scrollTop = this.transcript.scrollHeight;
  }

  commitDraft(speaker, text) {
    if (!text) return;
    this.transcript.querySelector('.voice-transcript__empty')?.remove();
    const row = this.transcript.querySelector(`[data-draft="${speaker}"]`);
    if (row) delete row.dataset.draft;
    else {
      const line = document.createElement('p');
      line.className = `voice-line voice-line--${speaker}`;
      line.textContent = `${speaker === 'you' ? 'You' : this.lesson.role.split('·')[0].trim()}: ${text}`;
      this.transcript.append(line);
    }
    this.transcript.scrollTop = this.transcript.scrollHeight;
  }

  requestFeedback() {
    if (!this.connected || this.feedbackRequested || this.userTurns < 1) return;
    if (this.responding) {
      this.feedbackPending = true;
      if (this.track) this.track.enabled = false;
      this.finishButton.disabled = true;
      this.setStatus(`${this.lesson.role.split('·')[0].trim()} is finishing · feedback comes next`);
      return;
    }
    this.feedbackRequested = true;
    if (this.track) this.track.enabled = false;
    this.micButton.disabled = true;
    this.finishButton.hidden = true;
    this.setStatus('Preparing your correction…');
    this.send({ type: 'input_audio_buffer.clear' });
    this.send({
      type: 'response.create',
      response: {
        conversation: 'none',
        metadata: { topic: 'practice_feedback' },
        output_modalities: ['text'],
        instructions: `End the exercise. Evaluate the learner’s ${this.language} from this conversation and return the exact three-line feedback format from your instructions. Be encouraging but specific.`,
      },
    });
  }

  finishWithFeedback(text) {
    const feedback = text?.trim() || 'RESULT: PASS\nCORRECTION: Your meaning was clear. Keep practising the target phrase.\nTIP: Speak slowly and clearly.';
    this.setStatus('Practice complete');
    this.disconnect({ keepStatus: true });
    this.onComplete?.({ source: 'voice', feedback });
  }

  startTimer() {
    clearInterval(this.timerId);
    this.remainingSeconds = SESSION_SECONDS;
    this.updateLimits();
    this.timerId = setInterval(() => {
      this.remainingSeconds -= 1;
      this.updateLimits();
      if (this.remainingSeconds <= 0) {
        clearInterval(this.timerId);
        if (this.userTurns) this.requestFeedback();
        else this.fail('Time is up. Start again or use text practice.');
      }
    }, 1000);
  }

  updateLimits() {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = String(Math.max(0, this.remainingSeconds % 60)).padStart(2, '0');
    this.timer.textContent = `${minutes}:${seconds}`;
    this.turns.textContent = `${this.userTurns}/${MAX_USER_TURNS} replies`;
    this.finishButton.hidden = !this.connected || this.feedbackRequested || this.userTurns < MIN_FEEDBACK_TURN;
    this.finishButton.disabled = this.responding || this.feedbackPending;
  }

  setStatus(message) {
    this.status.textContent = message;
    this.onStatus?.(message);
  }

  fail(message) {
    this.disconnect({ keepStatus: true });
    this.setStatus(message);
    this.startButton.hidden = false;
    this.startButton.disabled = false;
    this.startButton.textContent = 'Try voice again';
    this.fallbackButton.hidden = false;
  }

  disconnect({ keepStatus = false } = {}) {
    const wasActive = this.connected || this.connecting;
    clearInterval(this.timerId);
    this.timerId = null;
    if (this.track) this.track.enabled = false;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.channel?.close();
    this.peer?.close();
    this.audio.srcObject = null;
    this.connected = false;
    this.connecting = false;
    this.micPaused = false;
    this.responding = false;
    this.feedbackPending = false;
    this.stream = null;
    this.track = null;
    this.channel = null;
    this.peer = null;
    this.micButton?.classList.remove('voice-mic-toggle--paused');
    if (wasActive) globalThis.dispatchEvent?.(new CustomEvent('sayscape:voice-state', { detail: { active: false } }));
    if (!keepStatus && this.status) this.setStatus('Ready when you are');
  }
}
