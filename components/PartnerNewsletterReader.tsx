import React from 'react';
import { PartnerNewsletter, PartnerNewsletterBlock } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from './ActionButton';
import { downloadNewsletterHtml } from '../utils/partnerNewsletterUtils';

interface PartnerNewsletterReaderProps {
  newsletter: PartnerNewsletter;
  teamName: string;
  sponsorName: string;
  accentColor?: string;
}

function BlockView({ block }: { block: PartnerNewsletterBlock }) {
  switch (block.type) {
    case 'heading':
      return <h2 className="text-xl font-bold text-slate-900 mt-6 mb-2">{block.content}</h2>;
    case 'highlight':
      return (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 px-5 py-4 my-4 text-indigo-950 whitespace-pre-wrap text-sm leading-relaxed">
          {block.content}
        </div>
      );
    case 'cta':
      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 my-4 text-emerald-900 text-sm leading-relaxed">
          {block.content}
        </div>
      );
    case 'quote':
      return (
        <blockquote className="border-l-4 border-slate-300 pl-4 my-4 text-slate-600 italic text-sm">
          {block.content}
        </blockquote>
      );
    case 'interview':
      return (
        <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-5 py-4 my-4 text-sky-950 whitespace-pre-wrap text-sm leading-relaxed font-mono">
          {block.content}
        </div>
      );
    case 'sponsorSpotlight':
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-5 py-4 my-4 text-amber-950 whitespace-pre-wrap text-sm leading-relaxed">
          {block.content}
        </div>
      );
    case 'eventList':
    case 'results':
      return (
        <pre className="rounded-lg bg-slate-50 border border-slate-200 p-4 my-3 text-sm text-slate-800 whitespace-pre-wrap font-sans">
          {block.content}
        </pre>
      );
    default:
      return (
        <p className="text-slate-700 my-3 leading-relaxed whitespace-pre-wrap">{block.content}</p>
      );
  }
}

const PartnerNewsletterReader: React.FC<PartnerNewsletterReaderProps> = ({
  newsletter,
  teamName,
  sponsorName,
  accentColor = '#4338ca',
}) => {
  const { t } = useTranslations();
  const published = newsletter.publishedAt || newsletter.createdAt;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div
        className="relative px-6 py-10 sm:px-10 text-white"
        style={{
          background: `linear-gradient(135deg, #0f172a 0%, ${accentColor} 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,white,transparent_50%)]" />
        <div className="relative">
          <p className="text-sm opacity-80">{teamName}</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2">{newsletter.title}</h1>
          {newsletter.previewText && (
            <p className="mt-3 text-sm opacity-90 max-w-xl">{newsletter.previewText}</p>
          )}
          <p className="mt-4 text-xs opacity-70">
            {sponsorName} · {new Date(published).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-10 max-w-2xl">
        {newsletter.blocks.map((block) => (
          <BlockView key={block.id} block={block} />
        ))}
      </div>

      <div className="border-t border-slate-100 px-6 py-4 flex flex-wrap gap-2 bg-slate-50">
        <ActionButton
          size="sm"
          variant="secondary"
          onClick={() => downloadNewsletterHtml(newsletter, teamName, sponsorName)}
        >
          {t('partnerNewsletterDownloadHtml')}
        </ActionButton>
      </div>
    </article>
  );
};

export default PartnerNewsletterReader;
