import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { FaQuestionCircle, FaEnvelope, FaPhone, FaExclamationTriangle, FaInfoCircle, FaMapMarkedAlt, FaRoute, FaBell, FaShieldAlt } from 'react-icons/fa';

const residentFaqs = [
  {
    question: 'How do I plan a safe route?',
    answer: 'Open the Route Planner, set your start and destination, then follow the recommended path avoiding hazards.'
  },
  {
    question: 'Where can I find nearby shelters?',
    answer: 'Go to the Shelters page to see available evacuation centers, capacity, and contact details.'
  },
  {
    question: 'How do I report an incident?',
    answer: 'Use the Report Incident page to submit hazards like floods, fires, or blocked roads with a description and location.'
  },
  {
    question: 'How do I see public announcements?',
    answer: 'Visit the Announcements page to read official alerts and updates from admins and barangay.'
  },
];

const ResidentHelp = () => {
  return (
    <>
      <PageMeta
        title="Help & Guide | E-LIGTASMO"
        description="Guides, FAQs, and support for residents using E-LIGTASMO"
      />

      <div className="w-full">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FaQuestionCircle className="text-blue-600 text-lg" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Help & Guide</h1>
              <p className="text-sm text-gray-600">How to use E-LIGTASMO safely and effectively</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <FaInfoCircle className="text-blue-600 text-sm" />
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link to="/route-planner" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <FaRoute className="text-blue-600" />
              <div>
                <div className="font-semibold text-sm text-gray-900">Plan Safe Route</div>
                <div className="text-xs text-gray-600">Find the safest path</div>
              </div>
            </Link>
            <Link to="/shelters" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
              <FaShieldAlt className="text-green-600" />
              <div>
                <div className="font-semibold text-sm text-gray-900">Find Shelters</div>
                <div className="text-xs text-gray-600">View nearby centers</div>
              </div>
            </Link>
            <Link to="/announcements" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
              <FaBell className="text-yellow-600" />
              <div>
                <div className="font-semibold text-sm text-gray-900">Announcements</div>
                <div className="text-xs text-gray-600">Read official alerts</div>
              </div>
            </Link>
            <Link to="/safe-routes" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
              <FaRoute className="text-indigo-600" />
              <div>
                <div className="font-semibold text-sm text-gray-900">Route Planner</div>
                <div className="text-xs text-gray-600">Plan safe paths with hazards</div>
              </div>
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <FaQuestionCircle className="text-blue-600 text-sm" />
            <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {residentFaqs.map((faq, idx) => (
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
};

export default ResidentHelp;
