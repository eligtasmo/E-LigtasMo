import { useState } from 'react';
import IncidentReportingWrapper from '../IncidentReportingWrapper';

const ResidentReportIncident = () => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  return (
    <IncidentReportingWrapper
      showReceipt={showReceipt}
      setShowReceipt={setShowReceipt}
      referenceId={referenceId}
      setReferenceId={(id) => setReferenceId(id)}
    />
  );
};

export default ResidentReportIncident;
