import React, { useMemo, useState } from 'react';
import {
  TeamMembership,
  TeamMembershipStatus,
  TeamRecruitmentCampaign,
  TeamRecruitmentCampaignStatus,
  TeamRecruitmentCriteria,
  TeamRecruitmentOffer,
  TeamRecruitmentOfferStatus,
  TeamRecruitmentTarget,
  User,
  UserRole,
} from '../types';
import ActionButton from './ActionButton';
import Modal from './Modal';
import {
  DISCIPLINE_FILTER_OPTIONS,
  formatRecruitmentCriteriaSummary,
  RIDER_SEGMENT_FILTER_OPTIONS,
  riderMatchesRecruitmentCriteria,
} from '../utils/recruitmentCampaignUtils';
import {
  RECRUITMENT_TARGET_OPTIONS,
  resolveRiderMarketSegmentFromUser,
  RIDER_SEGMENT_LABELS,
} from '../utils/riderTeamMarketSegment';

type RecruitmentTab = 'applications' | 'offers' | 'campaigns';

interface TeamRecruitmentPanelProps {
  teamId: string;
  teamName: string;
  users: User[];
  teamMemberships: TeamMembership[];
  recruitmentOffers: TeamRecruitmentOffer[];
  recruitmentCampaigns: TeamRecruitmentCampaign[];
  setRecruitmentOffers: React.Dispatch<React.SetStateAction<TeamRecruitmentOffer[]>>;
  setRecruitmentCampaigns: React.Dispatch<React.SetStateAction<TeamRecruitmentCampaign[]>>;
  onApproveMembership?: (membership: TeamMembership) => Promise<void>;
  onDenyMembership?: (membership: TeamMembership) => Promise<void>;
  canEdit?: boolean;
}

const generateId = () => `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const emptyCriteria = (): TeamRecruitmentCriteria => ({
  minAge: 17,
  maxAge: 35,
  riderSegments: [],
  disciplines: [],
  notes: '',
});

const CriteriaEditor: React.FC<{
  value: TeamRecruitmentCriteria;
  onChange: (next: TeamRecruitmentCriteria) => void;
}> = ({ value, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-1">Âge min</label>
      <input
        type="number"
        min={15}
        max={50}
        value={value.minAge ?? ''}
        onChange={(e) => onChange({ ...value, minAge: Number(e.target.value) || undefined })}
        className="input-field-sm w-full"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-1">Âge max</label>
      <input
        type="number"
        min={15}
        max={50}
        value={value.maxAge ?? ''}
        onChange={(e) => onChange({ ...value, maxAge: Number(e.target.value) || undefined })}
        className="input-field-sm w-full"
      />
    </div>
    <div className="md:col-span-2">
      <label className="block text-xs font-medium text-slate-300 mb-1">Segments coureur</label>
      <div className="flex flex-wrap gap-2">
        {RIDER_SEGMENT_FILTER_OPTIONS.map((opt) => {
          const selected = value.riderSegments?.includes(opt.id) ?? false;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                const current = value.riderSegments ?? [];
                onChange({
                  ...value,
                  riderSegments: selected
                    ? current.filter((s) => s !== opt.id)
                    : [...current, opt.id],
                });
              }}
              className={`px-2 py-1 rounded text-xs border ${
                selected
                  ? 'bg-emerald-900/40 border-emerald-500 text-emerald-200'
                  : 'border-slate-600 text-slate-400'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
    <div className="md:col-span-2">
      <label className="block text-xs font-medium text-slate-300 mb-1">Cible marché (optionnel)</label>
      <select
        value={value.recruitmentTarget ?? 'auto'}
        onChange={(e) =>
          onChange({ ...value, recruitmentTarget: e.target.value as TeamRecruitmentTarget })
        }
        className="input-field-sm w-full"
      >
        {RECRUITMENT_TARGET_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
    <div className="md:col-span-2">
      <label className="block text-xs font-medium text-slate-300 mb-1">Notes internes</label>
      <textarea
        value={value.notes ?? ''}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        rows={2}
        className="input-field-sm w-full"
        placeholder="Ex. profil grimpeur, disponible pour transfert mi-saison…"
      />
    </div>
  </div>
);

const TeamRecruitmentPanel: React.FC<TeamRecruitmentPanelProps> = ({
  teamId,
  teamName,
  users,
  teamMemberships,
  recruitmentOffers,
  recruitmentCampaigns,
  setRecruitmentOffers,
  setRecruitmentCampaigns,
  onApproveMembership,
  onDenyMembership,
  canEdit = true,
}) => {
  const [tab, setTab] = useState<RecruitmentTab>('applications');
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({ title: '', description: '' });
  const [offerCriteria, setOfferCriteria] = useState<TeamRecruitmentCriteria>(emptyCriteria());
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '' });
  const [campaignCriteria, setCampaignCriteria] = useState<TeamRecruitmentCriteria>(emptyCriteria());
  const [useCampaignCriteria, setUseCampaignCriteria] = useState(true);

  const spontaneousApplications = useMemo(
    () =>
      teamMemberships
        .filter(
          (m) =>
            m.teamId === teamId &&
            m.status === TeamMembershipStatus.PENDING &&
            (m.userRole === UserRole.COUREUR || m.requestedUserRole === UserRole.COUREUR) &&
            m.source !== 'email_invite',
        )
        .sort((a, b) => (b.requestedAt ?? '').localeCompare(a.requestedAt ?? '')),
    [teamMemberships, teamId],
  );

  const teamOffers = useMemo(
    () => recruitmentOffers.filter((o) => o.teamId === teamId || !o.teamId),
    [recruitmentOffers, teamId],
  );

  const teamCampaigns = useMemo(
    () => recruitmentCampaigns.filter((c) => c.teamId === teamId || !c.teamId),
    [recruitmentCampaigns, teamId],
  );

  const resolveUser = (membership: TeamMembership): User | undefined =>
    users.find((u) => u.id === membership.userId) ??
    users.find((u) => u.email?.toLowerCase() === membership.email?.toLowerCase());

  const publishOffer = (publish: boolean) => {
    if (!offerForm.title.trim()) return;
    const now = new Date().toISOString();
    const offer: TeamRecruitmentOffer = {
      id: generateId(),
      teamId,
      title: offerForm.title.trim(),
      description: offerForm.description.trim(),
      status: publish ? TeamRecruitmentOfferStatus.OPEN : TeamRecruitmentOfferStatus.CLOSED,
      criteria: useCampaignCriteria ? offerCriteria : undefined,
      createdAt: now,
      publishedAt: publish ? now : undefined,
    };
    setRecruitmentOffers((prev) => [...prev, offer]);
    setOfferModalOpen(false);
    setOfferForm({ title: '', description: '' });
    setOfferCriteria(emptyCriteria());
  };

  const toggleOfferStatus = (offer: TeamRecruitmentOffer) => {
    const next =
      offer.status === TeamRecruitmentOfferStatus.OPEN
        ? TeamRecruitmentOfferStatus.CLOSED
        : TeamRecruitmentOfferStatus.OPEN;
    setRecruitmentOffers((prev) =>
      prev.map((o) =>
        o.id === offer.id
          ? {
              ...o,
              status: next,
              publishedAt: next === TeamRecruitmentOfferStatus.OPEN ? new Date().toISOString() : o.publishedAt,
              updatedAt: new Date().toISOString(),
            }
          : o,
      ),
    );
  };

  const openCampaign = () => {
    if (!campaignForm.title.trim()) return;
    const now = new Date().toISOString();
    const offerId = generateId();
    const offer: TeamRecruitmentOffer = {
      id: offerId,
      teamId,
      title: campaignForm.title.trim(),
      description: campaignForm.description.trim() || `Campagne de recrutement — ${teamName}`,
      status: TeamRecruitmentOfferStatus.OPEN,
      criteria: useCampaignCriteria ? campaignCriteria : undefined,
      createdAt: now,
      publishedAt: now,
    };
    const campaign: TeamRecruitmentCampaign = {
      id: generateId(),
      teamId,
      title: campaignForm.title.trim(),
      description: campaignForm.description.trim(),
      status: TeamRecruitmentCampaignStatus.OPEN,
      criteria: useCampaignCriteria ? campaignCriteria : undefined,
      linkedOfferId: offerId,
      createdAt: now,
      openedAt: now,
    };
    setRecruitmentOffers((prev) => [...prev, { ...offer, campaignId: campaign.id }]);
    setRecruitmentCampaigns((prev) => [...prev, campaign]);
    setCampaignModalOpen(false);
    setCampaignForm({ title: '', description: '' });
    setCampaignCriteria(emptyCriteria());
  };

  const closeCampaign = (campaign: TeamRecruitmentCampaign) => {
    const now = new Date().toISOString();
    setRecruitmentCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaign.id
          ? { ...c, status: TeamRecruitmentCampaignStatus.CLOSED, closedAt: now, updatedAt: now }
          : c,
      ),
    );
    if (campaign.linkedOfferId) {
      setRecruitmentOffers((prev) =>
        prev.map((o) =>
          o.id === campaign.linkedOfferId
            ? { ...o, status: TeamRecruitmentOfferStatus.CLOSED, updatedAt: now }
            : o,
        ),
      );
    }
  };

  const tabBtn = (id: RecruitmentTab, label: string, count?: number) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
        tab === id
          ? 'border-blue-500 text-blue-300 bg-slate-800'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
      {count != null && count > 0 && (
        <span className="ml-1.5 text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-600 bg-slate-900/40 p-3 text-sm text-slate-300">
        Gérez les <strong className="text-slate-100">candidatures spontanées</strong>, publiez des{' '}
        <strong className="text-slate-100">offres</strong> visibles sur le portail coureur et lancez des{' '}
        <strong className="text-slate-100">campagnes</strong> avec critères de recherche.
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-slate-600">
        {tabBtn('applications', 'Candidatures spontanées', spontaneousApplications.length)}
        {tabBtn('offers', 'Offres')}
        {tabBtn('campaigns', 'Campagnes')}
      </nav>

      {tab === 'applications' && (
        <div className="space-y-3">
          {spontaneousApplications.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              Aucune candidature spontanée en attente.
            </p>
          ) : (
            spontaneousApplications.map((membership) => {
              const user = resolveUser(membership);
              const segment = user ? resolveRiderMarketSegmentFromUser(user) : null;
              const matchesOpenCampaigns = teamCampaigns
                .filter((c) => c.status === TeamRecruitmentCampaignStatus.OPEN)
                .some((c) => user && riderMatchesRecruitmentCriteria(user, c.criteria));
              return (
                <div
                  key={membership.id}
                  className="rounded-lg border border-slate-600 bg-slate-800/80 p-4 flex flex-wrap gap-4 justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100">
                      {membership.firstName && membership.lastName
                        ? `${membership.firstName} ${membership.lastName}`
                        : user
                          ? `${user.firstName} ${user.lastName}`
                          : membership.email}
                    </p>
                    <p className="text-xs text-slate-400">{membership.email}</p>
                    {segment && (
                      <p className="text-xs text-emerald-300 mt-1">
                        Profil : {RIDER_SEGMENT_LABELS[segment]}
                      </p>
                    )}
                    {matchesOpenCampaigns && (
                      <p className="text-xs text-blue-300 mt-1">Correspond à une campagne active</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Reçue le{' '}
                      {membership.requestedAt
                        ? new Date(membership.requestedAt).toLocaleDateString('fr-FR')
                        : '—'}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {onDenyMembership && (
                      <ActionButton variant="secondary" size="sm" onClick={() => onDenyMembership(membership)}>
                        Refuser
                      </ActionButton>
                    )}
                    {onApproveMembership && (
                      <ActionButton size="sm" onClick={() => onApproveMembership(membership)}>
                        Accepter
                      </ActionButton>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div className="space-y-3">
          {canEdit && (
            <ActionButton onClick={() => setOfferModalOpen(true)}>Publier une offre</ActionButton>
          )}
          {teamOffers.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Aucune offre publiée.</p>
          ) : (
            teamOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-lg border border-slate-600 bg-slate-800/80 p-4 space-y-2"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">{offer.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{offer.description}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded h-fit ${
                      offer.status === TeamRecruitmentOfferStatus.OPEN
                        ? 'bg-emerald-900/40 text-emerald-300'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {offer.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {formatRecruitmentCriteriaSummary(offer.criteria)}
                </p>
                {canEdit && (
                  <ActionButton variant="secondary" size="sm" onClick={() => toggleOfferStatus(offer)}>
                    {offer.status === TeamRecruitmentOfferStatus.OPEN ? 'Fermer l’offre' : 'Rouvrir l’offre'}
                  </ActionButton>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-3">
          {canEdit && (
            <ActionButton onClick={() => setCampaignModalOpen(true)}>Ouvrir une campagne</ActionButton>
          )}
          {teamCampaigns.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Aucune campagne de recrutement.</p>
          ) : (
            teamCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-lg border border-slate-600 bg-slate-800/80 p-4 space-y-2"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">{campaign.title}</p>
                    {campaign.description && (
                      <p className="text-xs text-slate-400 mt-1">{campaign.description}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded h-fit ${
                      campaign.status === TeamRecruitmentCampaignStatus.OPEN
                        ? 'bg-blue-900/40 text-blue-300'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {formatRecruitmentCriteriaSummary(campaign.criteria)}
                </p>
                {canEdit && campaign.status === TeamRecruitmentCampaignStatus.OPEN && (
                  <ActionButton variant="secondary" size="sm" onClick={() => closeCampaign(campaign)}>
                    Clôturer la campagne
                  </ActionButton>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <Modal isOpen={offerModalOpen} onClose={() => setOfferModalOpen(false)} title="Nouvelle offre coureur">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              value={offerForm.title}
              onChange={(e) => setOfferForm((f) => ({ ...f, title: e.target.value }))}
              className="input-field-sm w-full"
              placeholder="Ex. Renfort grimpeur — saison 2027"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={offerForm.description}
              onChange={(e) => setOfferForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="input-field-sm w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={useCampaignCriteria}
              onChange={(e) => setUseCampaignCriteria(e.target.checked)}
            />
            Définir des critères de recherche
          </label>
          {useCampaignCriteria && (
            <CriteriaEditor value={offerCriteria} onChange={setOfferCriteria} />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <ActionButton variant="secondary" onClick={() => publishOffer(false)}>
              Brouillon
            </ActionButton>
            <ActionButton onClick={() => publishOffer(true)}>Publier</ActionButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        title="Nouvelle campagne de recrutement"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la campagne</label>
            <input
              value={campaignForm.title}
              onChange={(e) => setCampaignForm((f) => ({ ...f, title: e.target.value }))}
              className="input-field-sm w-full"
              placeholder="Ex. Recrutement espoirs Bretagne 2027"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objectif</label>
            <textarea
              value={campaignForm.description}
              onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="input-field-sm w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={useCampaignCriteria}
              onChange={(e) => setUseCampaignCriteria(e.target.checked)}
            />
            Critères de recherche (âge, segment, discipline…)
          </label>
          {useCampaignCriteria && (
            <CriteriaEditor value={campaignCriteria} onChange={setCampaignCriteria} />
          )}
          <p className="text-xs text-gray-500">
            Une offre liée sera publiée automatiquement sur le portail coureur.
          </p>
          <div className="flex justify-end pt-2">
            <ActionButton onClick={openCampaign}>Lancer la campagne</ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamRecruitmentPanel;
