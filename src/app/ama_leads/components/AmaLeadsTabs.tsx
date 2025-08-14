"use client";

interface AmaLeadsTabsProps {
  activeTab: "all" | "callback";
  onTabChange: (tab: "all" | "callback") => void;
  callbackCount: number;
  allLeadsCount: number;
}

const AmaLeadsTabs = ({ activeTab, onTabChange, callbackCount, allLeadsCount }: AmaLeadsTabsProps) => {
  return (
    <div className="mb-6">
      <div className="border-b border-[#5A4C33]/20 bg-[#ffffff] rounded-t-lg shadow-sm">
        <nav className="-mb-px flex space-x-8 px-6">
          {/* All Leads Tab */}
          <button
            onClick={() => onTabChange("all")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === "all"
                ? "border-[#D2A02A] text-[#D2A02A]"
                : "border-transparent text-[#5A4C33]/70 hover:text-[#5A4C33] hover:border-[#5A4C33]/30"
            }`}
          >
            All Leads
            <span
              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === "all"
                  ? "bg-[#D2A02A]/10 text-[#D2A02A]"
                  : "bg-[#5A4C33]/10 text-[#5A4C33]/70"
              }`}
            >
              {allLeadsCount}
            </span>
          </button>

          {/* Callback Tab */}
          <button
            onClick={() => onTabChange("callback")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === "callback"
                ? "border-[#D2A02A] text-[#D2A02A]"
                : "border-transparent text-[#5A4C33]/70 hover:text-[#5A4C33] hover:border-[#5A4C33]/30"
            }`}
          >
            Callbacks
            <span
              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === "callback"
                  ? "bg-[#D2A02A]/10 text-[#D2A02A]"
                  : "bg-[#5A4C33]/10 text-[#5A4C33]/70"
              }`}
            >
              {callbackCount}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default AmaLeadsTabs; 