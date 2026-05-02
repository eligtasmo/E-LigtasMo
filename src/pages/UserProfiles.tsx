import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import ChangePasswordCard from "../components/UserProfile/ChangePasswordCard";
import PageMeta from "../components/common/PageMeta";

export default function UserProfiles() {
  return (
    <>
      <PageMeta
        title="User Profile | E-LIGTASMO"
        description="Manage your user profile information and settings"
      />
      
      <div className="w-full">
        <div className="w-full">
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
            <h1 className="text-2xl font-semibold text-gray-900">User Profile</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your personal information and account settings</p>
          </div>

          <div className="space-y-5">
            <UserMetaCard />
            <UserInfoCard />
            <UserAddressCard />
            <ChangePasswordCard />
          </div>
        </div>
      </div>
    </>
  );
}
