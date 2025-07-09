import { useState } from 'react';
import IncidentReportingView from '../components/saferoutes/IncidentReportingView';

const IncidentReportingWrapper = () => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  return (
    <IncidentReportingView
      showReceipt={showReceipt}
      setShowReceipt={setShowReceipt}
      referenceId={referenceId}
      setReferenceId={setReferenceId}
    />
  );
};

export default IncidentReportingWrapper; 