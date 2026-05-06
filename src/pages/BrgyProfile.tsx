import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import BrgyMetaCard from "../components/UserProfile/BrgyMetaCard";
import BrgyInfoCard from "../components/UserProfile/BrgyInfoCard";

export default function BrgyProfile() {
  return (
    <>
      <PageMeta
        title="Barangay Profile | E-LIGTASMO"
        description="Manage your brgy profile information and settings"
      />
      
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Barangay Profile
            </h1>
            <p className="text-sm text-gray-600">
              Manage your brgy information and account settings
            </p>
          </div>
        </div>

        {/* Profile Cards */}
        <div className="space-y-4">
          <BrgyMetaCard />
          <BrgyInfoCard />
        </div>
      </div>
    </>
  );
}