import React from 'react';
import { Rider } from '../../types';
import BikeFitPanel from '../bike/BikeFitPanel';

interface BikeSetupTabProps {
    formData: Rider | Omit<Rider, 'id'>;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    formFieldsEnabled: boolean;
    onSetupChange?: (bikeKey: 'roadBikeSetup' | 'ttBikeSetup', setup: Rider['roadBikeSetup']) => void;
}

const BikeSetupTab: React.FC<BikeSetupTabProps> = ({
    formData,
    formFieldsEnabled,
    onSetupChange,
}) => {
    const handleChange = (bikeKey: 'roadBikeSetup' | 'ttBikeSetup') => (setup: Rider['roadBikeSetup']) => {
        if (onSetupChange) {
            onSetupChange(bikeKey, setup);
        }
    };

    return (
        <div className="space-y-8">
            <BikeFitPanel
                bikeKey="roadBikeSetup"
                setup={formData.roadBikeSetup}
                onChange={handleChange('roadBikeSetup')}
                editable={formFieldsEnabled}
            />
            <BikeFitPanel
                bikeKey="ttBikeSetup"
                setup={formData.ttBikeSetup}
                onChange={handleChange('ttBikeSetup')}
                editable={formFieldsEnabled}
            />
        </div>
    );
};

export default BikeSetupTab;
