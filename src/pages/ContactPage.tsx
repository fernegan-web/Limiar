import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Instagram, Mail, MessageCircle } from 'lucide-react';
import {
  CybersigilismCorner,
  EclipseSigil,
  PortalSingularity,
} from '../components/ornaments/CybersigilismOrnaments';
import { Reveal } from '../components/ui/Reveal';
import { UltravioletButton } from '../components/ui/UltravioletButton';
import { ThresholdMagnetic } from '../motion/ThresholdPrimitives';
import {
  isDuplicateRecentSubmission,
  submitContactMessage,
} from '../services/contactService';
import { validateContactForm, type ContactFormInput } from '../utils/validation';
import {
  LIMIAR_CHANNELS,
  buildContactWhatsAppUrl,
  buildMailtoUrl,
  buildWhatsAppUrl,
} from '../utils/whatsapp';

type FormStatus =
  | { kind: 'idle' }
  | { kind: 'validation'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string; showAlternatives: boolean };

export function ContactPage() {
  const renderedAtRef = useRef<number>(Date.now());
  const [form, setForm] = useState<ContactFormInput>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });

  const handleChange = (field: keyof ContactFormInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (status.kind !== 'idle') {
      setStatus({ kind: 'idle' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validateContactForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      setStatus({
        kind: 'validation',
        message: 'Confira os campos destacados antes de continuar.',
      });
      return;
    }

    if (isDuplicateRecentSubmission(form)) {
      setStatus({
        kind: 'error',
        message:
          'Sua mensagem anterior já foi registrada há instantes. Aguarde um momento ou fale diretamente conosco pelo WhatsApp.',
        showAlternatives: true,
      });
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const result = await submitContactMessage({
        ...form,
        honeypot,
        renderedAt: renderedAtRef.current,
      });

      if (result.ok) {
        setStatus({
          kind: 'success',
          message: 'Mensagem recebida. Em breve, nosso caminho se cruza novamente.',
        });
        setForm({ name: '', email: '', subject: '', message: '' });
        renderedAtRef.current = Date.now();
      } else {
        setStatus({
          kind: 'error',
          message:
            'Não foi possível enviar sua mensagem. Tente novamente ou fale diretamente conosco pelo WhatsApp.',
          showAlternatives: true,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const prefilledWhatsAppUrl = buildWhatsAppUrl(
    [
      `Olá, Limiar! Meu nome é ${form.name.trim() || 'visitante'}.`,
      form.subject.trim() ? `Assunto: ${form.subject.trim()}` : '',
      form.message.trim() ? form.message.trim() : 'Gostaria de tirar algumas dúvidas.',
    ]
      .filter(Boolean)
      .join('\n')
  );

  const prefilledMailtoUrl = buildMailtoUrl({
    to: LIMIAR_CHANNELS.email,
    subject: form.subject.trim() || 'Contato Limiar',
    body: [
      form.name.trim() ? `Nome: ${form.name.trim()}` : '',
      form.email.trim() ? `E-mail: ${form.email.trim()}` : '',
      '',
      form.message.trim(),
    ]
      .filter(Boolean)
      .join('\n'),
  });

  return (
    <div className="relative overflow-hidden">
      <div className="relative mx-auto max-w-[1220px] px-4 sm:px-8 pt-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Coluna Esquerda: Copy Editorial + Canais Oficiais */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
                <EclipseSigil className="w-5 h-5 text-[var(--accent-uv)]" />
                <p className="text-[11px] uppercase tracking-[0.22em]">ESTAMOS AQUI</p>
              </div>
              <h1 className="font-display font-light text-3xl sm:text-5xl tracking-[0.02em] text-[var(--text-primary)]">
                Vamos conversar.
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Dúvidas sobre peças, modelagens, pedidos ou sobre o universo de Limiar? Entre em contato. Do outro lado, existem pessoas reais.
              </p>
            </div>

            {/* Canais de Atendimento */}
            <div className="space-y-3.5">
              {/* E-mail */}
              <div className="glass-surface rounded-[20px] p-4 sm:p-5 space-y-1.5 border border-[var(--border-hairline)]">
                <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
                  <Mail className="w-4 h-4 text-[var(--accent-uv)] shrink-0" aria-hidden="true" />
                  <h2 className="text-xs uppercase tracking-[0.18em] font-semibold">E-mail</h2>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Para assuntos comerciais, pedidos, parcerias e demais informações.
                </p>
                <a
                  href={`mailto:${LIMIAR_CHANNELS.email}`}
                  className="inline-block pt-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-acid)] underline underline-offset-4 decoration-[var(--border-strong)] transition-colors"
                >
                  {LIMIAR_CHANNELS.email}
                </a>
              </div>

              {/* WhatsApp */}
              <div className="glass-surface rounded-[20px] p-4 sm:p-5 space-y-2.5 border border-[var(--border-hairline)]">
                <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
                  <MessageCircle className="w-4 h-4 text-[var(--accent-acid)] shrink-0" aria-hidden="true" />
                  <h2 className="text-xs uppercase tracking-[0.18em] font-semibold">WhatsApp</h2>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Um caminho mais direto. Tire suas dúvidas, conheça nossas peças ou realize sua compra por aqui.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <a
                    href={LIMIAR_CHANNELS.whatsappBaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--text-primary)] hover:text-[var(--accent-acid)] underline underline-offset-4 decoration-[var(--border-strong)] transition-colors tabular-nums"
                  >
                    {LIMIAR_CHANNELS.whatsappNumberDisplay}
                  </a>
                  <UltravioletButton
                    href={buildContactWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                    size="sm"
                  >
                    Falar no WhatsApp
                  </UltravioletButton>
                </div>
              </div>

              {/* Instagram */}
              <div className="glass-surface rounded-[20px] p-4 sm:p-5 space-y-1.5 border border-[var(--border-hairline)]">
                <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
                  <Instagram className="w-4 h-4 text-[var(--accent-uv)] shrink-0" aria-hidden="true" />
                  <h2 className="text-xs uppercase tracking-[0.18em] font-semibold">Instagram</h2>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Acompanhe nossos lançamentos, expressões e movimentos.
                </p>
                <a
                  href={LIMIAR_CHANNELS.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block pt-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-uv)] underline underline-offset-4 decoration-[var(--border-strong)] transition-colors"
                >
                  {LIMIAR_CHANNELS.instagramHandle}
                </a>
              </div>
            </div>

            <div className="hidden lg:block pt-1">
              <PortalSingularity className="w-32 h-32 opacity-45" />
            </div>
          </div>

          {/* Coluna Direita: Formulário de Contato Funcional */}
          <div className="lg:col-span-7">
            <Reveal>
              <form
                onSubmit={handleSubmit}
                noValidate
                className="relative overflow-hidden glass-surface-strong rounded-[28px] p-6 sm:p-8 space-y-5"
              >
                <CybersigilismCorner className="pointer-events-none absolute top-3 right-3 w-11 h-11 opacity-45" />

                <div className="space-y-1 pb-2 border-b border-[var(--border-hairline)]">
                  <h2 className="font-display font-light text-2xl sm:text-[26px] tracking-[0.02em] text-[var(--text-primary)]">
                    Deixe sua mensagem.
                  </h2>
                </div>

                {/* Campo honeypot anti-spam invisível para usuários humanos */}
                <div aria-hidden="true" className="hidden">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-name"
                      className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                    >
                      Nome
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Como podemos chamar você?"
                      aria-invalid={Boolean(errors.name)}
                      className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:ring-1 focus:ring-[var(--accent-uv-glow)] focus:outline-none transition-all"
                    />
                    {errors.name && (
                      <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-email"
                      className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                    >
                      E-mail
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="Seu melhor e-mail"
                      aria-invalid={Boolean(errors.email)}
                      className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:ring-1 focus:ring-[var(--accent-uv-glow)] focus:outline-none transition-all"
                    />
                    {errors.email && (
                      <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-subject"
                    className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                  >
                    Assunto
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={form.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    placeholder="Sobre o que vamos conversar?"
                    aria-invalid={Boolean(errors.subject)}
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:ring-1 focus:ring-[var(--accent-uv-glow)] focus:outline-none transition-all"
                  />
                  {errors.subject && (
                    <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                      {errors.subject}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-message"
                    className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                  >
                    Mensagem
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    value={form.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    placeholder="Escreva sua mensagem aqui..."
                    aria-invalid={Boolean(errors.message)}
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:ring-1 focus:ring-[var(--accent-uv-glow)] focus:outline-none resize-y transition-all"
                  />
                  {errors.message && (
                    <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                      {errors.message}
                    </p>
                  )}
                </div>

                {status.kind === 'validation' && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[var(--accent-terracotta)]/45 bg-[var(--bg-surface)] p-4 text-xs text-[var(--accent-terracotta)] flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="leading-relaxed">{status.message}</span>
                  </div>
                )}

                {status.kind === 'success' && (
                  <div
                    role="status"
                    className="rounded-xl border border-[var(--accent-acid)]/50 bg-[var(--bg-surface)] p-4 text-xs text-[var(--accent-acid)] flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="leading-relaxed">{status.message}</span>
                  </div>
                )}

                {status.kind === 'error' && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[var(--accent-terracotta)]/45 bg-[var(--bg-surface)] p-4 text-xs text-[var(--text-secondary)] space-y-3"
                  >
                    <div className="flex items-start gap-2.5 text-[var(--accent-terracotta)]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="leading-relaxed">{status.message}</span>
                    </div>
                    {status.showAlternatives && (
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <UltravioletButton
                          href={prefilledWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="secondary"
                          size="sm"
                        >
                          Enviar pelo WhatsApp
                        </UltravioletButton>
                        <UltravioletButton
                          href={prefilledMailtoUrl}
                          variant="tertiary"
                          size="sm"
                        >
                          Abrir aplicativo de e-mail
                        </UltravioletButton>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <ThresholdMagnetic maxPull={4}>
                    <UltravioletButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={submitting}
                    >
                      {submitting ? 'Enviando...' : 'Enviar mensagem'}
                    </UltravioletButton>
                  </ThresholdMagnetic>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Destinatário: {LIMIAR_CHANNELS.email}
                  </p>
                </div>
              </form>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
