import React, { useState } from 'react';
import Modal from './Modal';
import ActionButton from './ActionButton';
import { useTranslations } from '../hooks/useTranslations';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline
}) => {
  const { t, language } = useTranslations();
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadNDA, setHasReadNDA] = useState(false);

  const handleAccept = () => {
    if (hasReadTerms && hasReadNDA) {
      onAccept();
    } else {
      alert('Veuillez lire et accepter toutes les conditions avant de continuer.');
    }
  };

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conditions Générales & Accord de Non-Divulgation">
      <div className="max-h-96 overflow-y-auto space-y-6 text-sm">
        
        {/* Clause de Non-Divulgation */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-red-800 mb-3">🔒 ACCORD DE NON-DIVULGATION (NDA)</h3>
          <div className="text-red-700 space-y-3">
            <p><strong>Date d'effet :</strong> {currentDate}</p>
            <p><strong>Parties :</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Divulgateur :</strong> LogiCycle (Propriétaire de l'idée)</li>
              <li><strong>Destinataire :</strong> L'utilisateur inscrit</li>
            </ul>
            
            <div className="bg-white p-3 rounded border border-red-300">
              <p className="font-semibold mb-2">OBJET DE LA NON-DIVULGATION :</p>
              <p>L'utilisateur s'engage à ne pas divulguer, reproduire, distribuer ou utiliser à des fins commerciales :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Les concepts, fonctionnalités et innovations de la plateforme LogiCycle</li>
                <li>Les algorithmes de performance et d'analyse des données</li>
                <li>Les interfaces utilisateur et l'expérience utilisateur</li>
                <li>Toute information technique ou commerciale confidentielle</li>
                <li>Les données et métriques de performance des coureurs</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded border border-red-300">
              <p className="font-semibold mb-2">DURÉE DE L'ENGAGEMENT :</p>
              <p>Cet accord de non-divulgation est valable pendant <strong>5 ans</strong> à compter de la date d'inscription, même après la fin de l'utilisation de la plateforme.</p>
            </div>

            <div className="bg-white p-3 rounded border border-red-300">
              <p className="font-semibold mb-2">SANCTIONS :</p>
              <p>Toute violation de cet accord de non-divulgation pourra entraîner des poursuites judiciaires et des dommages et intérêts.</p>
            </div>
          </div>
        </div>

        {/* Conditions Générales */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-800 mb-3">📋 CONDITIONS GÉNÉRALES D'UTILISATION</h3>
          <div className="text-blue-700 space-y-3">
            
            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">1. PHASE DE TEST</h4>
              <p>Cette plateforme est actuellement en <strong>phase de test</strong>. L'utilisateur reconnaît que :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Il s'agit d'une version bêta en développement</li>
                <li>Des dysfonctionnements peuvent survenir</li>
                <li>Les fonctionnalités peuvent évoluer ou être modifiées</li>
                <li>La plateforme n'est pas encore optimisée pour la production</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">2. UTILISATION ACCEPTÉE</h4>
              <p>L'utilisateur s'engage à utiliser la plateforme uniquement pour :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>La gestion d'équipe cycliste</li>
                <li>Le suivi des performances des coureurs</li>
                <li>La planification d'événements sportifs</li>
                <li>La gestion administrative et logistique</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">3. INTERDICTIONS</h4>
              <p>Il est strictement interdit de :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Copier, reproduire ou distribuer le code source</li>
                <li>Réutiliser les concepts ou fonctionnalités à des fins commerciales</li>
                <li>Partager les informations confidentielles avec des tiers</li>
                <li>Tenter de contourner les mesures de sécurité</li>
                <li>Utiliser la plateforme pour des activités illégales</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">4. PROPRIÉTÉ INTELLECTUELLE</h4>
              <p>Tous les droits de propriété intellectuelle sur la plateforme LogiCycle appartiennent exclusivement à ses créateurs. L'utilisateur ne peut prétendre à aucun droit sur :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Le code source et l'architecture logicielle</li>
                <li>Les concepts et innovations</li>
                <li>Les interfaces et designs</li>
                <li>Les algorithmes et méthodes de calcul</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">5. RESPONSABILITÉS</h4>
              <p>En phase de test, LogiCycle ne peut être tenu responsable de :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>La perte de données</li>
                <li>Les dysfonctionnements techniques</li>
                <li>Les interruptions de service</li>
                <li>Les dommages indirects</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">6. DURÉE ET RÉSILIATION</h4>
              <p>L'accès à la plateforme peut être suspendu ou résilié à tout moment en cas de :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Violation des conditions générales</li>
                <li>Violation de l'accord de non-divulgation</li>
                <li>Utilisation abusive ou frauduleuse</li>
                <li>Fin de la phase de test</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Avertissement Final */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-orange-800 mb-3">⚠️ AVERTISSEMENT IMPORTANT</h3>
          <div className="text-orange-700">
            <p className="font-semibold mb-2">En vous inscrivant, vous reconnaissez avoir lu, compris et accepté :</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>L'accord de non-divulgation (NDA) ci-dessus</li>
              <li>Les conditions générales d'utilisation</li>
              <li>Votre engagement à respecter la confidentialité</li>
              <li>Votre responsabilité en cas de violation</li>
            </ul>
            <p className="mt-3 font-semibold">Toute violation de ces conditions pourra entraîner des poursuites judiciaires.</p>
          </div>
        </div>

        {/* Checkboxes de confirmation */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="readTerms"
              checked={hasReadTerms}
              onChange={(e) => setHasReadTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="readTerms" className="text-sm text-gray-700">
              <strong>J'ai lu et compris les conditions générales d'utilisation</strong>
            </label>
          </div>
          
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="readNDA"
              checked={hasReadNDA}
              onChange={(e) => setHasReadNDA(e.target.checked)}
              className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="readNDA" className="text-sm text-gray-700">
              <strong>J'ai lu et compris l'accord de non-divulgation (NDA) et je m'engage à le respecter</strong>
            </label>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
        <ActionButton onClick={onDecline} variant="danger">
          Refuser et Quitter
        </ActionButton>
        <ActionButton onClick={handleAccept} variant="primary" disabled={!hasReadTerms || !hasReadNDA}>
          J'Accepte et Continue
        </ActionButton>
      </div>
    </Modal>
  );
};
