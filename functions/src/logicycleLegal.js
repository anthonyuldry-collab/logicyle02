/**
 * Identité légale éditeur côté Functions (env / secrets).
 * Ne jamais inventer SIRET — laisser vide = provisoire.
 */

function pick(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim() && !/À COMPLÉTER|A COMPLETER|COMPLETER/i.test(v)) {
      return v.trim();
    }
  }
  return '';
}

function getLogicycleLegalEntity() {
  const siren = pick(process.env.LOGICYCLE_SIREN, process.env.VITE_LEGAL_SIREN);
  const siret = pick(process.env.LOGICYCLE_SIRET, process.env.VITE_LEGAL_SIRET);
  const registeredOffice = pick(
    process.env.LOGICYCLE_REGISTERED_OFFICE,
    process.env.VITE_LEGAL_REGISTERED_OFFICE,
  );
  const vatNumber = pick(process.env.LOGICYCLE_VAT_NUMBER, process.env.VITE_LEGAL_VAT_NUMBER);
  const legalForm = pick(
    process.env.LOGICYCLE_LEGAL_FORM,
    process.env.VITE_LEGAL_FORM,
    'SASU Rovik',
  );

  return {
    tradeName: 'Rovik',
    legalForm,
    siren,
    siret,
    vatNumber,
    registeredOffice,
    contactEmail: process.env.LOGICYCLE_CONTACT_EMAIL || 'contact@logicycle.app',
    incomplete: !(siren && siret && registeredOffice),
  };
}

/** Bloque les checkouts live si identité incomplète (sauf override explicite). */
function assertLegalReadyForMissionPayments(stripeLivemode) {
  const entity = getLogicycleLegalEntity();
  const requireLegal =
    process.env.MISSION_PAYMENTS_REQUIRE_LEGAL === 'true' ||
    (stripeLivemode === true && process.env.MISSION_PAYMENTS_ALLOW_INCOMPLETE_LEGAL !== 'true');

  if (requireLegal && entity.incomplete) {
    const err = new Error(
      'Identité légale Rovik incomplète (LOGICYCLE_SIRET / SIREN / siège). Remplir post K-bis avant paiements live.',
    );
    err.code = 'legal_entity_incomplete';
    throw err;
  }
  return entity;
}

module.exports = {
  getLogicycleLegalEntity,
  assertLegalReadyForMissionPayments,
};
