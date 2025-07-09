import { useState } from 'react';
import IncidentReportingWrapper from '../IncidentReportingWrapper';
import AppHeader from '../../layout/AppHeader';

const ResidentReportIncident = () => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [referenceId, setReferenceId] = useState(null);
  return (
    <>
      <AppHeader isModalOpen={showReceipt} />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold mb-2 text-center">Report an Incident</h2>
          <div className="text-sm text-gray-600 mb-4 text-center">
            Please fill out the form below to report an incident in your area.<br />Fields marked with <span className="text-red-500">*</span> are required.
          </div>
          <IncidentReportingWrapper
            showReceipt={showReceipt}
            setShowReceipt={setShowReceipt}
            referenceId={referenceId}
            setReferenceId={setReferenceId}
          />
        </div>
      </div>
    </>
  );
};

export default ResidentReportIncident; 