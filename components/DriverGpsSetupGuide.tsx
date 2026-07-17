import React from 'react';
import { DriverGpsSetupStatus } from '../utils/driverGpsSetupUtils';
import { useTranslations } from '../hooks/useTranslations';

interface DriverGpsSetupGuideProps {
  status: DriverGpsSetupStatus;
  mode?: 'manager' | 'driver';
  compact?: boolean;
}

const DriverGpsSetupGuide: React.FC<DriverGpsSetupGuideProps> = ({
  status,
  mode = 'manager',
  compact = false,
}) => {
  const { t } = useTranslations();

  const steps = [
    {
      id: 'assign',
      done: status.assignDriver,
      title: t('driverGpsStep1Title'),
      desc: t('driverGpsStep1Desc'),
    },
    {
      id: 'source',
      done: status.gpsSource,
      title: t('driverGpsStep2Title'),
      desc: t('driverGpsStep2Desc'),
    },
    {
      id: 'share',
      done: status.driverSharing,
      title: t('driverGpsStep3Title'),
      desc: mode === 'driver' ? t('driverGpsStep3DescDriver') : t('driverGpsStep3DescManager'),
    },
  ];

  const allDone = steps.every((s) => s.done);

  return (
    <div className={`rounded-lg border ${allDone ? 'border-emerald-200 bg-emerald-50/60' : 'border-blue-200 bg-blue-50/50'} ${compact ? 'p-3' : 'p-4'}`}>
      <h4 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
        {t('driverGpsSetupTitle')}
      </h4>
      {(status.vehicleName || status.driverName) && (
        <p className="text-xs text-gray-600 mt-1">
          {[status.vehicleName, status.driverName].filter(Boolean).join(' · ')}
        </p>
      )}
      <ol className={`mt-3 space-y-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                step.done ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-300 text-gray-500'
              }`}
            >
              {step.done ? '✓' : index + 1}
            </span>
            <div>
              <p className={`font-medium ${step.done ? 'text-emerald-900' : 'text-gray-900'}`}>{step.title}</p>
              <p className="text-gray-600 mt-0.5">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default DriverGpsSetupGuide;
