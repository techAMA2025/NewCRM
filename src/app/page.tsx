import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Hero Section */}
      <div className="relative h-screen flex flex-col items-center justify-center px-6 sm:px-20">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-gray-900/20 z-0"></div>
        
        {/* Content */}
        <div className="z-10 flex flex-col items-center max-w-3xl text-center">
          {/* <div className="mb-6">
            <Image
              src="/next.svg"
              alt="AMA CRM"
              width={180}
              height={38}
              className="dark:invert"
              priority
            />
          </div> */}
          
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            AMA Workspace
          </h1>
          
          <p className="text-xl mb-8 text-gray-300">
            Streamline your client management, case tracking, and legal workflow in one powerful platform
          </p>
          
          <div className="flex gap-6 mb-12">
            <Link 
              href="/login"
              className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg px-8 py-4 transition-all duration-300 shadow-lg hover:shadow-blue-500/30"
            >
              Login to Dashboard
            </Link>
            
            <Link 
              href="#features" 
              className="rounded-full border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-medium text-lg px-8 py-4 transition-all duration-300"
            >
              Explore Features
            </Link>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mt-6">
            <div className="flex flex-col items-center">
              <div className="text-blue-400 font-bold text-2xl mb-2">500+</div>
              <div className="text-gray-400">Active Users</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-purple-400 font-bold text-2xl mb-2">10k+</div>
              <div className="text-gray-400">Cases Managed</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-cyan-400 font-bold text-2xl mb-2">99%</div>
              <div className="text-gray-400">Client Satisfaction</div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
      
      {/* Features Section */}
      <div id="features" className="py-20 px-6 sm:px-20 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Powerful Features
            </span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Client Management",
                description: "Organize client information, documents, and communication history in one centralized location.",
                icon: "👥"
              },
              {
                title: "Case Tracking",
                description: "Monitor case progress, deadlines, and outcomes with our intuitive tracking system.",
                icon: "📋"
              },
              {
                title: "Document Automation",
                description: "Generate legal documents automatically using customizable templates.",
                icon: "📄"
              },
              {
                title: "Billing & Invoicing",
                description: "Streamline your financial processes with integrated billing and invoicing tools.",
                icon: "💰"
              },
              {
                title: "Calendar & Scheduling",
                description: "Manage appointments, court dates, and deadlines with seamless calendar integration.",
                icon: "📅"
              },
              {
                title: "Reporting & Analytics",
                description: "Gain insights into your firm's performance with comprehensive reporting.",
                icon: "📊"
              }
            ].map((feature, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-blue-300">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-20 px-6 sm:px-20 bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-gray-900/40">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to transform your legal practice?</h2>
          <p className="text-xl mb-10 text-gray-300">Join hundreds of legal professionals who trust AMA Legal Solutions CRM</p>
          
          <Link 
            href="/login"
            className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg px-8 py-4 transition-all duration-300 shadow-lg hover:shadow-blue-500/30"
          >
            Get Started Today
          </Link>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-10 px-6 sm:px-20 bg-[#121212] border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <Image
              src="/next.svg"
              alt="AMA CRM"
              width={120}
              height={25}
              className="dark:invert"
            />
          </div>
          
          <div className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} AMA Legal Solutions. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}