import React from 'react';

const faqs = [
  {
    question: 'How do I report an incident?',
    answer: 'Go to the Safe Route Planner or Incident Reporting section, fill out the form, and submit your report. Your barangay or admin will review it.'
  },
  {
    question: 'How do I add or edit a shelter?',
    answer: 'Admins and authorized barangay users can use the Shelter Management page to add, edit, or remove shelters. Residents can view available shelters only.'
  },
  {
    question: 'How do I export data?',
    answer: 'Look for the Export CSV button on admin tables (Incidents, Users, Shelters, etc.). Click to download the data as a CSV file.'
  },
  {
    question: 'Who do I contact for technical support?',
    answer: 'Please use the contact information below for technical or urgent support.'
  },
];

const HelpSupport: React.FC = () => (
  <div className="max-w-2xl mx-auto py-8 px-4">
    <h1 className="text-2xl font-bold mb-4 text-blue-700">Help & Support</h1>
    <p className="mb-6 text-gray-700">Find answers to common questions or contact us for further assistance.</p>
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-4">
            <div className="font-semibold text-gray-900 mb-1">{faq.question}</div>
            <div className="text-gray-700 text-sm">{faq.answer}</div>
          </div>
        ))}
      </div>
    </div>
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Contact Information</h2>
      <div className="bg-white rounded-lg shadow p-4 text-gray-700 text-sm space-y-2">
        <div><span className="font-semibold">Email:</span> support@eligtasmo.com</div>
        <div><span className="font-semibold">Phone:</span> (02) 1234-5678</div>
        <div><span className="font-semibold">Emergency Hotline:</span> 911</div>
      </div>
    </div>
    <div className="text-xs text-gray-400">E-LIGTASMO &copy; {new Date().getFullYear()} | For urgent help, contact your barangay or admin.</div>
  </div>
);

export default HelpSupport; 