import React from 'react';
import { ParticipationLetterBlock } from '../utils/participationRequestLetter';

interface ParticipationLetterPreviewProps {
  blocks: ParticipationLetterBlock[];
}

const ParticipationLetterPreview: React.FC<ParticipationLetterPreviewProps> = ({ blocks }) => (
  <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/80 p-5 text-sm leading-relaxed text-slate-200 shadow-inner">
    {blocks.map((block, index) => {
      switch (block.type) {
        case 'sender':
          return (
            <div key={index} className="mb-6 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Expéditeur</p>
              {block.lines.map((line) => (
                <p key={line} className="font-medium text-white">{line}</p>
              ))}
            </div>
          );
        case 'recipient':
          return (
            <div key={index} className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Destinataire</p>
              {block.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          );
        case 'place-date':
          return (
            <p key={index} className="mb-6 text-right italic text-slate-300">
              {block.line}
            </p>
          );
        case 'subject':
          return (
            <div key={index} className="mb-6 border-y border-white/10 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Objet</p>
              <p className="font-semibold text-white">{block.line}</p>
            </div>
          );
        case 'salutation':
          return (
            <p key={index} className="mb-4 font-medium text-white">
              {block.line}
            </p>
          );
        case 'paragraph':
          return (
            <p key={index} className="mb-4 text-justify">
              {block.text}
            </p>
          );
        case 'event-info':
          return (
            <div
              key={index}
              className="my-5 rounded-lg border border-indigo-700/40 bg-indigo-950/40 px-4 py-3 text-center"
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                Informations épreuve
              </p>
              <div className="grid gap-1 sm:grid-cols-2">
                {block.items.map((item) => (
                  <p key={item.label} className="text-sm">
                    <span className="text-slate-400">{item.label} :</span>{' '}
                    <span className="font-medium text-white">{item.value}</span>
                  </p>
                ))}
              </div>
            </div>
          );
        case 'list':
          return (
            <div key={index} className="mb-4">
              {block.title && (
                <p className="mb-2 font-medium text-slate-300">{block.title}</p>
              )}
              <ul className="list-disc space-y-1 pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          );
        case 'closing':
          return (
            <p key={index} className="mb-6 mt-4 text-justify italic text-slate-300">
              {block.lines.join(' ')}
            </p>
          );
        case 'signature':
          return (
            <div key={index} className="mt-6 border-t border-white/10 pt-4">
              {block.lines.map((line, lineIndex) => (
                <p
                  key={line}
                  className={lineIndex === 0 ? 'font-semibold text-white' : 'text-slate-300'}
                >
                  {line}
                </p>
              ))}
            </div>
          );
        default:
          return null;
      }
    })}
  </div>
);

export default ParticipationLetterPreview;
