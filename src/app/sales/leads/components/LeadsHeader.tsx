import { FaFilter, FaPlus, FaChevronDown, FaFileExport } from 'react-icons/fa';

type LeadsHeaderProps = {
  isLoading: boolean;
  userRole: string;
  currentUser: any;
  exportToCSV?: () => void;
};

const LeadsHeader = ({ isLoading, userRole, currentUser, exportToCSV }: LeadsHeaderProps) => {
  return (
    <div className="bg-gray-900 px-6 py-4 rounded-xl border border-gray-700 shadow-lg mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Here are all the leads</h1>

        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          {userRole === 'admin' && (
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaFileExport className="mr-2 h-4 w-4" />
              Export CSV
            </button>
          )}
          {/* <div className="relative">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaPlus className="mr-2 h-4 w-4" />
              New Lead
              <FaChevronDown className="ml-2 h-3 w-3" />
            </button>
          </div> */}
        </div>
      </div>
      {isLoading && (
        <div className="mt-4 text-center text-gray-400">
          <div className="animate-pulse">Loading leads...</div>
        </div>
      )}
      {!isLoading && currentUser && (
        <div className="mt-4 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
          <div className="flex items-center text-xs text-gray-400">
            <div className="font-medium">
              <span className="text-gray-300">Logged in as:</span>{' '}
              <span className="text-blue-400">{currentUser.name || currentUser.email}</span>
            </div>
            <span className="mx-2">|</span>
            <div>
              <span className="font-medium text-gray-300">Role:</span>{' '}
              <span className={userRole === 'admin' ? 'text-green-400' : 'text-yellow-400'}>
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsHeader; 