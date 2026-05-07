import React from 'react';
import PageMeta from "../components/common/PageMeta";
import { FiHelpCircle, FiMail, FiPhone, FiAlertTriangle, FiBook, FiChevronRight, FiShield, FiActivity, FiArrowRight } from 'react-icons/fi';

const faqs = [
  {
    question: 'How do I report an incident?',
    answer: 'Navigate to the Incident Reporting section, fill out the form with the hazard location and details, and submit for review.'
  },
  {
    question: 'How do I add or edit a shelter?',
    answer: 'Authorized coordinators and admins can manage shelters via the Shelter Management console. Residents can view active shelters.'
  },
  {
    question: 'How do I export data?',
    answer: 'Look for the Export CSV or Excel button on admin tables. This will download a report of the currently viewed data.'
  },
  {
    question: 'Who do I contact for technical support?',
    answer: 'Please use the email or phone numbers listed below for any technical or operational support requests.'
  },
];

const HelpSupport: React.FC = () => (
  <>
    <PageMeta
      title="Help & Support | E-LigtasMo"
      description="Find answers to common questions and contact support."
    />
    
    <div className="tactical-page">
      <div className="tactical-container">
        
        {/* Header */}
        <div className="tactical-header">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <div className="tactical-status-pill mb-4">
                <div className="tactical-status-dot bg-emerald-500 animate-pulse" />
                <span>SUPPORT_PORTAL: LIVE</span>
              </div>
              <h1 className="tactical-title">Help & Support</h1>
              <p className="tactical-subtitle">System documentation, operator training, and emergency response protocols.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* FAQ Area */}
          <div className="lg:col-span-2 space-y-10">
            <div className="flex items-center gap-3">
              <div className="tactical-icon-container w-8 h-8 bg-blue-50 text-blue-600 border-blue-100">
                 <FiBook size={16} />
              </div>
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Frequently_Asked_Questions</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {faqs.map((faq, idx) => (
                <div key={idx} className="tactical-card group">
                  <div className="tactical-card-body">
                    <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-4">
                      <span className="text-[10px] font-black text-blue-500/30 uppercase tracking-widest leading-none">0{idx+1}_IDENT</span>
                      {faq.question}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed ml-14 font-medium">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-10">
            <div className="flex items-center gap-3">
               <div className="tactical-icon-container w-8 h-8 bg-blue-50 text-blue-600 border-blue-100">
                 <FiPhone size={16} />
              </div>
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Contact_Channels</h2>
            </div>

            <div className="space-y-4">
               <div className="tactical-card group">
                  <div className="tactical-card-body flex items-center gap-5">
                    <div className="tactical-icon-container group-hover:bg-blue-600 group-hover:text-white transition-all"><FiMail size={18} /></div>
                    <div>
                       <span className="tactical-label mb-0">Email_Support</span>
                       <span className="text-sm font-bold text-slate-900 lowercase">support@eligtasmo.com</span>
                    </div>
                  </div>
               </div>

               <div className="tactical-card group">
                  <div className="tactical-card-body flex items-center gap-5">
                    <div className="tactical-icon-container group-hover:bg-emerald-600 group-hover:text-white transition-all"><FiPhone size={18} /></div>
                    <div>
                       <span className="tactical-label mb-0">Phone_Support</span>
                       <span className="text-sm font-bold text-slate-900 tabular-nums">(02) 1234-5678</span>
                    </div>
                  </div>
               </div>

               <div className="bg-rose-600 p-8 rounded-3xl border border-rose-700 flex items-center gap-6 shadow-xl shadow-rose-600/20 group hover:scale-[1.02] transition-all">
                  <div className="w-14 h-14 bg-white text-rose-600 rounded-2xl flex items-center justify-center shadow-lg"><FiAlertTriangle size={24} /></div>
                  <div>
                     <span className="text-[10px] font-black text-rose-100 uppercase tracking-widest block mb-1 opacity-70">Emergency_Priority_Hotline</span>
                     <span className="text-3xl font-black text-white tracking-tighter">911</span>
                  </div>
               </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-3xl relative overflow-hidden text-white shadow-2xl">
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6 text-blue-400">
                     <FiShield size={18} />
                     <span className="text-[9px] font-black uppercase tracking-[0.2em]">Secure_Support_Protocol</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed mb-8 uppercase tracking-wide opacity-80">Our support team is available 24/7 for urgent technical assistance and disaster response coordination.</p>
                  <button className="tactical-button-ghost w-full bg-white/5 border-white/10 text-white hover:bg-white hover:text-slate-900 transition-all uppercase tracking-widest text-[10px]">
                     Check_System_Status <FiActivity size={14} />
                  </button>
               </div>
               <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-12 flex justify-between items-center border-t border-slate-200">
           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Support Portal Link Active • v4.2.0</span>
           <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} E-LigtasMo Emergency Platform</span>
        </div>
      </div>
    </div>
  </>
);

export default HelpSupport;