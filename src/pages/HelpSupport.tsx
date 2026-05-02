import React from 'react';
import PageMeta from "../components/common/PageMeta";
import { FaQuestionCircle, FaEnvelope, FaPhone, FaExclamationTriangle } from 'react-icons/fa';

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
  <>
    <PageMeta
      title="Help & Support | E-LIGTASMO"
      description="Find answers to common questions and get support for E-LIGTASMO"
    />
    
    <div className="w-full">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 p-2 rounded-lg">
            <FaQuestionCircle className="text-blue-600 text-lg" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Help & Support
            </h1>
            <p className="text-sm text-gray-600">
              Find answers to common questions or contact us for assistance
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <FaQuestionCircle className="text-blue-600 text-sm" />
          <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg border border-gray-100 p-3 sm:p-4 hover:bg-gray-100 transition-colors">
              <div className="font-semibold text-gray-900 text-sm mb-2">{faq.question}</div>
              <div className="text-gray-700 text-xs leading-relaxed">{faq.answer}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <FaPhone className="text-green-600 text-sm" />
          <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
        </div>
        <div className="grid gap-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <FaEnvelope className="text-blue-600 text-sm" />
            <div>
              <span className="font-semibold text-sm text-gray-900">Email:</span>
              <span className="text-sm text-gray-700 ml-2">support@eligtasmo.com</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <FaPhone className="text-green-600 text-sm" />
            <div>
              <span className="font-semibold text-sm text-gray-900">Phone:</span>
              <span className="text-sm text-gray-700 ml-2">(02) 1234-5678</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <FaExclamationTriangle className="text-red-600 text-sm" />
            <div>
              <span className="font-semibold text-sm text-red-900">Emergency Hotline:</span>
              <span className="text-sm text-red-700 ml-2 font-bold">911</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <div className="text-xs text-gray-500">
          E-LIGTASMO &copy; {new Date().getFullYear()} | For urgent help, contact your barangay or admin.
        </div>
      </div>
    </div>
  </>
);

export default HelpSupport;