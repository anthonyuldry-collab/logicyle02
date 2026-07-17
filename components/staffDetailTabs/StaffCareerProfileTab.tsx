import React, { useState } from 'react';
import {
  EducationOrCertification,
  LanguageProficiency,
  SpokenLanguage,
  StaffMember,
  WorkExperience,
} from '../../types';
import ActionButton from '../ActionButton';
import PlusCircleIcon from '../icons/PlusCircleIcon';
import TrashIcon from '../icons/TrashIcon';
import XCircleIcon from '../icons/XCircleIcon';

interface StaffCareerProfileTabProps {
  formData: StaffMember | Omit<StaffMember, 'id'>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onPatch: (patch: Partial<StaffMember>) => void;
  formFieldsEnabled?: boolean;
  theme?: 'light' | 'dark';
}

const generateId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const StaffCareerProfileTab: React.FC<StaffCareerProfileTabProps> = ({
  formData,
  handleInputChange,
  onPatch,
  formFieldsEnabled = true,
  theme = 'light',
}) => {
  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const isLight = theme === 'light';

  const inputClass = isLight
    ? 'mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50'
    : 'mt-0.5 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60';

  const cardClass = isLight
    ? 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm'
    : 'rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg';
  const titleClass = isLight ? 'mb-3 text-sm font-semibold text-gray-900' : 'mb-3 text-sm font-semibold text-white';
  const labelClass = isLight
    ? 'mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500'
    : 'mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400';

  const skills = formData.skills || [];
  const certifications = formData.certifications || [];
  const workHistory = formData.workHistory || [];
  const education = formData.education || [];
  const languages = formData.languages || [];

  const addSkill = () => {
    const value = newSkill.trim();
    if (!value || skills.includes(value)) return;
    onPatch({ skills: [...skills, value] });
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    onPatch({ skills: skills.filter((s) => s !== skill) });
  };

  const addCertification = () => {
    const value = newCertification.trim();
    if (!value || certifications.includes(value)) return;
    onPatch({ certifications: [...certifications, value] });
    setNewCertification('');
  };

  const removeCertification = (cert: string) => {
    onPatch({ certifications: certifications.filter((c) => c !== cert) });
  };

  const updateWork = (id: string, patch: Partial<WorkExperience>) => {
    onPatch({
      workHistory: workHistory.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const updateEducation = (id: string, patch: Partial<EducationOrCertification>) => {
    onPatch({
      education: education.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const updateLanguage = (id: string, patch: Partial<SpokenLanguage>) => {
    onPatch({
      languages: languages.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const addWork = () => {
    const item: WorkExperience = { id: generateId(), position: '', company: '' };
    onPatch({ workHistory: [...workHistory, item] });
  };

  const addEducation = () => {
    const item: EducationOrCertification = { id: generateId(), degree: '', institution: '' };
    onPatch({ education: [...education, item] });
  };

  const addLanguage = () => {
    const item: SpokenLanguage = {
      id: generateId(),
      language: '',
      proficiency: LanguageProficiency.INTERMEDIATE,
    };
    onPatch({ languages: [...languages, item] });
  };

  const removeFromList = (listName: 'workHistory' | 'education' | 'languages', id: string) => {
    const list = ((formData as StaffMember)[listName] || []) as { id: string }[];
    onPatch({
      [listName]: list.filter((item) => item.id !== id),
    } as Partial<StaffMember>);
  };

  return (
    <div className="space-y-4">
      <section className={cardClass}>
        <h3 className={titleClass}>Présentation & message de candidature</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Présentation</label>
            <textarea
              name="professionalSummary"
              value={formData.professionalSummary || ''}
              onChange={handleInputChange}
              rows={4}
              disabled={!formFieldsEnabled}
              className={inputClass}
              placeholder="Parcours, points forts, type de missions recherchées…"
            />
          </div>
          <div>
            <label className={labelClass}>Message type de candidature</label>
            <textarea
              name="defaultApplicationMessage"
              value={formData.defaultApplicationMessage || ''}
              onChange={handleInputChange}
              rows={3}
              disabled={!formFieldsEnabled}
              className={inputClass}
              placeholder="Ex. Habite Lorient, dispo le week-end. 4 saisons Elite."
            />
            <p className={`mt-1 text-[11px] ${isLight ? 'text-gray-400' : 'text-slate-500'}`}>
              Utilisé comme message par défaut lors de vos candidatures aux offres.
            </p>
          </div>
          <div>
            <label className={labelClass}>Années d&apos;expérience</label>
            <input
              type="number"
              name="experienceYears"
              min={0}
              max={50}
              value={formData.experienceYears ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                onPatch({
                  experienceYears: raw === '' ? undefined : Math.max(0, Number(raw)),
                });
              }}
              disabled={!formFieldsEnabled}
              className={`${inputClass} max-w-[140px]`}
            />
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <h3 className={titleClass}>Compétences</h3>
        {formFieldsEnabled && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Ajouter une compétence…"
              className={`${inputClass} flex-1`}
            />
            <ActionButton type="button" size="sm" onClick={addSkill} icon={<PlusCircleIcon className="w-4 h-4" />}>
              Ajouter
            </ActionButton>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {skills.length === 0 && (
            <p className={`text-sm italic ${isLight ? 'text-gray-400' : 'text-slate-400'}`}>
              Aucune compétence renseignée.
            </p>
          )}
          {skills.map((skill) => (
            <span
              key={skill}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                isLight ? 'bg-slate-100 text-slate-700' : 'bg-blue-500/80 text-white'
              }`}
            >
              {skill}
              {formFieldsEnabled && (
                <button type="button" onClick={() => removeSkill(skill)} aria-label={`Retirer ${skill}`}>
                  <XCircleIcon className="w-4 h-4" />
                </button>
              )}
            </span>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <h3 className={titleClass}>Certifications</h3>
        {formFieldsEnabled && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCertification}
              onChange={(e) => setNewCertification(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCertification();
                }
              }}
              placeholder="Ex. PSC1, Permis B, Licence DS…"
              className={`${inputClass} flex-1`}
            />
            <ActionButton
              type="button"
              size="sm"
              onClick={addCertification}
              icon={<PlusCircleIcon className="w-4 h-4" />}
            >
              Ajouter
            </ActionButton>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {certifications.length === 0 && (
            <p className={`text-sm italic ${isLight ? 'text-gray-400' : 'text-slate-400'}`}>
              Aucune certification renseignée.
            </p>
          )}
          {certifications.map((cert) => (
            <span
              key={cert}
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                isLight ? 'bg-emerald-50 text-emerald-800' : 'bg-emerald-900/40 text-emerald-200'
              }`}
            >
              {cert}
              {formFieldsEnabled && (
                <button type="button" onClick={() => removeCertification(cert)} aria-label={`Retirer ${cert}`}>
                  <XCircleIcon className="w-4 h-4" />
                </button>
              )}
            </span>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className={`${titleClass} mb-0`}>Expérience</h3>
          {formFieldsEnabled && (
            <ActionButton type="button" size="sm" variant="secondary" onClick={addWork} icon={<PlusCircleIcon className="w-4 h-4" />}>
              Ajouter
            </ActionButton>
          )}
        </div>
        {workHistory.length === 0 ? (
          <p className={`text-sm italic ${isLight ? 'text-gray-400' : 'text-slate-400'}`}>
            Aucune expérience ajoutée.
          </p>
        ) : (
          <div className="space-y-2">
            {workHistory.map((exp) => (
              <div
                key={exp.id}
                className={`grid grid-cols-1 gap-2 rounded-lg border p-2 sm:grid-cols-12 ${
                  isLight ? 'border-gray-100 bg-gray-50' : 'border-slate-600 bg-slate-800'
                }`}
              >
                <input
                  type="text"
                  value={exp.position}
                  onChange={(e) => updateWork(exp.id, { position: e.target.value })}
                  placeholder="Poste"
                  disabled={!formFieldsEnabled}
                  className={`${inputClass} sm:col-span-4`}
                />
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => updateWork(exp.id, { company: e.target.value })}
                  placeholder="Employeur / équipe"
                  disabled={!formFieldsEnabled}
                  className={`${inputClass} sm:col-span-4`}
                />
                <input
                  type="text"
                  value={exp.startDate || ''}
                  onChange={(e) => updateWork(exp.id, { startDate: e.target.value })}
                  placeholder="Début"
                  disabled={!formFieldsEnabled}
                  className={`${inputClass} sm:col-span-2`}
                />
                <div className="flex gap-2 sm:col-span-2">
                  <input
                    type="text"
                    value={exp.endDate || ''}
                    onChange={(e) => updateWork(exp.id, { endDate: e.target.value })}
                    placeholder="Fin"
                    disabled={!formFieldsEnabled}
                    className={`${inputClass} flex-1`}
                  />
                  {formFieldsEnabled && (
                    <ActionButton
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => removeFromList('workHistory', exp.id)}
                      icon={<TrashIcon className="w-4 h-4" />}
                    />
                  )}
                </div>
                <textarea
                  value={exp.description || ''}
                  onChange={(e) => updateWork(exp.id, { description: e.target.value })}
                  placeholder="Description"
                  rows={2}
                  disabled={!formFieldsEnabled}
                  className={`${inputClass} sm:col-span-12`}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className={`${titleClass} mb-0`}>Formations</h3>
          {formFieldsEnabled && (
            <ActionButton
              type="button"
              size="sm"
              variant="secondary"
              onClick={addEducation}
              icon={<PlusCircleIcon className="w-4 h-4" />}
            >
              Ajouter
            </ActionButton>
          )}
        </div>
        {education.length === 0 ? (
          <p className={`text-sm italic ${isLight ? 'text-gray-400' : 'text-slate-400'}`}>
            Aucune formation ajoutée.
          </p>
        ) : (
          <div className="space-y-2">
            {education.map((edu) => (
              <div
                key={edu.id}
                className={`grid grid-cols-1 gap-2 rounded-lg border p-2 sm:grid-cols-12 ${
                  isLight ? 'border-gray-100 bg-gray-50' : 'border-slate-600 bg-slate-800'
                }`}
              >
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                  placeholder="Diplôme / formation"
                  disabled={!formFieldsEnabled}
                  className={`${inputClass} sm:col-span-5`}
                />
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                  placeholder="Établissement"
                  disabled={!formFieldsEnabled}
                  className={`${inputClass} sm:col-span-4`}
                />
                <div className="flex gap-2 sm:col-span-3">
                  <input
                    type="number"
                    value={edu.year ?? ''}
                    onChange={(e) =>
                      updateEducation(edu.id, {
                        year: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="Année"
                    disabled={!formFieldsEnabled}
                    className={`${inputClass} flex-1`}
                  />
                  {formFieldsEnabled && (
                    <ActionButton
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => removeFromList('education', edu.id)}
                      icon={<TrashIcon className="w-4 h-4" />}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className={`${titleClass} mb-0`}>Langues</h3>
          {formFieldsEnabled && (
            <ActionButton
              type="button"
              size="sm"
              variant="secondary"
              onClick={addLanguage}
              icon={<PlusCircleIcon className="w-4 h-4" />}
            >
              Ajouter
            </ActionButton>
          )}
        </div>
        {languages.length === 0 ? (
          <p className={`text-sm italic ${isLight ? 'text-gray-400' : 'text-slate-400'}`}>
            Aucune langue renseignée.
          </p>
        ) : (
          <div className="space-y-2">
            {languages.map((lang) => (
              <div
                key={lang.id}
                className={`grid grid-cols-1 gap-2 rounded-lg border p-2 sm:grid-cols-12 ${
                  isLight ? 'border-gray-100 bg-gray-50' : 'border-slate-600 bg-slate-800'
                }`}
              >
                <input
                  type="text"
                  value={lang.language}
                  onChange={(e) => updateLanguage(lang.id, { language: e.target.value })}
                  placeholder="Langue"
                  disabled={!formFieldsEnabled}
                  className={`${inputClass} sm:col-span-6`}
                />
                <select
                  value={lang.proficiency}
                  onChange={(e) =>
                    updateLanguage(lang.id, {
                      proficiency: e.target.value as LanguageProficiency,
                    })
                  }
                  disabled={!formFieldsEnabled}
                  className={`${inputClass} sm:col-span-5`}
                >
                  {Object.values(LanguageProficiency).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {formFieldsEnabled && (
                  <div className="sm:col-span-1 flex items-center">
                    <ActionButton
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => removeFromList('languages', lang.id)}
                      icon={<TrashIcon className="w-4 h-4" />}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StaffCareerProfileTab;
