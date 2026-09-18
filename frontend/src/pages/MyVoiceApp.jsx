import { useEffect, useMemo, useState } from 'react';
import { generateSpeech } from '../api/generate';
import './MyVoiceApp.css';

const styles = {
  natural: { label: '자연스럽게', speed: '1.0', instruct: '' },
  bright: { label: '밝게', speed: '1.05', instruct: 'Lively' },
  calm: { label: '차분하게', speed: '0.94', instruct: 'Calm' },
  serious: { label: '진지하게', speed: '0.96', instruct: 'Serious' },
  shorts: { label: '쇼츠 빠르게', speed: '1.12', instruct: 'Lively' },
};

export default function MyVoiceApp() {
  const [script, setScript] = useState('');
  const [reference, setReference] = useState(null);
  const [refText, setRefText] = useState('');
  const [style, setStyle] = useState('natural');
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('my-voice.wav');

  const canGenerate = script.trim() && reference && !busy;
  const charCount = useMemo(() => script.length, [script]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function generate() {
    if (!canGenerate) return;
    setBusy(true);
    setError('');
    try {
      const preset = styles[style];
      const form = new FormData();
      form.append('text', script.trim());
      form.append('language', 'Korean');
      form.append('speed', preset.speed);
      form.append('ref_audio', reference, reference.name || 'reference.wav');
      form.append('ref_text', refText.trim());
      if (preset.instruct) form.append('instruct', preset.instruct);

      const response = await generateSpeech(form);
      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = body?.detail?.message || body?.detail || body?.message || '';
        } catch {}
        throw new Error(typeof detail === 'string' && detail ? detail : `생성 실패 (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const next = URL.createObjectURL(blob);
      setAudioUrl(next);
      setFileName(`my-voice-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.wav`);
    } catch (e) {
      setError(e?.message || '음성 생성 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = fileName;
    a.click();
  }

  return (
    <main className="myvoice-shell">
      <section className="myvoice-card">
        <header>
          <div className="myvoice-badge">LOCAL AI VOICE</div>
          <h1>MY VOICE</h1>
          <p>내 목소리 샘플 하나로 유튜브 나레이션을 만듭니다.</p>
        </header>

        <div className="myvoice-grid">
          <label className="myvoice-field">
            <span>1. 내 목소리 샘플</span>
            <input type="file" accept="audio/*,.wav,.mp3,.m4a,.flac" onChange={(e) => setReference(e.target.files?.[0] || null)} />
            <small>{reference ? reference.name : '깨끗한 음성 파일을 선택하세요.'}</small>
          </label>

          <label className="myvoice-field">
            <span>샘플에서 실제로 말한 문장 <em>선택</em></span>
            <input value={refText} onChange={(e) => setRefText(e.target.value)} placeholder="예: 안녕하세요. 오늘은 제가 직접 경험한 이야기를..." />
          </label>
        </div>

        <label className="myvoice-field myvoice-script">
          <span>2. 대본</span>
          <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="여기에 유튜브 대본을 붙여넣으세요." />
          <small>{charCount.toLocaleString()}자</small>
        </label>

        <div className="myvoice-field">
          <span>3. 말하기 스타일</span>
          <div className="myvoice-presets">
            {Object.entries(styles).map(([id, item]) => (
              <button key={id} type="button" className={style === id ? 'active' : ''} onClick={() => setStyle(id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <button className="myvoice-generate" type="button" disabled={!canGenerate} onClick={generate}>
          {busy ? '음성을 만들고 있습니다…' : '🎙 내 목소리로 음성 생성'}
        </button>

        {error && <div className="myvoice-error">{error}</div>}

        {audioUrl && (
          <section className="myvoice-result">
            <strong>생성 완료</strong>
            <audio controls src={audioUrl} />
            <button type="button" onClick={download}>WAV 저장</button>
          </section>
        )}

        <footer>본인 또는 사용 허가를 받은 목소리만 등록하세요. VoiceStudio 로컬 엔진을 사용합니다.</footer>
      </section>
    </main>
  );
}
