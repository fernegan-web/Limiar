import React, { useState } from 'react';
import { Compass } from 'lucide-react';
import {
  CybersigilismCorner,
  CybersigilismWeb,
  EclipseSigil,
  PortalSingularity,
} from '../components/ornaments/CybersigilismOrnaments';
import { Reveal } from '../components/ui/Reveal';
import { UltravioletButton } from '../components/ui/UltravioletButton';
import { validateContactForm, type ContactFormInput } from '../utils/validation';

export function ContactPage() {
  const [form, setForm] = useState<ContactFormInput>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormInput, string>>>({});
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handleChange = (field: keyof ContactFormInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (statusNotice) setStatusNotice(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateContactForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      setStatusNotice(null);
      return;
    }
    setErrors({});
    setStatusNotice(
      'Formulário validado. O envio real de mensagens será habilitado quando o backend Wix estiver conectado.'
    );
  };

  return (
    <div className="relative overflow-hidden">
      <CybersigilismWeb
        tone="mineral"
        className="absolute -top-24 -right-20 w-[420px] h-[420px] opacity-45"
      />
      <CybersigilismWeb
        tone="uv"
        className="absolute bottom-0 -left-24 w-[360px] h-[360px] opacity-35"
      />

      <div className="relative mx-auto max-w-[1180px] px-4 sm:px-8 pt-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
              <EclipseSigil className="w-5 h-5 text-[var(--accent-uv)]" />
              <p className="text-[11px] uppercase tracking-[0.22em]">Atendimento</p>
            </div>
            <h1 className="font-display font-light text-3xl sm:text-5xl uppercase tracking-[0.03em] text-[var(--text-primary)]">
              CONTATO
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Canal direto para dúvidas sobre modelagens, eventos ou integração futura com pedidos realizados via Wix.
            </p>
            <div className="hidden lg:block pt-4">
              <PortalSingularity className="w-40 h-40 opacity-55" />
            </div>
          </div>

          <div className="lg:col-span-7">
            <Reveal>
              <form
                onSubmit={handleSubmit}
                noValidate
                className="relative overflow-hidden glass-surface-strong rounded-[28px] p-6 sm:p-8 space-y-5"
              >
                <CybersigilismCorner className="absolute top-3 right-3 w-11 h-11 opacity-45" />

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
                      placeholder="Seu nome"
                      aria-invalid={Boolean(errors.name)}
                      className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:outline-none transition-colors"
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
                      placeholder="seu@email.com"
                      aria-invalid={Boolean(errors.email)}
                      className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:outline-none transition-colors"
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
                    placeholder="Sobre o que deseja falar?"
                    aria-invalid={Boolean(errors.subject)}
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:outline-none transition-colors"
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
                    placeholder="Escreva sua mensagem..."
                    aria-invalid={Boolean(errors.message)}
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:outline-none resize-y transition-colors"
                  />
                  {errors.message && (
                    <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                      {errors.message}
                    </p>
                  )}
                </div>

                {statusNotice && (
                  <div
                    role="status"
                    className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 text-xs text-[var(--accent-uv)] flex items-start gap-2.5"
                  >
                    <Compass className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="leading-relaxed">{statusNotice}</span>
                  </div>
                )}

                <div className="pt-2">
                  <UltravioletButton type="submit" size="lg">
                    VALIDAR MENSAGEM
                  </UltravioletButton>
                </div>
              </form>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
