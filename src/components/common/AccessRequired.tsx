import { Link } from "react-router-dom";

const AccessRequired = () => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-white">
      <div className="max-w-md rounded-lg border border-gray-200 p-6 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">Sign in required</h1>
        <p className="mb-6 text-gray-600">
          This section is available to residents with an account. Please sign in to continue.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/signin"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Go to Sign In
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Barangay Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessRequired;
